package admin

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Entry is one redacted admin_audit row. Payload must not include emails or secrets.
type Entry struct {
	AdminID    string
	Action     string
	TargetType string
	TargetID   string
	Payload    map[string]string
	At         time.Time
}

// Auditor persists F27 admin_audit.
type Auditor interface {
	Append(ctx context.Context, e Entry) error
}

// Memory is an in-process audit log for tests.
type Memory struct {
	mu      sync.Mutex
	Entries []Entry
}

func (m *Memory) Append(_ context.Context, e Entry) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if e.At.IsZero() {
		e.At = time.Now().UTC()
	}
	m.Entries = append(m.Entries, e)
	return nil
}

// PG writes admin_audit.
type PG struct {
	Pool *pgxpool.Pool
}

func (p PG) Append(ctx context.Context, e Entry) error {
	if p.Pool == nil {
		return nil
	}
	id, err := uuid.NewV7()
	if err != nil {
		id = uuid.New()
	}
	if e.At.IsZero() {
		e.At = time.Now().UTC()
	}
	payload := e.Payload
	if payload == nil {
		payload = map[string]string{}
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = p.Pool.Exec(ctx, `
		INSERT INTO admin_audit (id, admin_id, action, target_type, target_id, payload, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		id.String(), e.AdminID, e.Action, e.TargetType, e.TargetID, raw, e.At)
	return err
}
