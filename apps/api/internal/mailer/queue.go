package mailer

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/parche-app/backend/internal/broker"
)

// Publisher is NATS (or a test fake).
type Publisher interface {
	Publish(ctx context.Context, subject string, payload []byte) error
}

// Outbox persists email_messages for idempotent delivery.
type Outbox interface {
	Enqueue(ctx context.Context, rec Record) (inserted bool, err error)
	ByIdempotency(ctx context.Context, key string) (Record, error)
	MarkSent(ctx context.Context, key, providerID string) error
	MarkFailed(ctx context.Context, key, providerID string) error
}

// Record is one email_messages row.
type Record struct {
	ID             string
	Template       string
	ToUserID       string
	Status         string
	ProviderID     string
	IdempotencyKey string
	CreatedAt      time.Time
}

const (
	StatusQueued = "queued"
	StatusSent   = "sent"
	StatusFailed = "failed"
)

// Queue is the API-side Sender: outbox + email.send. No SMTP here.
type Queue struct {
	Pub    Publisher
	Outbox Outbox
}

func (q Queue) Send(ctx context.Context, msg Message) error {
	if q.Pub == nil {
		return fmt.Errorf("email publisher is nil")
	}
	msg = prepare(msg)
	if strings.TrimSpace(msg.To) == "" {
		return fmt.Errorf("email to is empty")
	}
	if !KnownTemplate(msg.Template) {
		return fmt.Errorf("unknown email template %q", msg.Template)
	}
	rec := Record{
		ID:             uuid.NewString(),
		Template:       msg.Template,
		ToUserID:       msg.ToUserID,
		Status:         StatusQueued,
		IdempotencyKey: msg.IdempotencyKey,
		CreatedAt:      time.Now().UTC(),
	}
	if q.Outbox != nil {
		inserted, err := q.Outbox.Enqueue(ctx, rec)
		if err != nil {
			return err
		}
		if !inserted {
			return nil
		}
	}
	body, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	return q.Pub.Publish(ctx, broker.SubjectEmailSend, body)
}

// Consume is the email.send worker: render + transport. Idempotent on idempotency_key.
func Consume(ctx context.Context, box Outbox, tr Transport, payload []byte) error {
	if tr == nil {
		return fmt.Errorf("email transport is nil")
	}
	var msg Message
	if err := json.Unmarshal(payload, &msg); err != nil {
		return err
	}
	msg = prepare(msg)
	if strings.TrimSpace(msg.To) == "" {
		return nil
	}
	if box != nil && strings.TrimSpace(msg.IdempotencyKey) != "" {
		if rec, err := box.ByIdempotency(ctx, msg.IdempotencyKey); err == nil && rec.Status == StatusSent {
			return nil
		}
	}
	mail, ok := Render(msg)
	if !ok {
		if box != nil && msg.IdempotencyKey != "" {
			_ = box.MarkFailed(ctx, msg.IdempotencyKey, "unknown_template")
		}
		return nil
	}
	if err := tr.Deliver(ctx, msg, mail); err != nil {
		if box != nil && msg.IdempotencyKey != "" {
			_ = box.MarkFailed(ctx, msg.IdempotencyKey, "")
		}
		return err
	}
	if box != nil && msg.IdempotencyKey != "" {
		return box.MarkSent(ctx, msg.IdempotencyKey, "smtp")
	}
	return nil
}
