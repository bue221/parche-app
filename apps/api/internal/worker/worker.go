package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/parche-app/backend/internal/broker"
	"github.com/parche-app/backend/internal/events"
)

const streamName = "PARCHE"

// Handlers are feature processors. Nil handlers ACK after logging (idle).
type Handlers struct {
	MediaProcess func(ctx context.Context, assetID string) error
	ExpireOrders func(ctx context.Context) (int, error)
	TicketUsed   func(ctx context.Context, job events.TicketScanJob) error
	RefreshRecs  func(ctx context.Context) (int, error)
	EmailSend    func(ctx context.Context, payload []byte) error
}

// Run subscribes to product subjects and idles until ctx is cancelled.
// ACK only after the handler returns nil (later features persist then ACK).
func Run(ctx context.Context, js nats.JetStreamContext, log *slog.Logger, h Handlers) error {
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
			handle(ctx, log, h, msg)
		},
			nats.Durable(durable),
			nats.ManualAck(),
			nats.BindStream(streamName),
			nats.MaxDeliver(8),
			nats.AckWait(3*time.Minute),
		)
		if err != nil {
			return fmt.Errorf("subscribe %s: %w", subject, err)
		}
		subs = append(subs, sub)
		log.Info("worker subscribed", "subject", subject, "durable", durable)
	}

	if h.ExpireOrders != nil {
		go expireLoop(ctx, log, h.ExpireOrders)
	}
	if h.RefreshRecs != nil {
		go recsLoop(ctx, log, h.RefreshRecs)
	}

	log.Info("worker idle")
	<-ctx.Done()

	for _, sub := range subs {
		_ = sub.Drain()
	}
	return nil
}

func handle(ctx context.Context, log *slog.Logger, h Handlers, msg *nats.Msg) {
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
	if err := dispatch(ctx, h, msg); err != nil {
		log.Error("worker handler failed", "subject", msg.Subject, "err", err)
		_ = msg.Nak()
		return
	}
	if err := msg.Ack(); err != nil {
		log.Error("worker ack failed", "subject", msg.Subject, "err", err)
	}
}

func dispatch(ctx context.Context, h Handlers, msg *nats.Msg) error {
	switch msg.Subject {
	case broker.SubjectMediaProcess:
		if h.MediaProcess == nil {
			return nil
		}
		var body struct {
			AssetID string `json:"asset_id"`
		}
		if err := json.Unmarshal(msg.Data, &body); err != nil {
			return err
		}
		if strings.TrimSpace(body.AssetID) == "" {
			return nil
		}
		return h.MediaProcess(ctx, body.AssetID)
	case broker.SubjectTicketUsed:
		if h.TicketUsed == nil {
			return nil
		}
		var job events.TicketScanJob
		if err := json.Unmarshal(msg.Data, &job); err != nil {
			return err
		}
		return h.TicketUsed(ctx, job)
	case broker.SubjectRecsRefresh:
		if h.RefreshRecs == nil {
			return nil
		}
		_, err := h.RefreshRecs(ctx)
		return err
	case broker.SubjectEmailSend:
		if h.EmailSend == nil {
			return nil
		}
		return h.EmailSend(ctx, msg.Data)
	default:
		return nil
	}
}

func expireLoop(ctx context.Context, log *slog.Logger, expire func(context.Context) (int, error)) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	run := func() {
		n, err := expire(ctx)
		if err != nil {
			log.Error("order.expire failed", "err", err)
			return
		}
		if n > 0 {
			log.Info("order.expire", "released", n)
		}
	}
	run()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			run()
		}
	}
}

func recsLoop(ctx context.Context, log *slog.Logger, refresh func(context.Context) (int, error)) {
	ticker := time.NewTicker(15 * time.Minute)
	defer ticker.Stop()
	run := func() {
		n, err := refresh(ctx)
		if err != nil {
			log.Error("recs.refresh failed", "err", err)
			return
		}
		log.Info("recs.refresh", "users", n)
	}
	run()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			run()
		}
	}
}

func durableName(subject string) string {
	return "parche-" + strings.ReplaceAll(subject, ".", "-")
}

func isStreamNameExists(err error) bool {
	return err != nil && (strings.Contains(err.Error(), "stream name already in use") ||
		strings.Contains(strings.ToLower(err.Error()), "already exists"))
}
