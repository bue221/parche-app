package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type querier interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

// PG is the Postgres Store. InTx uses SELECT ... FOR UPDATE on refresh rotation.
type PG struct {
	pool      *pgxpool.Pool
	q         querier
	forUpdate bool
}

// NewPG wraps a pool. pool must be non-nil.
func NewPG(pool *pgxpool.Pool) *PG {
	return &PG{pool: pool, q: pool}
}

func (s *PG) InTx(ctx context.Context, fn func(Store) error) error {
	if s.pool == nil {
		return fmt.Errorf("postgres pool is nil")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin auth tx: %w", err)
	}
	inner := &PG{pool: s.pool, q: tx, forUpdate: true}
	if err := fn(inner); err != nil {
		_ = tx.Rollback(ctx)
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit auth tx: %w", err)
	}
	return nil
}

func (s *PG) CreateAccount(ctx context.Context, acc Account) error {
	run := func(st Store) error {
		pg, ok := st.(*PG)
		if !ok {
			return fmt.Errorf("auth store type")
		}
		_, err := pg.q.Exec(ctx, `
			INSERT INTO users (id, email, password_hash, display_name, status, created_at)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			acc.User.ID, acc.User.Email, acc.User.PasswordHash, acc.User.DisplayName, acc.User.Status, acc.User.CreatedAt)
		if err != nil {
			return mapUniqueEmail(err)
		}
		for _, p := range acc.Profiles {
			if _, err := pg.q.Exec(ctx, `
				INSERT INTO user_profiles (user_id, profile) VALUES ($1, $2)`, acc.User.ID, p); err != nil {
				return err
			}
		}
		if acc.Tenant == nil {
			return nil
		}
		t := acc.Tenant
		if _, err := pg.q.Exec(ctx, `
			INSERT INTO tenants (id, slug, name, currency, status)
			VALUES ($1, $2, $3, $4, $5)`, t.ID, t.Slug, t.Name, t.Currency, t.Status); err != nil {
			return err
		}
		role := acc.Role
		if role == "" {
			role = TenantOwner
		}
		_, err = pg.q.Exec(ctx, `
			INSERT INTO tenant_members (tenant_id, user_id, role) VALUES ($1, $2, $3)`,
			t.ID, acc.User.ID, role)
		return err
	}
	if s.forUpdate {
		return run(s)
	}
	return s.InTx(ctx, run)
}

func (s *PG) UserByEmail(ctx context.Context, email string) (User, error) {
	return s.scanUser(ctx, `SELECT id, email, password_hash, display_name, status, created_at FROM users WHERE email = $1`, email)
}

func (s *PG) UserByID(ctx context.Context, id string) (User, error) {
	return s.scanUser(ctx, `SELECT id, email, password_hash, display_name, status, created_at FROM users WHERE id = $1`, id)
}

func (s *PG) scanUser(ctx context.Context, q string, arg any) (User, error) {
	var u User
	err := s.q.QueryRow(ctx, q, arg).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.DisplayName, &u.Status, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	if err != nil {
		return User{}, err
	}
	return u, nil
}

func (s *PG) Profiles(ctx context.Context, userID string) ([]string, error) {
	rows, err := s.q.Query(ctx, `SELECT profile FROM user_profiles WHERE user_id = $1 ORDER BY profile`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *PG) TenantForUser(ctx context.Context, userID string) (*TenantView, error) {
	var v TenantView
	err := s.q.QueryRow(ctx, `
		SELECT t.id, t.name, m.role
		FROM tenant_members m
		JOIN tenants t ON t.id = m.tenant_id
		WHERE m.user_id = $1
		ORDER BY m.created_at
		LIMIT 1`, userID).Scan(&v.ID, &v.Name, &v.Role)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (s *PG) InsertRefresh(ctx context.Context, row RefreshRow) error {
	_, err := s.q.Exec(ctx, `
		INSERT INTO refresh_tokens (id, user_id, family_id, token_hash, expires_at, revoked_at, replaced_by, user_agent, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		row.ID, row.UserID, row.FamilyID, row.TokenHash, row.ExpiresAt, row.RevokedAt, row.ReplacedBy, row.UserAgent, row.CreatedAt)
	return err
}

func (s *PG) RefreshByHash(ctx context.Context, hash string) (RefreshRow, error) {
	q := `
		SELECT id, user_id, family_id, token_hash, expires_at, revoked_at, replaced_by, user_agent, created_at
		FROM refresh_tokens WHERE token_hash = $1`
	if s.forUpdate {
		q += ` FOR UPDATE`
	}
	var row RefreshRow
	err := s.q.QueryRow(ctx, q, hash).Scan(
		&row.ID, &row.UserID, &row.FamilyID, &row.TokenHash, &row.ExpiresAt, &row.RevokedAt, &row.ReplacedBy, &row.UserAgent, &row.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return RefreshRow{}, ErrNotFound
	}
	if err != nil {
		return RefreshRow{}, err
	}
	return row, nil
}

func (s *PG) MarkReplaced(ctx context.Context, id, newID string, at time.Time) error {
	_, err := s.q.Exec(ctx, `
		UPDATE refresh_tokens SET revoked_at = $2, replaced_by = $3 WHERE id = $1`, id, at, newID)
	return err
}

func (s *PG) RevokeFamily(ctx context.Context, familyID string, at time.Time) error {
	_, err := s.q.Exec(ctx, `
		UPDATE refresh_tokens SET revoked_at = $2 WHERE family_id = $1 AND revoked_at IS NULL`, familyID, at)
	return err
}

func (s *PG) RevokeUser(ctx context.Context, userID string, at time.Time) error {
	_, err := s.q.Exec(ctx, `
		UPDATE refresh_tokens SET revoked_at = $2 WHERE user_id = $1 AND revoked_at IS NULL`, userID, at)
	return err
}

func (s *PG) ListSessions(ctx context.Context, userID string, now time.Time) ([]SessionView, error) {
	rows, err := s.q.Query(ctx, `
		SELECT family_id,
			MIN(created_at) AS created_at,
			(ARRAY_AGG(user_agent ORDER BY created_at DESC) FILTER (WHERE revoked_at IS NULL AND expires_at > $2))[1] AS user_agent
		FROM refresh_tokens
		WHERE user_id = $1
		GROUP BY family_id
		HAVING BOOL_OR(revoked_at IS NULL AND expires_at > $2)
		ORDER BY MIN(created_at)`, userID, now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []SessionView
	for rows.Next() {
		var v SessionView
		var ua *string
		if err := rows.Scan(&v.ID, &v.CreatedAt, &ua); err != nil {
			return nil, err
		}
		if ua != nil {
			v.UserAgent = *ua
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func mapUniqueEmail(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return ErrEmailTaken
	}
	return err
}
