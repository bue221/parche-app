package mailer

import (
	"context"
	"errors"
	"sync"
	"time"
)

// MemoryOutbox is the in-process email_messages store for tests.
type MemoryOutbox struct {
	mu    sync.Mutex
	byKey map[string]Record
}

func NewMemoryOutbox() *MemoryOutbox {
	return &MemoryOutbox{byKey: map[string]Record{}}
}

func (m *MemoryOutbox) Enqueue(_ context.Context, rec Record) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if rec.CreatedAt.IsZero() {
		rec.CreatedAt = time.Now().UTC()
	}
	if _, ok := m.byKey[rec.IdempotencyKey]; ok {
		return false, nil
	}
	m.byKey[rec.IdempotencyKey] = rec
	return true, nil
}

func (m *MemoryOutbox) ByIdempotency(_ context.Context, key string) (Record, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	rec, ok := m.byKey[key]
	if !ok {
		return Record{}, errors.New("email message not found")
	}
	return rec, nil
}

func (m *MemoryOutbox) MarkSent(_ context.Context, key, providerID string) error {
	return m.setStatus(key, StatusSent, providerID)
}

func (m *MemoryOutbox) MarkFailed(_ context.Context, key, providerID string) error {
	return m.setStatus(key, StatusFailed, providerID)
}

func (m *MemoryOutbox) setStatus(key, status, providerID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	rec, ok := m.byKey[key]
	if !ok {
		return errors.New("email message not found")
	}
	rec.Status = status
	rec.ProviderID = providerID
	m.byKey[key] = rec
	return nil
}
