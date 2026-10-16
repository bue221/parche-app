package recs

import (
	"context"
	"time"

	"github.com/parche-app/backend/internal/events"
)

const (
	ReasonFollow  = "follow"
	ReasonGenre   = "genre"
	ReasonPopular = "popular"

	maxReturn      = 20
	maxStore       = 50
	candidateLimit = 500
	followWeight   = 3
	genreWeight    = 2
	cityWeight     = 1
	boughtPenalty  = 5
	citySpanDeg    = 0.5
	soldWindow     = 7 * 24 * time.Hour
)

// Candidate is a published upcoming event plus signals used to score.
type Candidate struct {
	Event    events.Event
	Artists  []string
	Sold7d   int
	Genres   []string
	Lat      float64
	Lng      float64
	StartsAt time.Time
}

// Item is one recommendation row (hydrate via events.Service.Get).
type Item struct {
	EventID string
	Reason  string
	Score   int
}

// Loader reads F12/F13/F16/F22 signals. Does not write.
type Loader interface {
	Candidates(ctx context.Context, now time.Time) ([]Candidate, error)
	FollowedArtistIDs(ctx context.Context, userID string) ([]string, error)
	PaidEventIDs(ctx context.Context, userID string) ([]string, error)
	UserIDs(ctx context.Context) ([]string, error)
}

// Table is the materialized event_recommendations store.
type Table interface {
	ReplaceUser(ctx context.Context, userID string, items []Item, at time.Time) error
	ListUser(ctx context.Context, userID string, limit int) ([]Item, error)
}
