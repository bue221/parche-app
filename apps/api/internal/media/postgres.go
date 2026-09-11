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
	q querier
}

type querier interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

func NewPG(pool *pgxpool.Pool) *PG {
	return &PG{q: pool}
}

func (s *PG) SaveIntent(ctx context.Context, in Intent) error {
	_, err := s.q.Exec(ctx, `
		INSERT INTO upload_intents (key, user_id, kind, event_id, content_type, byte_size, expires_at)
		VALUES ($1,$2,$3,NULLIF($4,''),$5,$6,$7)
		ON CONFLICT (key) DO UPDATE SET
			user_id = EXCLUDED.user_id,
			kind = EXCLUDED.kind,
			event_id = EXCLUDED.event_id,
			content_type = EXCLUDED.content_type,
			byte_size = EXCLUDED.byte_size,
			expires_at = EXCLUDED.expires_at`,
		in.Key, in.UserID, in.Kind, in.EventID, in.ContentType, in.ByteSize, in.ExpiresAt)
	return err
}

func (s *PG) IntentByKey(ctx context.Context, key string) (Intent, error) {
	var in Intent
	var eventID *string
	err := s.q.QueryRow(ctx, `
		SELECT key, user_id, kind, event_id, content_type, byte_size, expires_at
		FROM upload_intents WHERE key = $1`, key).
		Scan(&in.Key, &in.UserID, &in.Kind, &eventID, &in.ContentType, &in.ByteSize, &in.ExpiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Intent{}, auth.ErrNotFound
	}
	if err != nil {
		return Intent{}, err
	}
	if eventID != nil {
		in.EventID = *eventID
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
			id, tenant_id, owner_type, owner_id, kind, key, thumb_key, mime, bytes,
			width, height, status, created_by
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		a.ID, a.TenantID, a.OwnerType, a.OwnerID, a.Kind, a.Key, a.ThumbKey, a.MIME, a.Bytes,
		a.Width, a.Height, a.Status, a.CreatedBy)
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
			kind = $2, key = $3, thumb_key = $4, mime = $5, bytes = $6,
			width = $7, height = $8, status = $9
		WHERE id = $1`,
		a.ID, a.Kind, a.Key, a.ThumbKey, a.MIME, a.Bytes, a.Width, a.Height, a.Status)
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

const assetSelect = `
	SELECT id, tenant_id, owner_type, owner_id, kind, key, thumb_key, mime, bytes,
		width, height, status, created_by, created_at
	FROM assets`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanAsset(row rowScanner) (Asset, error) {
	var a Asset
	err := row.Scan(
		&a.ID, &a.TenantID, &a.OwnerType, &a.OwnerID, &a.Kind, &a.Key, &a.ThumbKey, &a.MIME, &a.Bytes,
		&a.Width, &a.Height, &a.Status, &a.CreatedBy, &a.CreatedAt,
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

func isUnique(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
