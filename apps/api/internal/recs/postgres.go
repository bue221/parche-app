package recs

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type querier interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
	Begin(context.Context) (pgx.Tx, error)
}

// PG is the Postgres Loader+Table.
type PG struct {
	q querier
}

func NewPG(pool *pgxpool.Pool) *PG {
	return &PG{q: pool}
}

func (s *PG) Candidates(ctx context.Context, now time.Time) ([]Candidate, error) {
	horizon := now.Add(-12 * time.Hour)
	soldFrom := now.Add(-soldWindow)
	rows, err := s.q.Query(ctx, `
		SELECT e.id, e.title, e.slug, e.starts_at, e.ends_at, e.status, e.venue_id,
			v.lat, v.lng, COALESCE(v.address_text, ''), e.genres,
			COALESCE((
				SELECT SUM(oi.quantity)::int
				FROM orders o
				JOIN order_items oi ON oi.order_id = o.id
				WHERE o.event_id = e.id AND o.status = 'paid' AND o.updated_at >= $2
			), 0) AS sold_7d
		FROM events e
		JOIN venues v ON v.id = e.venue_id
		WHERE e.status = 'published' AND e.starts_at >= $1
		ORDER BY e.starts_at ASC, e.id ASC
		LIMIT $3`, horizon, soldFrom, candidateLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Candidate
	ids := make([]string, 0)
	byID := map[string]int{}
	for rows.Next() {
		var c Candidate
		if err := rows.Scan(
			&c.Event.ID, &c.Event.Title, &c.Event.Slug, &c.Event.StartsAt, &c.Event.EndsAt,
			&c.Event.Status, &c.Event.VenueID, &c.Lat, &c.Lng, &c.Event.AddressText, &c.Genres, &c.Sold7d,
		); err != nil {
			return nil, err
		}
		c.Event.StartsAt = c.Event.StartsAt.UTC()
		c.Event.EndsAt = c.Event.EndsAt.UTC()
		c.StartsAt = c.Event.StartsAt
		c.Event.Lat = c.Lat
		c.Event.Lng = c.Lng
		if c.Genres == nil {
			c.Genres = []string{}
		}
		c.Event.Genres = c.Genres
		c.Artists = []string{}
		byID[c.Event.ID] = len(out)
		ids = append(ids, c.Event.ID)
		out = append(out, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return []Candidate{}, nil
	}
	arows, err := s.q.Query(ctx, `
		SELECT event_id, artist_id FROM event_artists WHERE event_id = ANY($1::uuid[])`, ids)
	if err != nil {
		return nil, err
	}
	defer arows.Close()
	for arows.Next() {
		var eventID, artistID string
		if err := arows.Scan(&eventID, &artistID); err != nil {
			return nil, err
		}
		i, ok := byID[eventID]
		if !ok {
			continue
		}
		out[i].Artists = append(out[i].Artists, artistID)
	}
	return out, arows.Err()
}

func (s *PG) FollowedArtistIDs(ctx context.Context, userID string) ([]string, error) {
	rows, err := s.q.Query(ctx, `SELECT artist_id FROM artist_follows WHERE user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanIDs(rows)
}

func (s *PG) PaidEventIDs(ctx context.Context, userID string) ([]string, error) {
	rows, err := s.q.Query(ctx, `
		SELECT DISTINCT event_id FROM tickets
		WHERE user_id = $1 AND status IN ('valid', 'used')`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanIDs(rows)
}

func (s *PG) UserIDs(ctx context.Context) ([]string, error) {
	rows, err := s.q.Query(ctx, `
		SELECT DISTINCT user_id FROM artist_follows
		UNION
		SELECT DISTINCT user_id FROM tickets WHERE status IN ('valid', 'used')`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanIDs(rows)
}

func (s *PG) ReplaceUser(ctx context.Context, userID string, items []Item, at time.Time) error {
	tx, err := s.q.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, `DELETE FROM event_recommendations WHERE user_id = $1`, userID); err != nil {
		return err
	}
	for i, it := range items {
		if _, err := tx.Exec(ctx, `
			INSERT INTO event_recommendations (user_id, event_id, score, reason, rank, computed_at)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			userID, it.EventID, it.Score, it.Reason, i+1, at.UTC()); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s *PG) ListUser(ctx context.Context, userID string, limit int) ([]Item, error) {
	if limit < 1 {
		limit = maxReturn
	}
	rows, err := s.q.Query(ctx, `
		SELECT event_id, reason, score
		FROM event_recommendations
		WHERE user_id = $1
		ORDER BY rank ASC, score DESC
		LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Item
	for rows.Next() {
		var it Item
		if err := rows.Scan(&it.EventID, &it.Reason, &it.Score); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	if out == nil {
		out = []Item{}
	}
	return out, rows.Err()
}

func scanIDs(rows pgx.Rows) ([]string, error) {
	var out []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	if out == nil {
		out = []string{}
	}
	return out, rows.Err()
}
