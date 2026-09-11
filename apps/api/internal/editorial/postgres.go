package editorial

import (
	"context"
	"errors"
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
	q querier
}

func NewPG(pool *pgxpool.Pool) *PG {
	return &PG{q: pool}
}

const postSelect = `
	SELECT id, slug, title, body_md, COALESCE(cover_asset_id::text, ''), status, author_id,
		published_at, created_at, updated_at
	FROM posts`

func (s *PG) Create(ctx context.Context, p Post) error {
	_, err := s.q.Exec(ctx, `
		INSERT INTO posts (id, slug, title, body_md, cover_asset_id, status, author_id, published_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,NULLIF($5,'')::uuid,$6,$7,$8,$9,$10)`,
		p.ID, p.Slug, p.Title, p.BodyMD, p.CoverAssetID, p.Status, p.AuthorID, p.PublishedAt, p.CreatedAt, p.UpdatedAt)
	if isUnique(err) {
		return auth.ErrConflict
	}
	return err
}

func (s *PG) ByID(ctx context.Context, id string) (Post, error) {
	return scanPost(s.q.QueryRow(ctx, postSelect+` WHERE id = $1`, id))
}

func (s *PG) BySlug(ctx context.Context, slug string) (Post, error) {
	return scanPost(s.q.QueryRow(ctx, postSelect+` WHERE slug = $1`, slug))
}

func (s *PG) Update(ctx context.Context, p Post) error {
	tag, err := s.q.Exec(ctx, `
		UPDATE posts SET
			slug = $2, title = $3, body_md = $4, cover_asset_id = NULLIF($5,'')::uuid,
			status = $6, published_at = $7, updated_at = $8
		WHERE id = $1`,
		p.ID, p.Slug, p.Title, p.BodyMD, p.CoverAssetID, p.Status, p.PublishedAt, p.UpdatedAt)
	if isUnique(err) {
		return auth.ErrConflict
	}
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return auth.ErrNotFound
	}
	return nil
}

func (s *PG) ListPublished(ctx context.Context, after time.Time, afterID string, limit int) ([]Post, error) {
	if limit < 1 {
		limit = 20
	}
	var rows pgx.Rows
	var err error
	if after.IsZero() && afterID == "" {
		rows, err = s.q.Query(ctx, postSelect+`
			WHERE status = 'published' AND published_at IS NOT NULL
			ORDER BY published_at DESC, id DESC
			LIMIT $1`, limit)
	} else {
		rows, err = s.q.Query(ctx, postSelect+`
			WHERE status = 'published' AND published_at IS NOT NULL
				AND (published_at, id) < ($1, $2)
			ORDER BY published_at DESC, id DESC
			LIMIT $3`, after.UTC(), afterID, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Post
	for rows.Next() {
		p, err := scanPost(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	if out == nil {
		out = []Post{}
	}
	return out, rows.Err()
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanPost(row rowScanner) (Post, error) {
	var p Post
	var published *time.Time
	err := row.Scan(&p.ID, &p.Slug, &p.Title, &p.BodyMD, &p.CoverAssetID, &p.Status, &p.AuthorID,
		&published, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Post{}, auth.ErrNotFound
	}
	if err != nil {
		return Post{}, err
	}
	if published != nil {
		t := published.UTC()
		p.PublishedAt = &t
	}
	p.CreatedAt = p.CreatedAt.UTC()
	p.UpdatedAt = p.UpdatedAt.UTC()
	return p, nil
}

func isUnique(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
