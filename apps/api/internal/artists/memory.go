package artists

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
	byID    map[string]Artist
	byUser  map[string]string
	slots   map[string]Slot // eventID+"/"+artistID
	follows map[string]Follow
}

func NewMemory() *Memory {
	return &Memory{
		byID:    map[string]Artist{},
		byUser:  map[string]string{},
		slots:   map[string]Slot{},
		follows: map[string]Follow{},
	}
}

func (m *Memory) Create(_ context.Context, a Artist) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.byID[a.ID]; ok {
		return auth.ErrConflict
	}
	if a.UserID != "" {
		if _, ok := m.byUser[a.UserID]; ok {
			return auth.ErrConflict
		}
		m.byUser[a.UserID] = a.ID
	}
	now := time.Now().UTC()
	if a.CreatedAt.IsZero() {
		a.CreatedAt = now
	}
	a.UpdatedAt = now
	m.byID[a.ID] = cloneArtist(a)
	return nil
}

func (m *Memory) ByID(_ context.Context, id string) (Artist, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.byID[id]
	if !ok {
		return Artist{}, auth.ErrNotFound
	}
	return cloneArtist(a), nil
}

func (m *Memory) ByUserID(_ context.Context, userID string) (Artist, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	id, ok := m.byUser[userID]
	if !ok {
		return Artist{}, auth.ErrNotFound
	}
	return cloneArtist(m.byID[id]), nil
}

func (m *Memory) Update(_ context.Context, a Artist) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cur, ok := m.byID[a.ID]
	if !ok {
		return auth.ErrNotFound
	}
	a.CreatedAt = cur.CreatedAt
	a.UserID = cur.UserID
	a.TenantID = cur.TenantID
	a.UpdatedAt = time.Now().UTC()
	m.byID[a.ID] = cloneArtist(a)
	return nil
}

func (m *Memory) AddSlot(_ context.Context, sl Slot) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := sl.EventID + "/" + sl.ArtistID
	if _, ok := m.slots[key]; ok {
		return auth.ErrConflict
	}
	if _, ok := m.byID[sl.ArtistID]; !ok {
		return auth.ErrNotFound
	}
	m.slots[key] = sl
	return nil
}

func (m *Memory) RemoveSlot(_ context.Context, eventID, artistID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.slots, eventID+"/"+artistID)
	return nil
}

func (m *Memory) SlotsByEvent(_ context.Context, eventID string) ([]Slot, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []Slot
	for _, sl := range m.slots {
		if sl.EventID == eventID {
			out = append(out, sl)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].BillingOrder != out[j].BillingOrder {
			return out[i].BillingOrder < out[j].BillingOrder
		}
		return out[i].ArtistID < out[j].ArtistID
	})
	return out, nil
}

func (m *Memory) SlotsByArtist(_ context.Context, artistID string) ([]Slot, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []Slot
	for _, sl := range m.slots {
		if sl.ArtistID == artistID {
			out = append(out, sl)
		}
	}
	return out, nil
}

func (m *Memory) Follow(_ context.Context, f Follow) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.byID[f.ArtistID]; !ok {
		return auth.ErrNotFound
	}
	key := followKey(f.UserID, f.ArtistID)
	if _, ok := m.follows[key]; ok {
		return nil
	}
	if f.CreatedAt.IsZero() {
		f.CreatedAt = time.Now().UTC()
	}
	m.follows[key] = f
	return nil
}

func (m *Memory) Unfollow(_ context.Context, userID, artistID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.follows, followKey(userID, artistID))
	return nil
}

func (m *Memory) CountFollowers(_ context.Context, artistID string) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	n := 0
	for _, f := range m.follows {
		if f.ArtistID == artistID {
			n++
		}
	}
	return n, nil
}

func (m *Memory) FollowsByUser(_ context.Context, userID string) ([]Follow, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []Follow
	for _, f := range m.follows {
		if f.UserID == userID {
			out = append(out, f)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if !out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].CreatedAt.After(out[j].CreatedAt)
		}
		return out[i].ArtistID > out[j].ArtistID
	})
	if out == nil {
		out = []Follow{}
	}
	return out, nil
}

func (m *Memory) FollowsByArtist(_ context.Context, artistID string) ([]Follow, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []Follow
	for _, f := range m.follows {
		if f.ArtistID == artistID {
			out = append(out, f)
		}
	}
	if out == nil {
		out = []Follow{}
	}
	return out, nil
}

func followKey(userID, artistID string) string {
	return userID + "/" + artistID
}

func cloneArtist(a Artist) Artist {
	return a
}
