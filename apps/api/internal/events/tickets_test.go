package events

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/mailer"
	"github.com/parche-app/backend/internal/venues"
)

func TestTicketTypesCatalogPauseAndPublicFilter(t *testing.T) {
	ctx, svc, mail, owner, _, eventID := memberFixture(t)
	door := mustUser(t, svc.Tenancy.(*auth.Memory), "door-tix@example.com", auth.ProfileAttendee)
	acceptRole(t, svc, mail, owner, eventID, door, RoleDoor)

	if _, err := svc.PutTicketTypes(ctx, door, eventID, []TicketTypeInput{
		{Name: "Early", PriceCents: 50000, Capacity: 10, Status: TicketOnSale},
	}); !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("door put=%v", err)
	}

	_, err := svc.PutTicketTypes(ctx, owner, eventID, []TicketTypeInput{
		{Name: "Early", PriceCents: -1, Capacity: 10, Status: TicketDraft},
	})
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("negative price=%v", err)
	}

	_, err = svc.PutTicketTypes(ctx, owner, eventID, []TicketTypeInput{
		{Name: "Early", PriceCents: 50000, Capacity: 0, Status: TicketDraft},
	})
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("capacity 0=%v", err)
	}

	created, err := svc.PutTicketTypes(ctx, owner, eventID, []TicketTypeInput{
		{Name: "Early", PriceCents: 50000, Capacity: 40, Status: TicketDraft},
		{Name: "Door", PriceCents: 80000, Capacity: 60, Status: TicketOnSale},
	})
	if err != nil || len(created) != 2 {
		t.Fatalf("create=%d %v", len(created), err)
	}
	var early, doorTix TicketType
	for _, tix := range created {
		switch tix.Name {
		case "Early":
			early = tix
		case "Door":
			doorTix = tix
		}
	}
	if early.Currency != "COP" || early.SoldCount != 0 {
		t.Fatalf("early=%+v", early)
	}

	paused, err := svc.PutTicketTypes(ctx, owner, eventID, []TicketTypeInput{
		{ID: early.ID, Name: "Early", PriceCents: 50000, Capacity: 40, Status: TicketPaused},
		{ID: doorTix.ID, Name: "Door", PriceCents: 80000, Capacity: 60, Status: TicketOnSale},
	})
	if err != nil {
		t.Fatal(err)
	}
	if statusOf(paused, early.ID) != TicketPaused {
		t.Fatalf("pause=%+v", paused)
	}

	ev, err := svc.Store.ByID(ctx, eventID)
	if err != nil {
		t.Fatal(err)
	}
	ev.Status = StatusPublished
	if err := svc.Store.Update(ctx, ev); err != nil {
		t.Fatal(err)
	}

	public, err := svc.ListTicketTypes(ctx, "", eventID)
	if err != nil || len(public) != 1 || public[0].Name != "Door" {
		t.Fatalf("public=%+v %v", public, err)
	}

	staff, err := svc.ListTicketTypes(ctx, owner, eventID)
	if err != nil || len(staff) != 2 {
		t.Fatalf("staff=%d %v", len(staff), err)
	}
	doorView, err := svc.ListTicketTypes(ctx, door, eventID)
	if err != nil || len(doorView) != 2 {
		t.Fatalf("door member list=%d %v", len(doorView), err)
	}

	mem, ok := svc.Store.(*Memory)
	if !ok {
		t.Fatal("memory store")
	}
	if err := mem.ForceTicketCounts(doorTix.ID, 10, 2); err != nil {
		t.Fatal(err)
	}
	_, err = svc.PutTicketTypes(ctx, owner, eventID, []TicketTypeInput{
		{ID: early.ID, Name: "Early", PriceCents: 50000, Capacity: 40, Status: TicketPaused},
		{ID: doorTix.ID, Name: "Door", PriceCents: 80000, Capacity: 11, Status: TicketOnSale},
	})
	if !errors.Is(err, auth.ErrConflict) {
		t.Fatalf("capacity below sold+reserved=%v", err)
	}

	left, err := svc.PutTicketTypes(ctx, owner, eventID, []TicketTypeInput{
		{ID: doorTix.ID, Name: "Door", PriceCents: 80000, Capacity: 60, Status: TicketOnSale},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(left) != 1 || left[0].ID != doorTix.ID {
		t.Fatalf("omitted unsold should delete: %+v", left)
	}

	if err := mem.ForceTicketCounts(doorTix.ID, 3, 0); err != nil {
		t.Fatal(err)
	}
	archived, err := svc.PutTicketTypes(ctx, owner, eventID, nil)
	if err != nil || len(archived) != 1 || archived[0].Status != TicketArchived {
		t.Fatalf("omit sold archives=%+v %v", archived, err)
	}
}

func TestTicketTypesHiddenOnUnpublished(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, 9, 11, 18, 0, 0, 0, time.UTC)
	authStore := auth.NewMemory()
	vmem := venues.NewMemory()
	vsvc := venues.NewService(vmem, authStore)
	svc := NewService(NewMemory(), authStore, vsvc, vmem, NewMemoryCache())
	svc.Now = func() time.Time { return now }
	svc.Mailer = &mailer.Memory{}
	svc.Pepper = []byte("invite-pepper")
	owner := mustUser(t, authStore, "p2@example.com", "promoter")
	tenant := mustTenant(t, authStore, owner)
	draft, err := svc.Create(ctx, owner, CreateInput{
		TenantID: tenant, Title: "Sur",
		StartsAt: now.Add(24 * time.Hour), EndsAt: now.Add(28 * time.Hour),
		Pin: &PinInput{Name: "Video Sur", Lat: 4.6, Lng: -74.08},
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.PutTicketTypes(ctx, owner, draft.ID, []TicketTypeInput{
		{Name: "Early", PriceCents: 1, Capacity: 10, Status: TicketOnSale},
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.ListTicketTypes(ctx, "", draft.ID); !errors.Is(err, auth.ErrNotFound) {
		t.Fatalf("public draft types=%v", err)
	}
}

func statusOf(items []TicketType, id string) string {
	for _, t := range items {
		if t.ID == id {
			return t.Status
		}
	}
	return ""
}
