package media

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/parche-app/backend/internal/auth"
)

// PG is the Postgres Store.
type PG struct {
	pool *pgxpool.Pool
	q    querier
}

type querier interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

func NewPG(pool *pgxpool.Pool) *PG {
	return &PG{pool: pool, q: pool}
}

func (s *PG) SaveIntent(ctx context.Context, in Intent) error {
	_, err := s.q.Exec(ctx, `
		INSERT INTO upload_intents (key, user_id, kind, event_id, artist_id, content_type, byte_size, expires_at)
		VALUES ($1,$2,$3,NULLIF($4,''),NULLIF($5,''),$6,$7,$8)
		ON CONFLICT (key) DO UPDATE SET
			user_id = EXCLUDED.user_id,
			kind = EXCLUDED.kind,
			event_id = EXCLUDED.event_id,
			artist_id = EXCLUDED.artist_id,
			content_type = EXCLUDED.content_type,
			byte_size = EXCLUDED.byte_size,
			expires_at = EXCLUDED.expires_at`,
		in.Key, in.UserID, in.Kind, in.EventID, in.ArtistID, in.ContentType, in.ByteSize, in.ExpiresAt)
	return err
}

func (s *PG) IntentByKey(ctx context.Context, key string) (Intent, error) {
	var in Intent
	var eventID *string
	var artistID *string
	err := s.q.QueryRow(ctx, `
		SELECT key, user_id, kind, event_id, artist_id, content_type, byte_size, expires_at
		FROM upload_intents WHERE key = $1`, key).
		Scan(&in.Key, &in.UserID, &in.Kind, &eventID, &artistID, &in.ContentType, &in.ByteSize, &in.ExpiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Intent{}, auth.ErrNotFound
	}
	if err != nil {
		return Intent{}, err
	}
	if eventID != nil {
		in.EventID = *eventID
	}
	if artistID != nil {
		in.ArtistID = *artistID
	}
	in.ExpiresAt = in.ExpiresAt.UTC()
	return in, nil
}

func (s *PG) DeleteIntent(ctx context.Context, key string) error {
	_, err := s.q.Exec(ctx, `DELETE FROM upload_intents WHERE key = $1`, key)
	return err
}

func (s *PG) CreateAsset(ctx context.Context, a Asset) error {
	_, err := s.q.Exec(ctx, `
		INSERT INTO assets (
			id, tenant_id, owner_type, owner_id, kind, key, thumb_key, preview_key, mime, bytes,
			width, height, duration_ms, status, transcode_status, created_by
		) VALUES ($1,NULLIF($2,'')::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
		a.ID, a.TenantID, a.OwnerType, a.OwnerID, a.Kind, a.Key, a.ThumbKey, a.PreviewKey, a.MIME, a.Bytes,
		a.Width, a.Height, a.DurationMS, a.Status, a.TranscodeStatus, a.CreatedBy)
	if isUnique(err) {
		return auth.ErrConflict
	}
	return err
}

func (s *PG) AssetByID(ctx context.Context, id string) (Asset, error) {
	return scanAsset(s.q.QueryRow(ctx, assetSelect+` WHERE id = $1`, id))
}

func (s *PG) AssetByKey(ctx context.Context, key string) (Asset, error) {
	return scanAsset(s.q.QueryRow(ctx, assetSelect+` WHERE key = $1`, key))
}

func (s *PG) UpdateAsset(ctx context.Context, a Asset) error {
	tag, err := s.q.Exec(ctx, `
		UPDATE assets SET
			kind = $2, key = $3, thumb_key = $4, preview_key = $5, mime = $6, bytes = $7,
			width = $8, height = $9, duration_ms = $10, status = $11, transcode_status = $12
		WHERE id = $1`,
		a.ID, a.Kind, a.Key, a.ThumbKey, a.PreviewKey, a.MIME, a.Bytes,
		a.Width, a.Height, a.DurationMS, a.Status, a.TranscodeStatus)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return auth.ErrNotFound
	}
	return nil
}

func (s *PG) DeleteAsset(ctx context.Context, id string) error {
	tag, err := s.q.Exec(ctx, `DELETE FROM assets WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return auth.ErrNotFound
	}
	return nil
}

func (s *PG) ListEventAssets(ctx context.Context, eventID string) ([]Asset, error) {
	rows, err := s.q.Query(ctx, assetSelect+`
		WHERE owner_type = 'event' AND owner_id = $1
		ORDER BY created_at ASC`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Asset
	for rows.Next() {
		a, err := scanAsset(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *PG) ReplaceTracks(ctx context.Context, eventID string, tracks []Track) error {
	if s.pool == nil {
		return s.replaceTracks(ctx, s.q, eventID, tracks)
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := s.replaceTracks(ctx, tx, eventID, tracks); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *PG) replaceTracks(ctx context.Context, q querier, eventID string, tracks []Track) error {
	if _, err := q.Exec(ctx, `DELETE FROM event_tracks WHERE event_id = $1`, eventID); err != nil {
		return err
	}
	for _, tr := range tracks {
		if _, err := q.Exec(ctx, `
			INSERT INTO event_tracks (id, event_id, asset_id, title, position)
			VALUES ($1,$2,$3,$4,$5)`,
			tr.ID, eventID, tr.AssetID, tr.Title, tr.Position); err != nil {
			if isUnique(err) {
				return auth.ErrConflict
			}
			return err
		}
	}
	return nil
}

func (s *PG) ListTracks(ctx context.Context, eventID string) ([]Track, error) {
	rows, err := s.q.Query(ctx, trackSelect+` WHERE event_id = $1 ORDER BY position ASC`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]Track, 0)
	for rows.Next() {
		tr, err := scanTrack(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, tr)
	}
	return out, rows.Err()
}

func (s *PG) TrackByID(ctx context.Context, eventID, trackID string) (Track, error) {
	return scanTrack(s.q.QueryRow(ctx, trackSelect+` WHERE event_id = $1 AND id = $2`, eventID, trackID))
}

func (s *PG) AssetInTracks(ctx context.Context, assetID string) (bool, error) {
	var n int
	err := s.q.QueryRow(ctx, `SELECT COUNT(*) FROM event_tracks WHERE asset_id = $1`, assetID).Scan(&n)
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

const assetSelect = `
	SELECT id, COALESCE(tenant_id::text, ''), owner_type, owner_id, kind, key, thumb_key, preview_key, mime, bytes,
		width, height, duration_ms, status, transcode_status, created_by, created_at
	FROM assets`

const trackSelect = `
	SELECT id, event_id, asset_id, title, position
	FROM event_tracks`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanAsset(row rowScanner) (Asset, error) {
	var a Asset
	err := row.Scan(
		&a.ID, &a.TenantID, &a.OwnerType, &a.OwnerID, &a.Kind, &a.Key, &a.ThumbKey, &a.PreviewKey, &a.MIME, &a.Bytes,
		&a.Width, &a.Height, &a.DurationMS, &a.Status, &a.TranscodeStatus, &a.CreatedBy, &a.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Asset{}, auth.ErrNotFound
	}
	if err != nil {
		return Asset{}, err
	}
	a.CreatedAt = a.CreatedAt.UTC()
	return a, nil
}

func scanTrack(row rowScanner) (Track, error) {
	var tr Track
	err := row.Scan(&tr.ID, &tr.EventID, &tr.AssetID, &tr.Title, &tr.Position)
	if errors.Is(err, pgx.ErrNoRows) {
		return Track{}, auth.ErrNotFound
	}
	if err != nil {
		return Track{}, err
	}
	return tr, nil
}

func isUnique(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
