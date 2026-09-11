package events

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/parche-app/backend/internal/auth"
)

type querier interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

// PG is the Postgres Store.
type PG struct {
	pool *pgxpool.Pool
	q    querier
}

func NewPG(pool *pgxpool.Pool) *PG {
	return &PG{pool: pool, q: pool}
}

func (s *PG) Create(ctx context.Context, e Event, ownerUserID string) error {
	if s.pool == nil {
		return fmt.Errorf("postgres pool is nil")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	_, err = tx.Exec(ctx, `
		INSERT INTO events (
			id, tenant_id, title, slug, description, starts_at, ends_at,
			venue_id, status, flyer_asset_id, genres, age_policy, created_by
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NULLIF($10,''),$11,$12,$13)`,
		e.ID, e.TenantID, e.Title, e.Slug, e.Description, e.StartsAt, e.EndsAt,
		e.VenueID, e.Status, e.FlyerAssetID, e.Genres, e.AgePolicy, e.CreatedBy)
	if err != nil {
		if isUniqueViolation(err) {
			return auth.ErrConflict
		}
		return err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO event_members (event_id, user_id, role, status)
		VALUES ($1, $2, $3, $4)`, e.ID, ownerUserID, RoleOwner, MemberActive)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *PG) ByID(ctx context.Context, id string) (Event, error) {
	return scanEvent(s.q.QueryRow(ctx, eventSelect+` WHERE e.id = $1`, id))
}

func (s *PG) Update(ctx context.Context, e Event) error {
	tag, err := s.q.Exec(ctx, `
		UPDATE events SET
			title = $2, description = $3, starts_at = $4, ends_at = $5,
			venue_id = $6, status = $7, flyer_asset_id = NULLIF($8, ''),
			genres = $9, age_policy = $10, updated_at = now()
		WHERE id = $1`,
		e.ID, e.Title, e.Description, e.StartsAt, e.EndsAt,
		e.VenueID, e.Status, e.FlyerAssetID, e.Genres, e.AgePolicy)
	if err != nil {
		if isUniqueViolation(err) {
			return auth.ErrConflict
		}
		return err
	}
	if tag.RowsAffected() == 0 {
		return auth.ErrNotFound
	}
	return nil
}

func (s *PG) List(ctx context.Context, f ListFilter) ([]Event, error) {
	limit := f.Limit
	if limit < 1 {
		limit = 20
	}
	curStarts, curID, err := DecodeCursor(f.Cursor)
	if err != nil {
		return nil, err
	}
	var (
		b    strings.Builder
		args []any
		n    int
		add  = func(expr string, v any) {
			n++
			args = append(args, v)
			fmt.Fprintf(&b, " AND "+expr, n)
		}
	)
	b.WriteString(eventSelect + ` WHERE 1=1`)
	if f.Public {
		b.WriteString(` AND e.status = 'published'`)
		n++
		args = append(args, publicWindowStart(f.Now))
		fmt.Fprintf(&b, " AND e.starts_at >= $%d", n)
	} else if f.TenantID != "" {
		add("e.tenant_id = $%d", f.TenantID)
	}
	if f.BBox != nil {
		add("v.lat >= $%d", f.BBox.MinLat)
		add("v.lat <= $%d", f.BBox.MaxLat)
		add("v.lng >= $%d", f.BBox.MinLng)
		add("v.lng <= $%d", f.BBox.MaxLng)
	}
	if f.Cursor != "" {
		n++
		args = append(args, curStarts)
		n++
		args = append(args, curID)
		fmt.Fprintf(&b, " AND (e.starts_at, e.id) > ($%d, $%d)", n-1, n)
	}
	fmt.Fprintf(&b, " ORDER BY e.starts_at ASC, e.id ASC LIMIT $%d", n+1)
	args = append(args, limit)
	rows, err := s.q.Query(ctx, b.String(), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Event
	for rows.Next() {
		e, err := scanEvent(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *PG) Member(ctx context.Context, eventID, userID string) (Member, error) {
	var m Member
	err := s.q.QueryRow(ctx, `
		SELECT event_id, user_id, role, status
		FROM event_members WHERE event_id = $1 AND user_id = $2`, eventID, userID).
		Scan(&m.EventID, &m.UserID, &m.Role, &m.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return Member{}, auth.ErrNotFound
	}
	if err != nil {
		return Member{}, err
	}
	return m, nil
}

func (s *PG) ListMembers(ctx context.Context, eventID string) ([]Member, error) {
	rows, err := s.q.Query(ctx, `
		SELECT event_id, user_id, role, status
		FROM event_members WHERE event_id = $1
		ORDER BY user_id`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Member
	for rows.Next() {
		var m Member
		if err := rows.Scan(&m.EventID, &m.UserID, &m.Role, &m.Status); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *PG) ListActiveByUser(ctx context.Context, userID string) ([]Member, error) {
	rows, err := s.q.Query(ctx, `
		SELECT event_id, user_id, role, status
		FROM event_members WHERE user_id = $1 AND status = 'active'
		ORDER BY event_id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Member
	for rows.Next() {
		var m Member
		if err := rows.Scan(&m.EventID, &m.UserID, &m.Role, &m.Status); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *PG) UpsertMember(ctx context.Context, m Member) error {
	_, err := s.q.Exec(ctx, `
		INSERT INTO event_members (event_id, user_id, role, status)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (event_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status`,
		m.EventID, m.UserID, m.Role, m.Status)
	return err
}

func (s *PG) ActiveOwnerCount(ctx context.Context, eventID string) (int, error) {
	var n int
	err := s.q.QueryRow(ctx, `
		SELECT COUNT(*) FROM event_members
		WHERE event_id = $1 AND role = 'owner' AND status = 'active'`, eventID).Scan(&n)
	return n, err
}

func (s *PG) CreateInvite(ctx context.Context, in Invite) error {
	var invited any
	if in.InvitedUserID != "" {
		invited = in.InvitedUserID
	}
	_, err := s.q.Exec(ctx, `
		INSERT INTO event_invites (
			id, event_id, email, invited_user_id, role, token_hash, expires_at, invited_by
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		in.ID, in.EventID, in.Email, invited, in.Role, in.TokenHash, in.ExpiresAt, in.InvitedBy)
	if isUniqueViolation(err) {
		return auth.ErrConflict
	}
	return err
}

func (s *PG) InviteByTokenHash(ctx context.Context, hash string) (Invite, error) {
	return scanInvite(s.q.QueryRow(ctx, inviteSelect+` WHERE token_hash = $1`, hash))
}

func (s *PG) PendingInvite(ctx context.Context, eventID, email string) (Invite, error) {
	return scanInvite(s.q.QueryRow(ctx, inviteSelect+`
		WHERE event_id = $1 AND email = $2 AND accepted_at IS NULL`, eventID, email))
}

func (s *PG) AcceptInvite(ctx context.Context, inviteID string, member Member, at time.Time) error {
	if s.pool == nil {
		return fmt.Errorf("postgres pool is nil")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	tag, err := tx.Exec(ctx, `
		UPDATE event_invites SET accepted_at = $2
		WHERE id = $1 AND accepted_at IS NULL AND expires_at > $2`, inviteID, at)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return auth.ErrGone
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO event_members (event_id, user_id, role, status)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (event_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status`,
		member.EventID, member.UserID, member.Role, member.Status)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

const inviteSelect = `
	SELECT id, event_id, email, COALESCE(invited_user_id::text, ''), role, token_hash,
		expires_at, accepted_at, invited_by
	FROM event_invites`

func scanInvite(row rowScanner) (Invite, error) {
	var in Invite
	err := row.Scan(
		&in.ID, &in.EventID, &in.Email, &in.InvitedUserID, &in.Role, &in.TokenHash,
		&in.ExpiresAt, &in.AcceptedAt, &in.InvitedBy,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Invite{}, auth.ErrNotFound
	}
	if err != nil {
		return Invite{}, err
	}
	in.ExpiresAt = in.ExpiresAt.UTC()
	if in.AcceptedAt != nil {
		t := in.AcceptedAt.UTC()
		in.AcceptedAt = &t
	}
	return in, nil
}

const eventSelect = `
	SELECT e.id, e.tenant_id, e.title, e.slug, e.description, e.starts_at, e.ends_at,
		e.venue_id, e.status, COALESCE(e.flyer_asset_id::text, ''), e.genres, e.age_policy,
		e.created_by, e.created_at, e.updated_at,
		v.lat, v.lng, v.address_text, v.name
	FROM events e
	JOIN venues v ON v.id = e.venue_id`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanEvent(row rowScanner) (Event, error) {
	var e Event
	err := row.Scan(
		&e.ID, &e.TenantID, &e.Title, &e.Slug, &e.Description, &e.StartsAt, &e.EndsAt,
		&e.VenueID, &e.Status, &e.FlyerAssetID, &e.Genres, &e.AgePolicy,
		&e.CreatedBy, &e.CreatedAt, &e.UpdatedAt,
		&e.Lat, &e.Lng, &e.AddressText, &e.VenueName,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Event{}, auth.ErrNotFound
	}
	if err != nil {
		return Event{}, err
	}
	if e.Genres == nil {
		e.Genres = []string{}
	}
	e.StartsAt = e.StartsAt.UTC()
	e.EndsAt = e.EndsAt.UTC()
	e.CreatedAt = e.CreatedAt.UTC()
	e.UpdatedAt = e.UpdatedAt.UTC()
	return e, nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
