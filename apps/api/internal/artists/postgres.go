package artists

import (
	"context"
	"encoding/json"
	"errors"

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
	q querier
}

func NewPG(pool *pgxpool.Pool) *PG {
	return &PG{q: pool}
}

func (s *PG) Create(ctx context.Context, a Artist) error {
	links, err := json.Marshal(a.Links)
	if err != nil {
		return err
	}
	_, err = s.q.Exec(ctx, `
		INSERT INTO artists (id, user_id, tenant_id, name, bio, avatar_asset_id, links, created_at, updated_at)
		VALUES ($1::uuid, NULLIF($2,'')::uuid, NULLIF($3,'')::uuid, $4, $5, NULLIF($6,'')::uuid, $7, $8, $9)`,
		a.ID, a.UserID, a.TenantID, a.Name, a.Bio, a.AvatarAssetID, links, a.CreatedAt, a.UpdatedAt)
	if isUnique(err) {
		return auth.ErrConflict
	}
	return err
}

func (s *PG) ByID(ctx context.Context, id string) (Artist, error) {
	return scanArtist(s.q.QueryRow(ctx, artistSelect+` WHERE id = $1`, id))
}

func (s *PG) ByUserID(ctx context.Context, userID string) (Artist, error) {
	return scanArtist(s.q.QueryRow(ctx, artistSelect+` WHERE user_id = $1`, userID))
}

func (s *PG) Update(ctx context.Context, a Artist) error {
	links, err := json.Marshal(a.Links)
	if err != nil {
		return err
	}
	tag, err := s.q.Exec(ctx, `
		UPDATE artists SET
			name = $2, bio = $3, avatar_asset_id = NULLIF($4,'')::uuid, links = $5, updated_at = now()
		WHERE id = $1`,
		a.ID, a.Name, a.Bio, a.AvatarAssetID, links)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return auth.ErrNotFound
	}
	return nil
}

func (s *PG) AddSlot(ctx context.Context, sl Slot) error {
	_, err := s.q.Exec(ctx, `
		INSERT INTO event_artists (event_id, artist_id, billing_order, starts_at)
		VALUES ($1, $2, $3, $4)`,
		sl.EventID, sl.ArtistID, sl.BillingOrder, sl.StartsAt)
	if isUnique(err) {
		return auth.ErrConflict
	}
	return err
}

func (s *PG) RemoveSlot(ctx context.Context, eventID, artistID string) error {
	_, err := s.q.Exec(ctx, `DELETE FROM event_artists WHERE event_id = $1 AND artist_id = $2`, eventID, artistID)
	return err
}

func (s *PG) SlotsByEvent(ctx context.Context, eventID string) ([]Slot, error) {
	rows, err := s.q.Query(ctx, `
		SELECT event_id, artist_id, billing_order, starts_at
		FROM event_artists WHERE event_id = $1
		ORDER BY billing_order ASC, artist_id ASC`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanSlots(rows)
}

func (s *PG) SlotsByArtist(ctx context.Context, artistID string) ([]Slot, error) {
	rows, err := s.q.Query(ctx, `
		SELECT event_id, artist_id, billing_order, starts_at
		FROM event_artists WHERE artist_id = $1`, artistID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanSlots(rows)
}

func (s *PG) Follow(ctx context.Context, f Follow) error {
	_, err := s.q.Exec(ctx, `
		INSERT INTO artist_follows (user_id, artist_id, created_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, artist_id) DO NOTHING`,
		f.UserID, f.ArtistID, f.CreatedAt)
	if isFK(err) {
		return auth.ErrNotFound
	}
	return err
}

func (s *PG) Unfollow(ctx context.Context, userID, artistID string) error {
	_, err := s.q.Exec(ctx, `DELETE FROM artist_follows WHERE user_id = $1 AND artist_id = $2`, userID, artistID)
	return err
}

func (s *PG) CountFollowers(ctx context.Context, artistID string) (int, error) {
	var n int
	err := s.q.QueryRow(ctx, `SELECT COUNT(*) FROM artist_follows WHERE artist_id = $1`, artistID).Scan(&n)
	return n, err
}

func (s *PG) FollowsByUser(ctx context.Context, userID string) ([]Follow, error) {
	rows, err := s.q.Query(ctx, `
		SELECT user_id, artist_id, created_at
		FROM artist_follows
		WHERE user_id = $1
		ORDER BY created_at DESC, artist_id DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Follow
	for rows.Next() {
		var f Follow
		if err := rows.Scan(&f.UserID, &f.ArtistID, &f.CreatedAt); err != nil {
			return nil, err
		}
		f.CreatedAt = f.CreatedAt.UTC()
		out = append(out, f)
	}
	if out == nil {
		out = []Follow{}
	}
	return out, rows.Err()
}

func (s *PG) FollowsByArtist(ctx context.Context, artistID string) ([]Follow, error) {
	rows, err := s.q.Query(ctx, `
		SELECT user_id, artist_id, created_at
		FROM artist_follows
		WHERE artist_id = $1`, artistID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Follow
	for rows.Next() {
		var f Follow
		if err := rows.Scan(&f.UserID, &f.ArtistID, &f.CreatedAt); err != nil {
			return nil, err
		}
		f.CreatedAt = f.CreatedAt.UTC()
		out = append(out, f)
	}
	if out == nil {
		out = []Follow{}
	}
	return out, rows.Err()
}

const artistSelect = `
	SELECT id, COALESCE(user_id::text, ''), COALESCE(tenant_id::text, ''), name, bio,
		COALESCE(avatar_asset_id::text, ''), links, created_at, updated_at
	FROM artists`

func scanArtist(row pgx.Row) (Artist, error) {
	var a Artist
	var raw []byte
	err := row.Scan(&a.ID, &a.UserID, &a.TenantID, &a.Name, &a.Bio, &a.AvatarAssetID, &raw, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Artist{}, auth.ErrNotFound
	}
	if err != nil {
		return Artist{}, err
	}
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &a.Links)
	}
	a.CreatedAt = a.CreatedAt.UTC()
	a.UpdatedAt = a.UpdatedAt.UTC()
	return a, nil
}

func scanSlots(rows pgx.Rows) ([]Slot, error) {
	var out []Slot
	for rows.Next() {
		var sl Slot
		if err := rows.Scan(&sl.EventID, &sl.ArtistID, &sl.BillingOrder, &sl.StartsAt); err != nil {
			return nil, err
		}
		if sl.StartsAt != nil {
			t := sl.StartsAt.UTC()
			sl.StartsAt = &t
		}
		out = append(out, sl)
	}
	if out == nil {
		out = []Slot{}
	}
	return out, rows.Err()
}

func isUnique(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func isFK(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23503"
}
