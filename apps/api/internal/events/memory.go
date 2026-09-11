package events

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/parche-app/backend/internal/auth"
)

// Memory is an in-process Store for tests.
type Memory struct {
	mu      sync.Mutex
	byID    map[string]Event
	members map[string]Member // eventID+"/"+userID
	order   []string
}

func NewMemory() *Memory {
	return &Memory{byID: map[string]Event{}, members: map[string]Member{}}
}

func (m *Memory) Create(_ context.Context, e Event, ownerUserID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, cur := range m.byID {
		if cur.TenantID == e.TenantID && cur.Slug == e.Slug {
			return auth.ErrConflict
		}
	}
	now := time.Now().UTC()
	if e.CreatedAt.IsZero() {
		e.CreatedAt = now
	}
	e.UpdatedAt = now
	e.Genres = cloneGenres(e.Genres)
	m.byID[e.ID] = e
	m.order = append(m.order, e.ID)
	m.members[e.ID+"/"+ownerUserID] = Member{
		EventID: e.ID,
		UserID:  ownerUserID,
		Role:    RoleOwner,
		Status:  MemberActive,
	}
	return nil
}

func (m *Memory) ByID(_ context.Context, id string) (Event, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	e, ok := m.byID[id]
	if !ok {
		return Event{}, auth.ErrNotFound
	}
	return cloneEvent(e), nil
}

func (m *Memory) Update(_ context.Context, e Event) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cur, ok := m.byID[e.ID]
	if !ok {
		return auth.ErrNotFound
	}
	e.CreatedAt = cur.CreatedAt
	e.CreatedBy = cur.CreatedBy
	e.TenantID = cur.TenantID
	e.Slug = cur.Slug
	e.UpdatedAt = time.Now().UTC()
	e.Genres = cloneGenres(e.Genres)
	m.byID[e.ID] = e
	return nil
}

func (m *Memory) List(_ context.Context, f ListFilter) ([]Event, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	limit := f.Limit
	if limit < 1 {
		limit = 20
	}
	curStarts, curID, err := DecodeCursor(f.Cursor)
	if err != nil {
		return nil, err
	}
	items := make([]Event, 0, len(m.order))
	horizon := publicWindowStart(f.Now)
	for _, id := range m.order {
		e := m.byID[id]
		if f.Public {
			if e.Status != StatusPublished {
				continue
			}
			if !f.Now.IsZero() && e.StartsAt.Before(horizon) {
				continue
			}
		} else if f.TenantID != "" && e.TenantID != f.TenantID {
			continue
		}
		if f.BBox != nil && !f.BBox.Contains(e.Lat, e.Lng) {
			continue
		}
		if !afterCursor(e, curStarts, curID) {
			continue
		}
		items = append(items, cloneEvent(e))
	}
	sort.Slice(items, func(i, j int) bool {
		if !items[i].StartsAt.Equal(items[j].StartsAt) {
			return items[i].StartsAt.Before(items[j].StartsAt)
		}
		return items[i].ID < items[j].ID
	})
	if len(items) > limit {
		items = items[:limit]
	}
	return items, nil
}

func (m *Memory) Member(_ context.Context, eventID, userID string) (Member, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	mem, ok := m.members[eventID+"/"+userID]
	if !ok {
		return Member{}, auth.ErrNotFound
	}
	return mem, nil
}

func cloneEvent(e Event) Event {
	e.Genres = cloneGenres(e.Genres)
	return e
}
