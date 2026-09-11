package worker

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/parche-app/backend/internal/broker"
)

const streamName = "PARCHE"

// Run subscribes to product subjects and idles until ctx is cancelled.
// ACK only after the handler returns nil (later features persist then ACK).
func Run(ctx context.Context, js nats.JetStreamContext, log *slog.Logger) error {
	if _, err := js.AddStream(&nats.StreamConfig{
		Name:      streamName,
		Subjects:  append(broker.Subjects(), broker.SubjectDLQ),
		Retention: nats.LimitsPolicy,
		Storage:   nats.FileStorage,
	}); err != nil && !strings.Contains(err.Error(), "already in use") && !isStreamNameExists(err) {
		return fmt.Errorf("ensure stream: %w", err)
	}

	var subs []*nats.Subscription
	for _, subject := range broker.Subjects() {
		durable := durableName(subject)
		sub, err := js.Subscribe(subject, func(msg *nats.Msg) {
			handle(ctx, log, msg)
		},
			nats.Durable(durable),
			nats.ManualAck(),
			nats.BindStream(streamName),
			nats.MaxDeliver(8),
			nats.AckWait(30*time.Second),
		)
		if err != nil {
			return fmt.Errorf("subscribe %s: %w", subject, err)
		}
		subs = append(subs, sub)
		log.Info("worker subscribed", "subject", subject, "durable", durable)
	}

	log.Info("worker idle")
	<-ctx.Done()

	for _, sub := range subs {
		_ = sub.Drain()
	}
	return nil
}

func handle(ctx context.Context, log *slog.Logger, msg *nats.Msg) {
	if ctx.Err() != nil {
		_ = msg.Nak()
		return
	}
	meta, _ := msg.Metadata()
	msgID := ""
	if meta != nil {
		msgID = fmt.Sprintf("%d.%d", meta.Sequence.Stream, meta.Sequence.Consumer)
	}
	log.Info("worker message",
		"subject", msg.Subject,
		"msg_id", msgID,
		"request_id", msg.Header.Get("X-Request-Id"),
	)
	if err := msg.Ack(); err != nil {
		log.Error("worker ack failed", "subject", msg.Subject, "err", err)
	}
}

func durableName(subject string) string {
	return "parche-" + strings.ReplaceAll(subject, ".", "-")
}

func isStreamNameExists(err error) bool {
	return err != nil && (strings.Contains(err.Error(), "stream name already in use") ||
		strings.Contains(strings.ToLower(err.Error()), "already exists"))
}
