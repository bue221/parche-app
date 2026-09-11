package mailer

import (
	"context"
	"log/slog"
	"strings"
	"sync"

	"github.com/google/uuid"
)

// Template IDs from backend/emails. Handlers never talk to SMTP.
const (
	TemplatePasswordReset  = "password_reset"
	TemplateEventInvite    = "event_invite"
	TemplateEmailChange    = "email_change"
	TemplateTicketClaim    = "ticket_claim"
	TemplateOrderPaid      = "order_paid"
	TemplateOrderFailed    = "order_failed"
	TemplateEventCancelled = "event_cancelled"
	TemplateArtistNewEvent = "artist_new_event"
	TemplateAdminDigest    = "admin_digest"
	TemplateEventRejected  = "event_rejected"
)

// Message is the F26 Send contract. Vars must not include passwords or QR tokens.
type Message struct {
	To             string            `json:"to"`
	ToUserID       string            `json:"to_user_id,omitempty"`
	Template       string            `json:"template"`
	Vars           map[string]string `json:"vars,omitempty"`
	IdempotencyKey string            `json:"idempotency_key"`
}

// Sender is the outbound email port. Handlers enqueue through this; the worker delivers.
type Sender interface {
	Send(ctx context.Context, msg Message) error
}

// Transport delivers a compiled message. Used by the email.send worker.
type Transport interface {
	Deliver(ctx context.Context, msg Message, mail Compiled) error
}

// Log records intent without SMTP. Default EMAIL_DRIVER=log (tests and safe compose).
type Log struct {
	Logger *slog.Logger
}

func (l Log) Send(_ context.Context, msg Message) error {
	msg = prepare(msg)
	if l.Logger == nil {
		return nil
	}
	l.Logger.Info("email.send",
		"template", msg.Template,
		"to_user_id", msg.ToUserID,
		"idempotency_key", msg.IdempotencyKey,
	)
	return nil
}

func (l Log) Deliver(_ context.Context, msg Message, mail Compiled) error {
	if l.Logger == nil {
		return nil
	}
	l.Logger.Info("email.delivered",
		"template", msg.Template,
		"to_user_id", msg.ToUserID,
		"idempotency_key", msg.IdempotencyKey,
		"subject", mail.Subject,
	)
	return nil
}

// Memory records messages for tests.
type Memory struct {
	mu   sync.Mutex
	Msgs []Message
}

func (m *Memory) Send(_ context.Context, msg Message) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Msgs = append(m.Msgs, copyMessage(prepare(msg)))
	return nil
}

// All returns a copy of queued messages.
func (m *Memory) All() []Message {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]Message, len(m.Msgs))
	for i, msg := range m.Msgs {
		out[i] = copyMessage(msg)
	}
	return out
}

// Last returns the most recent message.
func (m *Memory) Last() (Message, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(m.Msgs) == 0 {
		return Message{}, false
	}
	return copyMessage(m.Msgs[len(m.Msgs)-1]), true
}

// Len is the number of queued messages.
func (m *Memory) Len() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.Msgs)
}

func prepare(msg Message) Message {
	msg.Vars = SanitizeVars(msg.Vars)
	if strings.TrimSpace(msg.IdempotencyKey) == "" {
		msg.IdempotencyKey = uuid.NewString()
	}
	return msg
}

func copyMessage(msg Message) Message {
	cp := msg
	if msg.Vars != nil {
		cp.Vars = make(map[string]string, len(msg.Vars))
		for k, v := range msg.Vars {
			cp.Vars[k] = v
		}
	}
	return cp
}
