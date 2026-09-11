package media

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
	intents map[string]Intent
	assets  map[string]Asset
	byKey   map[string]string
	tracks  map[string][]Track
}

func NewMemory() *Memory {
	return &Memory{
		intents: map[string]Intent{},
		assets:  map[string]Asset{},
		byKey:   map[string]string{},
		tracks:  map[string][]Track{},
	}
}

func (m *Memory) SaveIntent(_ context.Context, in Intent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.intents[in.Key] = in
	return nil
}

func (m *Memory) IntentByKey(_ context.Context, key string) (Intent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	in, ok := m.intents[key]
	if !ok {
		return Intent{}, auth.ErrNotFound
	}
	return in, nil
}

func (m *Memory) DeleteIntent(_ context.Context, key string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.intents, key)
	return nil
}

func (m *Memory) CreateAsset(_ context.Context, a Asset) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.assets[a.ID]; ok {
		return auth.ErrConflict
	}
	if _, ok := m.byKey[a.Key]; ok {
		return auth.ErrConflict
	}
	if a.CreatedAt.IsZero() {
		a.CreatedAt = time.Now().UTC()
	}
	m.assets[a.ID] = a
	m.byKey[a.Key] = a.ID
	return nil
}

func (m *Memory) AssetByID(_ context.Context, id string) (Asset, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.assets[id]
	if !ok {
		return Asset{}, auth.ErrNotFound
	}
	return a, nil
}

func (m *Memory) AssetByKey(_ context.Context, key string) (Asset, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	id, ok := m.byKey[key]
	if !ok {
		return Asset{}, auth.ErrNotFound
	}
	return m.assets[id], nil
}

func (m *Memory) UpdateAsset(_ context.Context, a Asset) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cur, ok := m.assets[a.ID]
	if !ok {
		return auth.ErrNotFound
	}
	if cur.Key != a.Key {
		delete(m.byKey, cur.Key)
		m.byKey[a.Key] = a.ID
	}
	a.CreatedAt = cur.CreatedAt
	a.CreatedBy = cur.CreatedBy
	m.assets[a.ID] = a
	return nil
}

func (m *Memory) DeleteAsset(_ context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.assets[id]
	if !ok {
		return auth.ErrNotFound
	}
	delete(m.assets, id)
	delete(m.byKey, a.Key)
	return nil
}

func (m *Memory) ListEventAssets(_ context.Context, eventID string) ([]Asset, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]Asset, 0)
	for _, a := range m.assets {
		if a.OwnerType == OwnerEvent && a.OwnerID == eventID {
			out = append(out, a)
		}
	}
	return out, nil
}

func (m *Memory) ReplaceTracks(_ context.Context, eventID string, tracks []Track) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := make([]Track, len(tracks))
	copy(cp, tracks)
	sort.Slice(cp, func(i, j int) bool { return cp[i].Position < cp[j].Position })
	m.tracks[eventID] = cp
	return nil
}

func (m *Memory) ListTracks(_ context.Context, eventID string) ([]Track, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	src := m.tracks[eventID]
	out := make([]Track, len(src))
	copy(out, src)
	return out, nil
}

func (m *Memory) TrackByID(_ context.Context, eventID, trackID string) (Track, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, tr := range m.tracks[eventID] {
		if tr.ID == trackID {
			return tr, nil
		}
	}
	return Track{}, auth.ErrNotFound
}

func (m *Memory) AssetInTracks(_ context.Context, assetID string) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, list := range m.tracks {
		for _, tr := range list {
			if tr.AssetID == assetID {
				return true, nil
			}
		}
	}
	return false, nil
}
