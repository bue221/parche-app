package worker

import (
	"testing"

	"github.com/parche-app/backend/internal/broker"
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
