package venues

import (
	"context"
	"strings"
	"sync"
	"time"

	"github.com/parche-app/backend/internal/auth"
)

// Memory is an in-process Store for tests.
type Memory struct {
	mu    sync.Mutex
	byID  map[string]Venue
	order []string
}

func NewMemory() *Memory {
	return &Memory{byID: map[string]Venue{}}
}

func (m *Memory) Create(_ context.Context, v Venue) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if v.CreatedAt.IsZero() {
		v.CreatedAt = time.Now().UTC()
	}
	if v.Source == "" {
		v.Source = SourceUserPin
	}
	m.byID[v.ID] = v
	m.order = append(m.order, v.ID)
	return nil
}

func (m *Memory) ByID(_ context.Context, id string) (Venue, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	v, ok := m.byID[id]
	if !ok {
		return Venue{}, auth.ErrNotFound
	}
	return cloneVenue(v), nil
}

func (m *Memory) Update(_ context.Context, v Venue) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cur, ok := m.byID[v.ID]
	if !ok {
		return auth.ErrNotFound
	}
	v.CreatedAt = cur.CreatedAt
	v.PublishedUses = cur.PublishedUses
	v.TenantID = cur.TenantID
	v.Source = SourceUserPin
	m.byID[v.ID] = v
	return nil
}

func (m *Memory) List(_ context.Context, f ListFilter) ([]Venue, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	q := likeContains(f.Q)
	limit := f.Limit
	if limit < 1 {
		limit = 20
	}
	out := make([]Venue, 0)
	seenCursor := f.Cursor == ""
	for i := len(m.order) - 1; i >= 0; i-- {
		v := m.byID[m.order[i]]
		if !seenCursor {
			if v.ID == f.Cursor {
				seenCursor = true
			}
			continue
		}
		if f.TenantID != "" {
			if v.TenantID != f.TenantID {
				continue
			}
		} else if v.PublishedUses <= 0 {
			continue
		}
		if q != "" {
			blob := strings.ToLower(v.Name + " " + v.AddressText)
			if !strings.Contains(blob, q) {
				continue
			}
		}
		if f.BBox != nil && !f.BBox.Contains(v.Lat, v.Lng) {
			continue
		}
		out = append(out, cloneVenue(v))
		if len(out) >= limit {
			break
		}
	}
	return out, nil
}

func (m *Memory) AdjustPublishedUses(_ context.Context, id string, delta int) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	v, ok := m.byID[id]
	if !ok {
		return auth.ErrNotFound
	}
	n := v.PublishedUses + delta
	if n < 0 {
		n = 0
	}
	v.PublishedUses = n
	m.byID[id] = v
	return nil
}

func cloneVenue(v Venue) Venue {
	if v.GeoJSON != nil {
		cp := make([]byte, len(v.GeoJSON))
		copy(cp, v.GeoJSON)
		v.GeoJSON = cp
	}
	return v
}
