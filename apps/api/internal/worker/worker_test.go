package worker

import (
	"context"
	"testing"

	"github.com/nats-io/nats.go"
	"github.com/parche-app/backend/internal/broker"
	"github.com/parche-app/backend/internal/events"
)

func TestDurableName(t *testing.T) {
	got := durableName(broker.SubjectTicketUsed)
	if got != "parche-ticket-used" {
		t.Fatalf("got %q", got)
	}
}

func TestSubjectsCoverIdleLoop(t *testing.T) {
	if len(broker.Subjects()) != 4 {
		t.Fatalf("expected 4 product subjects, got %d", len(broker.Subjects()))
	}
}

func TestDispatchTicketUsed(t *testing.T) {
	var got events.TicketScanJob
	err := dispatch(context.Background(), Handlers{
		TicketUsed: func(_ context.Context, job events.TicketScanJob) error {
			got = job
			return nil
		},
	}, &nats.Msg{
		Subject: broker.SubjectTicketUsed,
		Data:    []byte(`{"ticket_id":"t1","event_id":"e1","scanner_user_id":"s1","result":"approved"}`),
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.TicketID != "t1" || got.EventID != "e1" || got.Result != events.ScanApproved {
		t.Fatalf("%+v", got)
	}
}
