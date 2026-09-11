package recs

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/parche-app/backend/internal/events"
)

// Memory is an in-process Loader+Table for tests.
type Memory struct {
	mu      sync.Mutex
	cands   []Candidate
	follows map[string][]string
	paid    map[string][]string
	users   []string
	rows    map[string][]Item
}

func NewMemory() *Memory {
	return &Memory{
		follows: map[string][]string{},
		paid:    map[string][]string{},
		rows:    map[string][]Item{},
	}
}

func (m *Memory) SetCandidates(c []Candidate) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.cands = append([]Candidate(nil), c...)
}

func (m *Memory) SetFollows(userID string, artistIDs []string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.follows[userID] = append([]string(nil), artistIDs...)
	m.touchUser(userID)
}

func (m *Memory) SetPaid(userID string, eventIDs []string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.paid[userID] = append([]string(nil), eventIDs...)
	m.touchUser(userID)
}

func (m *Memory) touchUser(userID string) {
	for _, id := range m.users {
		if id == userID {
			return
		}
	}
	m.users = append(m.users, userID)
}

func (m *Memory) Candidates(_ context.Context, _ time.Time) ([]Candidate, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return append([]Candidate(nil), m.cands...), nil
}

func (m *Memory) FollowedArtistIDs(_ context.Context, userID string) ([]string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return append([]string(nil), m.follows[userID]...), nil
}

func (m *Memory) PaidEventIDs(_ context.Context, userID string) ([]string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return append([]string(nil), m.paid[userID]...), nil
}

func (m *Memory) UserIDs(_ context.Context) ([]string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return append([]string(nil), m.users...), nil
}

func (m *Memory) ReplaceUser(_ context.Context, userID string, items []Item, _ time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := make([]Item, len(items))
	copy(cp, items)
	m.rows[userID] = cp
	return nil
}

func (m *Memory) ListUser(_ context.Context, userID string, limit int) ([]Item, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	rows := m.rows[userID]
	if len(rows) == 0 {
		return []Item{}, nil
	}
	if limit > 0 && len(rows) > limit {
		rows = rows[:limit]
	}
	out := make([]Item, len(rows))
	copy(out, rows)
	sort.SliceStable(out, func(i, j int) bool { return out[i].Score > out[j].Score })
	return out, nil
}

func cand(id, genre, artist string, sold int, lat, lng float64, start time.Time) Candidate {
	e := events.Event{
		ID:       id,
		Title:    id,
		Status:   events.StatusPublished,
		Genres:   []string{genre},
		Lat:      lat,
		Lng:      lng,
		StartsAt: start,
	}
	artists := []string{}
	if artist != "" {
		artists = []string{artist}
	}
	return Candidate{Event: e, Artists: artists, Sold7d: sold, Genres: e.Genres, Lat: lat, Lng: lng, StartsAt: start}
}
