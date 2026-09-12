package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
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
			INSERT INTO users (id, email, password_hash, display_name, phone, status, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			acc.User.ID, acc.User.Email, acc.User.PasswordHash, acc.User.DisplayName, acc.User.Phone, acc.User.Status, acc.User.CreatedAt)
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
	return s.scanUser(ctx, userSelect+` WHERE email = $1`, email)
}

func (s *PG) UserByID(ctx context.Context, id string) (User, error) {
	return s.scanUser(ctx, userSelect+` WHERE id = $1`, id)
}

const userSelect = `SELECT id, email, password_hash, display_name, COALESCE(bio, ''), COALESCE(avatar_asset_id::text, ''), status, session_epoch, created_at, COALESCE(email_opt_out, false), COALESCE(phone, '') FROM users`

func scanUserCols(scan func(dest ...any) error) (User, error) {
	var u User
	err := scan(&u.ID, &u.Email, &u.PasswordHash, &u.DisplayName, &u.Bio, &u.AvatarAssetID, &u.Status, &u.SessionEpoch, &u.CreatedAt, &u.EmailOptOut, &u.Phone)
	return u, err
}

func (s *PG) scanUser(ctx context.Context, q string, arg any) (User, error) {
	u, err := scanUserCols(s.q.QueryRow(ctx, q, arg).Scan)
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
	list, err := s.TenantsForUser(ctx, userID)
	if err != nil || len(list) == 0 {
		return nil, err
	}
	v := list[0]
	return &v, nil
}

func (s *PG) TenantsForUser(ctx context.Context, userID string) ([]TenantView, error) {
	rows, err := s.q.Query(ctx, `
		SELECT t.id, t.name, m.role
		FROM tenant_members m
		JOIN tenants t ON t.id = m.tenant_id
		WHERE m.user_id = $1
		ORDER BY m.created_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []TenantView{}
	for rows.Next() {
		var v TenantView
		if err := rows.Scan(&v.ID, &v.Name, &v.Role); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *PG) InsertProfile(ctx context.Context, userID, profile string) error {
	_, err := s.q.Exec(ctx, `
		INSERT INTO user_profiles (user_id, profile) VALUES ($1, $2)
		ON CONFLICT (user_id, profile) DO NOTHING`, userID, profile)
	return err
}

func (s *PG) CreateTenant(ctx context.Context, t Tenant, ownerUserID string) error {
	run := func(st Store) error {
		pg, ok := st.(*PG)
		if !ok {
			return fmt.Errorf("auth store type")
		}
		if _, err := pg.q.Exec(ctx, `
			INSERT INTO tenants (id, slug, name, currency, status)
			VALUES ($1, $2, $3, $4, $5)`, t.ID, t.Slug, t.Name, t.Currency, t.Status); err != nil {
			return mapUniqueConflict(err)
		}
		_, err := pg.q.Exec(ctx, `
			INSERT INTO tenant_members (tenant_id, user_id, role) VALUES ($1, $2, $3)`,
			t.ID, ownerUserID, TenantOwner)
		return err
	}
	if s.forUpdate {
		return run(s)
	}
	return s.InTx(ctx, run)
}

func (s *PG) TenantByID(ctx context.Context, id string) (Tenant, error) {
	var t Tenant
	err := s.q.QueryRow(ctx, `
		SELECT id, slug, name, currency, status FROM tenants WHERE id = $1`, id).
		Scan(&t.ID, &t.Slug, &t.Name, &t.Currency, &t.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return Tenant{}, ErrNotFound
	}
	if err != nil {
		return Tenant{}, err
	}
	return t, nil
}

func (s *PG) Membership(ctx context.Context, tenantID, userID string) (string, error) {
	var role string
	err := s.q.QueryRow(ctx, `
		SELECT role FROM tenant_members WHERE tenant_id = $1 AND user_id = $2`, tenantID, userID).Scan(&role)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", err
	}
	return role, nil
}

func (s *PG) UpdateTenant(ctx context.Context, id, name, currency string) error {
	tag, err := s.q.Exec(ctx, `
		UPDATE tenants SET name = $2, currency = $3 WHERE id = $1`, id, name, currency)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PG) ListMembers(ctx context.Context, tenantID string) ([]TenantMemberView, error) {
	rows, err := s.q.Query(ctx, `
		SELECT m.user_id, u.email, u.display_name, m.role
		FROM tenant_members m
		JOIN users u ON u.id = m.user_id
		WHERE m.tenant_id = $1
		ORDER BY m.created_at`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []TenantMemberView{}
	for rows.Next() {
		var v TenantMemberView
		if err := rows.Scan(&v.UserID, &v.Email, &v.DisplayName, &v.Role); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *PG) AddMember(ctx context.Context, tenantID, userID, role string) error {
	_, err := s.q.Exec(ctx, `
		INSERT INTO tenant_members (tenant_id, user_id, role) VALUES ($1, $2, $3)`,
		tenantID, userID, role)
	if err != nil {
		return mapUniqueConflict(err)
	}
	return nil
}

func (s *PG) OwnerCount(ctx context.Context, tenantID string) (int, error) {
	var n int
	err := s.q.QueryRow(ctx, `
		SELECT COUNT(*) FROM tenant_members WHERE tenant_id = $1 AND role = $2`, tenantID, TenantOwner).Scan(&n)
	return n, err
}

func (s *PG) RemoveMember(ctx context.Context, tenantID, userID string) error {
	tag, err := s.q.Exec(ctx, `
		DELETE FROM tenant_members WHERE tenant_id = $1 AND user_id = $2`, tenantID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
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

func (s *PG) InsertPasswordReset(ctx context.Context, row PasswordResetRow) error {
	_, err := s.q.Exec(ctx, `
		INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at)
		VALUES ($1, $2, $3, $4, $5)`,
		row.ID, row.UserID, row.TokenHash, row.ExpiresAt, row.UsedAt)
	return err
}

func (s *PG) PasswordResetByHash(ctx context.Context, hash string) (PasswordResetRow, error) {
	q := `
		SELECT id, user_id, token_hash, expires_at, used_at
		FROM password_reset_tokens WHERE token_hash = $1`
	if s.forUpdate {
		q += ` FOR UPDATE`
	}
	var row PasswordResetRow
	err := s.q.QueryRow(ctx, q, hash).Scan(&row.ID, &row.UserID, &row.TokenHash, &row.ExpiresAt, &row.UsedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return PasswordResetRow{}, ErrNotFound
	}
	if err != nil {
		return PasswordResetRow{}, err
	}
	return row, nil
}

func (s *PG) MarkPasswordResetUsed(ctx context.Context, id string, at time.Time) error {
	_, err := s.q.Exec(ctx, `
		UPDATE password_reset_tokens SET used_at = $2 WHERE id = $1 AND used_at IS NULL`, id, at)
	return err
}

func (s *PG) InvalidateUserPasswordResets(ctx context.Context, userID string, at time.Time) error {
	_, err := s.q.Exec(ctx, `
		UPDATE password_reset_tokens SET used_at = $2 WHERE user_id = $1 AND used_at IS NULL`, userID, at)
	return err
}

func (s *PG) SetPasswordAndBumpEpoch(ctx context.Context, userID, passwordHash string) error {
	_, err := s.q.Exec(ctx, `
		UPDATE users SET password_hash = $2, session_epoch = session_epoch + 1 WHERE id = $1`, userID, passwordHash)
	return err
}

func (s *PG) UpdateProfile(ctx context.Context, userID, displayName, bio, phone string) error {
	tag, err := s.q.Exec(ctx, `UPDATE users SET display_name = $2, bio = $3, phone = $4 WHERE id = $1`, userID, displayName, bio, phone)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PG) SetAvatarAsset(ctx context.Context, userID, assetID string) (string, error) {
	var prev *string
	err := s.q.QueryRow(ctx, `SELECT avatar_asset_id::text FROM users WHERE id = $1`, userID).Scan(&prev)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", err
	}
	_, err = s.q.Exec(ctx, `UPDATE users SET avatar_asset_id = $2::uuid WHERE id = $1`, userID, assetID)
	if err != nil {
		return "", err
	}
	if prev == nil {
		return "", nil
	}
	return *prev, nil
}

func (s *PG) SetEmail(ctx context.Context, userID, email string) error {
	tag, err := s.q.Exec(ctx, `UPDATE users SET email = $2 WHERE id = $1`, userID, email)
	if err != nil {
		return mapUniqueEmail(err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PG) InsertEmailChange(ctx context.Context, row EmailChangeRow) error {
	_, err := s.q.Exec(ctx, `
		INSERT INTO email_change_tokens (id, user_id, new_email, token_hash, expires_at, used_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		row.ID, row.UserID, row.NewEmail, row.TokenHash, row.ExpiresAt, row.UsedAt)
	return err
}

func (s *PG) EmailChangeByHash(ctx context.Context, hash string) (EmailChangeRow, error) {
	q := `
		SELECT id, user_id, new_email, token_hash, expires_at, used_at
		FROM email_change_tokens WHERE token_hash = $1`
	if s.forUpdate {
		q += ` FOR UPDATE`
	}
	var row EmailChangeRow
	err := s.q.QueryRow(ctx, q, hash).Scan(&row.ID, &row.UserID, &row.NewEmail, &row.TokenHash, &row.ExpiresAt, &row.UsedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return EmailChangeRow{}, ErrNotFound
	}
	if err != nil {
		return EmailChangeRow{}, err
	}
	return row, nil
}

func (s *PG) MarkEmailChangeUsed(ctx context.Context, id string, at time.Time) error {
	_, err := s.q.Exec(ctx, `
		UPDATE email_change_tokens SET used_at = $2 WHERE id = $1 AND used_at IS NULL`, id, at)
	return err
}

func (s *PG) InvalidateUserEmailChanges(ctx context.Context, userID string, at time.Time) error {
	_, err := s.q.Exec(ctx, `
		UPDATE email_change_tokens SET used_at = $2 WHERE user_id = $1 AND used_at IS NULL`, userID, at)
	return err
}

func (s *PG) DeleteProfile(ctx context.Context, userID, profile string) error {
	_, err := s.q.Exec(ctx, `DELETE FROM user_profiles WHERE user_id = $1 AND profile = $2`, userID, profile)
	return err
}

func (s *PG) SearchUsers(ctx context.Context, q string, limit int) ([]User, error) {
	if limit < 1 {
		limit = 20
	}
	q = strings.TrimSpace(q)
	var (
		rows pgx.Rows
		err  error
	)
	if q == "" {
		rows, err = s.q.Query(ctx, userSelect+` ORDER BY created_at DESC, id DESC LIMIT $1`, limit)
	} else {
		pat := "%" + likeEscape(q) + "%"
		rows, err = s.q.Query(ctx, userSelect+`
			WHERE email ILIKE $1 ESCAPE '\' OR display_name ILIKE $1 ESCAPE '\'
			ORDER BY created_at DESC, id DESC LIMIT $2`, pat, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []User
	for rows.Next() {
		u, err := scanUserCols(rows.Scan)
		if err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	if out == nil {
		out = []User{}
	}
	return out, rows.Err()
}

func (s *PG) CountUsers(ctx context.Context) (int, error) {
	var n int
	err := s.q.QueryRow(ctx, `SELECT COUNT(*)::int FROM users`).Scan(&n)
	return n, err
}

func (s *PG) CountActiveProfiles(ctx context.Context, profile string) (int, error) {
	var n int
	err := s.q.QueryRow(ctx, `
		SELECT COUNT(*)::int
		FROM user_profiles p
		INNER JOIN users u ON u.id = p.user_id
		WHERE p.profile = $1 AND u.status = $2`, profile, StatusActive).Scan(&n)
	return n, err
}

func (s *PG) SetUserStatus(ctx context.Context, userID, status string) error {
	tag, err := s.q.Exec(ctx, `UPDATE users SET status = $2 WHERE id = $1`, userID, status)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PG) BumpSessionEpoch(ctx context.Context, userID string) error {
	tag, err := s.q.Exec(ctx, `UPDATE users SET session_epoch = session_epoch + 1 WHERE id = $1`, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PG) SetEmailOptOut(ctx context.Context, userID string, optedOut bool) error {
	tag, err := s.q.Exec(ctx, `UPDATE users SET email_opt_out = $2 WHERE id = $1`, userID, optedOut)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PG) ListMailRecipients(ctx context.Context) ([]User, error) {
	rows, err := s.q.Query(ctx, userSelect+` WHERE status = $1 AND email_opt_out = FALSE AND email <> '' ORDER BY id`, StatusActive)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []User
	for rows.Next() {
		u, err := scanUserCols(rows.Scan)
		if err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	if out == nil {
		out = []User{}
	}
	return out, rows.Err()
}

func likeEscape(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `%`, `\%`)
	s = strings.ReplaceAll(s, `_`, `\_`)
	return s
}

func mapUniqueEmail(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return ErrEmailTaken
	}
	return err
}

func mapUniqueConflict(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return ErrConflict
	}
	return err
}
