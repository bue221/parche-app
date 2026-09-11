package editorial

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/parche-app/backend/internal/auth"
)

// Memory is an in-process Store for tests.
type Memory struct {
	mu     sync.Mutex
	byID   map[string]Post
	bySlug map[string]string
}

func NewMemory() *Memory {
	return &Memory{
		byID:   map[string]Post{},
		bySlug: map[string]string{},
	}
}

func (m *Memory) Create(_ context.Context, p Post) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.byID[p.ID]; ok {
		return auth.ErrConflict
	}
	if _, ok := m.bySlug[p.Slug]; ok {
		return auth.ErrConflict
	}
	m.byID[p.ID] = clonePost(p)
	m.bySlug[p.Slug] = p.ID
	return nil
}

func (m *Memory) ByID(_ context.Context, id string) (Post, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	p, ok := m.byID[id]
	if !ok {
		return Post{}, auth.ErrNotFound
	}
	return clonePost(p), nil
}

func (m *Memory) BySlug(_ context.Context, slug string) (Post, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	id, ok := m.bySlug[slug]
	if !ok {
		return Post{}, auth.ErrNotFound
	}
	return clonePost(m.byID[id]), nil
}

func (m *Memory) Update(_ context.Context, p Post) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cur, ok := m.byID[p.ID]
	if !ok {
		return auth.ErrNotFound
	}
	if cur.Slug != p.Slug {
		if other, ok := m.bySlug[p.Slug]; ok && other != p.ID {
			return auth.ErrConflict
		}
		delete(m.bySlug, cur.Slug)
		m.bySlug[p.Slug] = p.ID
	}
	p.CreatedAt = cur.CreatedAt
	p.AuthorID = cur.AuthorID
	m.byID[p.ID] = clonePost(p)
	return nil
}

func (m *Memory) ListPublished(_ context.Context, after time.Time, afterID string, limit int) ([]Post, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var items []Post
	for _, p := range m.byID {
		if p.Status != StatusPublished || p.PublishedAt == nil {
			continue
		}
		if !after.IsZero() || afterID != "" {
			ts := p.PublishedAt.UTC()
			if ts.After(after) {
				continue
			}
			if ts.Equal(after) && p.ID >= afterID {
				continue
			}
		}
		items = append(items, clonePost(p))
	}
	sort.Slice(items, func(i, j int) bool {
		ti := items[i].PublishedAt.UTC()
		tj := items[j].PublishedAt.UTC()
		if !ti.Equal(tj) {
			return ti.After(tj)
		}
		return items[i].ID > items[j].ID
	})
	if limit < 1 {
		limit = 20
	}
	if len(items) > limit {
		items = items[:limit]
	}
	if items == nil {
		items = []Post{}
	}
	return items, nil
}

func clonePost(p Post) Post {
	if p.PublishedAt != nil {
		t := p.PublishedAt.UTC()
		p.PublishedAt = &t
	}
	p.Cover = nil
	p.BodyHTML = ""
	return p
}
