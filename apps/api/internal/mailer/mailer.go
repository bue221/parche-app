package mailer

import (
	"context"
	"log/slog"
	"sync"
)

// Template IDs. SMTP delivery is F26; F05 uses password_reset, F14 email_change, F11 event_invite.
const (
	TemplatePasswordReset = "password_reset"
	TemplateEventInvite   = "event_invite"
	TemplateEmailChange   = "email_change"
)

// Message is the F26 Send contract. Vars must not include passwords.
type Message struct {
	To             string
	ToUserID       string
	Template       string
	Vars           map[string]string
	IdempotencyKey string
}

// Sender is the outbound email port. Handlers never talk to SMTP.
type Sender interface {
	Send(ctx context.Context, msg Message) error
}

// Log is the F26 stub: records intent without sending. Never logs tokens or passwords.
type Log struct {
	Logger *slog.Logger
}

func (l Log) Send(_ context.Context, msg Message) error {
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

// Memory records messages for tests.
type Memory struct {
	mu   sync.Mutex
	Msgs []Message
}

func (m *Memory) Send(_ context.Context, msg Message) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := msg
	if msg.Vars != nil {
		cp.Vars = make(map[string]string, len(msg.Vars))
		for k, v := range msg.Vars {
			cp.Vars[k] = v
		}
	}
	m.Msgs = append(m.Msgs, cp)
	return nil
}

// Last returns the most recent message.
func (m *Memory) Last() (Message, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(m.Msgs) == 0 {
		return Message{}, false
	}
	return m.Msgs[len(m.Msgs)-1], true
}

// Len is the number of queued messages.
func (m *Memory) Len() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.Msgs)
}
