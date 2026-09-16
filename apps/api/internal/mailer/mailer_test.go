package mailer

import (
	"context"
	"encoding/json"
	"net/smtp"
	"strings"
	"testing"

	"github.com/parche-app/backend/internal/broker"
	"github.com/parche-app/backend/internal/config"
)

func TestSanitizeDropsQRAndPassword(t *testing.T) {
	got := SanitizeVars(map[string]string{
		"reset_url":   "https://app/reset?token=abc",
		"password":    "secret",
		"qr_token":    "jws",
		"QR_TOKEN":    "jws2",
		"event_title": "Norte",
	})
	if _, ok := got["password"]; ok {
		t.Fatal("password leaked")
	}
	if _, ok := got["qr_token"]; ok {
		t.Fatal("qr_token leaked")
	}
	if _, ok := got["QR_TOKEN"]; ok {
		t.Fatal("QR_TOKEN leaked")
	}
	if got["reset_url"] == "" || got["event_title"] != "Norte" {
		t.Fatalf("%+v", got)
	}
}

func TestRenderPasswordReset(t *testing.T) {
	mail, ok := Render(Message{
		To:       "ada@example.com",
		Template: TemplatePasswordReset,
		Vars:     map[string]string{"reset_url": "https://app/reset?token=abc", "password": "nope"},
	})
	if !ok {
		t.Fatal("template")
	}
	if !strings.Contains(mail.Text, "https://app/reset?token=abc") {
		t.Fatalf("text=%s", mail.Text)
	}
	if strings.Contains(mail.Text, "nope") || strings.Contains(mail.HTML, "nope") {
		t.Fatal("password in body")
	}
	if mail.Subject == "" || !strings.Contains(mail.HTML, "https://app/reset?token=abc") {
		t.Fatalf("subject/html=%q %s", mail.Subject, mail.HTML)
	}
}

func TestKnownTemplates(t *testing.T) {
	for _, id := range []string{
		TemplatePasswordReset, TemplateEventInvite, TemplateEmailChange, TemplateTicketClaim,
		TemplateOrderPaid, TemplateOrderFailed, TemplateEventCancelled, TemplateArtistNewEvent,
		TemplateAdminDigest, TemplateAuthOTP,
	} {
		if !KnownTemplate(id) {
			t.Fatalf("missing %s", id)
		}
	}
}

func TestQueuePublishesEmailSend(t *testing.T) {
	pub := &capturePub{}
	box := NewMemoryOutbox()
	q := Queue{Pub: pub, Outbox: box}
	if err := q.Send(context.Background(), Message{
		To: "ada@example.com", ToUserID: "u1", Template: TemplatePasswordReset,
		Vars:           map[string]string{"reset_url": "https://x", "qr_token": "no"},
		IdempotencyKey: "k1",
	}); err != nil {
		t.Fatal(err)
	}
	if pub.subject != broker.SubjectEmailSend {
		t.Fatalf("subject=%s", pub.subject)
	}
	var msg Message
	if err := json.Unmarshal(pub.body, &msg); err != nil {
		t.Fatal(err)
	}
	if _, ok := msg.Vars["qr_token"]; ok {
		t.Fatal("queued qr_token")
	}
	inserted, err := box.Enqueue(context.Background(), Record{IdempotencyKey: "k1"})
	if err != nil || inserted {
		t.Fatalf("dup insert=%v %v", inserted, err)
	}
	if err := q.Send(context.Background(), Message{
		To: "ada@example.com", Template: TemplatePasswordReset, IdempotencyKey: "k1",
	}); err != nil {
		t.Fatal(err)
	}
	if pub.n != 1 {
		t.Fatalf("expected one publish, n=%d", pub.n)
	}
}

func TestConsumeIdempotentLogDriver(t *testing.T) {
	box := NewMemoryOutbox()
	_, _ = box.Enqueue(context.Background(), Record{
		ID: "e1", Template: TemplateOrderPaid, Status: StatusQueued, IdempotencyKey: "paid-1",
	})
	tr := &captureTransport{}
	payload, _ := json.Marshal(Message{
		To: "ada@example.com", Template: TemplateOrderPaid,
		Vars:           map[string]string{"event_title": "Norte", "app_origin": "http://localhost:3000"},
		IdempotencyKey: "paid-1",
	})
	if err := Consume(context.Background(), box, tr, payload); err != nil {
		t.Fatal(err)
	}
	if tr.n != 1 {
		t.Fatalf("deliver n=%d", tr.n)
	}
	rec, err := box.ByIdempotency(context.Background(), "paid-1")
	if err != nil || rec.Status != StatusSent {
		t.Fatalf("%+v %v", rec, err)
	}
	if err := Consume(context.Background(), box, tr, payload); err != nil {
		t.Fatal(err)
	}
	if tr.n != 1 {
		t.Fatalf("second deliver n=%d", tr.n)
	}
}

func TestNewTransportDefaultLog(t *testing.T) {
	tr, err := NewTransport(config.Config{}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := tr.(Log); !ok {
		t.Fatalf("%T", tr)
	}
	if _, err := NewTransport(config.Config{EmailDriver: "ses"}, nil); err == nil {
		t.Fatal("expected unknown driver")
	}
}

func TestSMTPUsesInjectedSendMail(t *testing.T) {
	var gotAddr string
	var gotAuth bool
	s := SMTP{
		Host: "mailhog", Port: "1025", From: "parche@localhost",
		SendMail: func(addr string, a smtp.Auth, from string, to []string, msg []byte) error {
			gotAddr = addr
			gotAuth = a != nil
			if !strings.Contains(string(msg), "Norte") {
				t.Fatalf("mime=%s", msg)
			}
			if from != "parche@localhost" || to[0] != "ada@example.com" {
				t.Fatalf("%s %v", from, to)
			}
			return nil
		},
	}
	mail, ok := Render(Message{To: "ada@example.com", Template: TemplateOrderPaid, Vars: map[string]string{"event_title": "Norte"}})
	if !ok {
		t.Fatal("render")
	}
	if err := s.Deliver(context.Background(), Message{To: "ada@example.com"}, mail); err != nil {
		t.Fatal(err)
	}
	if gotAddr != "mailhog:1025" || gotAuth {
		t.Fatalf("addr=%s auth=%v", gotAddr, gotAuth)
	}
}

func TestLogDriverDoesNotLogToken(t *testing.T) {
	msg := Message{
		To: "a@example.com", Template: TemplatePasswordReset,
		Vars: map[string]string{"reset_url": "https://app/reset?token=secret-token", "password": "x"},
	}
	if err := (Log{}).Send(context.Background(), msg); err != nil {
		t.Fatal(err)
	}
}

type capturePub struct {
	n       int
	subject string
	body    []byte
}

func (c *capturePub) Publish(_ context.Context, subject string, payload []byte) error {
	c.n++
	c.subject = subject
	c.body = append([]byte(nil), payload...)
	return nil
}

type captureTransport struct {
	n int
}

func (c *captureTransport) Deliver(_ context.Context, _ Message, _ Compiled) error {
	c.n++
	return nil
}
