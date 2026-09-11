package broker

import (
	"context"
	"fmt"
	"time"

	"github.com/nats-io/nats.go"
)

const (
	SubjectTicketUsed       = "ticket.used"
	SubjectPaymentConfirmed = "payment.confirmed"
	SubjectEmailSend        = "email.send"
	SubjectMediaProcess     = "media.process"
	SubjectDLQ              = "parche.dlq"
)

// Subjects the worker must subscribe to from day one (handlers may be idle).
func Subjects() []string {
	return []string{
		SubjectTicketUsed,
		SubjectPaymentConfirmed,
		SubjectEmailSend,
		SubjectMediaProcess,
	}
}

// Publisher publishes JetStream messages. media.Service uses this port.
type Publisher struct {
	JS nats.JetStreamContext
}

func (p Publisher) Publish(_ context.Context, subject string, payload []byte) error {
	if p.JS == nil {
		return fmt.Errorf("jetstream is nil")
	}
	_, err := p.JS.Publish(subject, payload)
	return err
}

// Connect opens NATS and JetStream.
func Connect(brokerURL string) (*nats.Conn, nats.JetStreamContext, error) {
	if brokerURL == "" {
		return nil, nil, fmt.Errorf("BROKER_URL is required")
	}
	nc, err := nats.Connect(brokerURL,
		nats.Name("parche"),
		nats.Timeout(5*time.Second),
		nats.RetryOnFailedConnect(true),
		nats.MaxReconnects(-1),
	)
	if err != nil {
		return nil, nil, fmt.Errorf("nats connect: %w", err)
	}
	js, err := nc.JetStream()
	if err != nil {
		nc.Close()
		return nil, nil, fmt.Errorf("jetstream: %w", err)
	}
	return nc, js, nil
}
