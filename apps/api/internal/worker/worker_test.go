package worker

import (
	"context"
	"strings"
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
	if len(broker.Subjects()) != 5 {
		t.Fatalf("expected 5 product subjects, got %d", len(broker.Subjects()))
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

func TestDispatchRecsRefresh(t *testing.T) {
	called := false
	err := dispatch(context.Background(), Handlers{
		RefreshRecs: func(_ context.Context) (int, error) {
			called = true
			return 3, nil
		},
	}, &nats.Msg{
		Subject: broker.SubjectRecsRefresh,
		Data:    []byte(`{}`),
	})
	if err != nil {
		t.Fatal(err)
	}
	if !called {
		t.Fatal("expected recs.refresh handler")
	}
}

func TestDispatchEmailSend(t *testing.T) {
	var got []byte
	err := dispatch(context.Background(), Handlers{
		EmailSend: func(_ context.Context, payload []byte) error {
			got = payload
			return nil
		},
	}, &nats.Msg{
		Subject: broker.SubjectEmailSend,
		Data:    []byte(`{"template":"password_reset","to":"a@example.com"}`),
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(got), "password_reset") {
		t.Fatalf("%s", got)
	}
}
