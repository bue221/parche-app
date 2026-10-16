package venues

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

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

func (s *PG) Create(ctx context.Context, v Venue) error {
	geo, err := geoArg(v.GeoJSON)
	if err != nil {
		return err
	}
	_, err = s.q.Exec(ctx, `
		INSERT INTO venues (id, tenant_id, name, address_text, lat, lng, geojson, source, kind, listed)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		v.ID, v.TenantID, v.Name, v.AddressText, v.Lat, v.Lng, geo, SourceUserPin, v.Kind, v.Listed)
	return err
}

func (s *PG) ByID(ctx context.Context, id string) (Venue, error) {
	return scanVenue(s.q.QueryRow(ctx, `
		SELECT id, tenant_id, name, address_text, lat, lng, geojson, source, kind, listed, published_uses, created_at
		FROM venues WHERE id = $1`, id))
}

func (s *PG) Update(ctx context.Context, v Venue) error {
	geo, err := geoArg(v.GeoJSON)
	if err != nil {
		return err
	}
	tag, err := s.q.Exec(ctx, `
		UPDATE venues SET name = $2, address_text = $3, lat = $4, lng = $5, geojson = $6, kind = $7, listed = $8
		WHERE id = $1`, v.ID, v.Name, v.AddressText, v.Lat, v.Lng, geo, v.Kind, v.Listed)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return auth.ErrNotFound
	}
	return nil
}

func (s *PG) List(ctx context.Context, f ListFilter) ([]Venue, error) {
	limit := f.Limit
	if limit < 1 {
		limit = 20
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
	b.WriteString(`
		SELECT id, tenant_id, name, address_text, lat, lng, geojson, source, kind, listed, published_uses, created_at
		FROM venues WHERE 1=1`)
	if f.Directory {
		b.WriteString(" AND kind = 'club' AND (listed OR published_uses > 0)")
	} else if f.TenantID != "" {
		add("tenant_id = $%d", f.TenantID)
	} else {
		b.WriteString(" AND published_uses > 0")
	}
	if f.Kind != "" && !f.Directory {
		add("kind = $%d", f.Kind)
	}
	if q := strings.TrimSpace(f.Q); q != "" {
		n++
		args = append(args, likePattern(q))
		fmt.Fprintf(&b, " AND (name ILIKE $%d ESCAPE '\\' OR address_text ILIKE $%d ESCAPE '\\')", n, n)
	}
	if f.BBox != nil {
		add("lat >= $%d", f.BBox.MinLat)
		add("lat <= $%d", f.BBox.MaxLat)
		add("lng >= $%d", f.BBox.MinLng)
		add("lng <= $%d", f.BBox.MaxLng)
	}
	if f.Cursor != "" {
		add("id < $%d", f.Cursor)
	}
	fmt.Fprintf(&b, " ORDER BY id DESC LIMIT $%d", n+1)
	args = append(args, limit)
	rows, err := s.q.Query(ctx, b.String(), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Venue
	for rows.Next() {
		v, err := scanVenue(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *PG) AdjustPublishedUses(ctx context.Context, id string, delta int) error {
	tag, err := s.q.Exec(ctx, `
		UPDATE venues SET published_uses = GREATEST(published_uses + $2, 0) WHERE id = $1`, id, delta)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return auth.ErrNotFound
	}
	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanVenue(row rowScanner) (Venue, error) {
	var (
		v      Venue
		raw    []byte
		src    string
		kind   string
		listed bool
		uses   int
	)
	err := row.Scan(&v.ID, &v.TenantID, &v.Name, &v.AddressText, &v.Lat, &v.Lng, &raw, &src, &kind, &listed, &uses, &v.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Venue{}, auth.ErrNotFound
	}
	if err != nil {
		return Venue{}, err
	}
	v.Source = src
	v.Kind = kind
	v.Listed = listed
	v.PublishedUses = uses
	if len(raw) > 0 {
		v.GeoJSON = json.RawMessage(raw)
	}
	return v, nil
}

func geoArg(raw json.RawMessage) (any, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	if !json.Valid(raw) {
		return nil, auth.Invalid{Fields: []auth.Field{{Name: "geojson", Issue: "json"}}}
	}
	return raw, nil
}

func likePattern(q string) string {
	q = strings.ReplaceAll(q, `\`, `\\`)
	q = strings.ReplaceAll(q, `%`, `\%`)
	q = strings.ReplaceAll(q, `_`, `\_`)
	return "%" + q + "%"
}
