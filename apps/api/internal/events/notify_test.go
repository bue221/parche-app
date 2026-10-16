package events

import (
	"context"
	"testing"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/mailer"
	"github.com/parche-app/backend/internal/payments"
)

func TestWebhookSendsOrderPaidAndFailed(t *testing.T) {
	ctx, svc, buyer, eventID, typeID := checkoutFixture(t)
	mail := svc.Mailer.(*mailer.Memory)

	created, err := svc.CreateOrder(ctx, buyer, eventID, "idem-mail-paid", []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.ApplyWebhook(ctx, payments.Event{
		ProviderEventID: "evt-mail-1", OrderID: created.OrderID, Status: "success",
	}, "fake", "hash", `{"status":"success"}`); err != nil {
		t.Fatal(err)
	}
	if err := svc.ApplyWebhook(ctx, payments.Event{
		ProviderEventID: "evt-mail-1", OrderID: created.OrderID, Status: "success",
	}, "fake", "hash", `{"status":"success"}`); err != nil {
		t.Fatal(err)
	}
	paid := 0
	for _, msg := range mail.All() {
		if msg.Template == mailer.TemplateOrderPaid {
			paid++
			if msg.Vars["qr_token"] != "" {
				t.Fatal("qr in order_paid")
			}
			if msg.Vars["event_title"] == "" {
				t.Fatal("missing title")
			}
		}
	}
	if paid != 1 {
		t.Fatalf("order_paid count=%d", paid)
	}

	failOrder, err := svc.CreateOrder(ctx, buyer, eventID, "idem-mail-fail", []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.ApplyWebhook(ctx, payments.Event{
		ProviderEventID: "evt-mail-fail", OrderID: failOrder.OrderID, Status: "failed",
	}, "fake", "hash", `{"status":"failed"}`); err != nil {
		t.Fatal(err)
	}
	failed := 0
	for _, msg := range mail.All() {
		if msg.Template == mailer.TemplateOrderFailed {
			failed++
		}
	}
	if failed != 1 {
		t.Fatalf("order_failed count=%d", failed)
	}
}

func TestCancelEmailsTicketHolders(t *testing.T) {
	ctx, svc, buyer, eventID, typeID := checkoutFixture(t)
	mail := svc.Mailer.(*mailer.Memory)
	created, err := svc.CreateOrder(ctx, buyer, eventID, "idem-cancel-mail", []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.ApplyWebhook(ctx, payments.Event{
		ProviderEventID: "evt-cancel-mail", OrderID: created.OrderID, Status: "success",
	}, "fake", "hash", `{"status":"success"}`); err != nil {
		t.Fatal(err)
	}
	owner := ""
	members, err := svc.Store.ListMembers(ctx, eventID)
	if err != nil {
		t.Fatal(err)
	}
	for _, m := range members {
		if m.Role == RoleOwner {
			owner = m.UserID
			break
		}
	}
	nBefore := mail.Len()
	if err := svc.Cancel(ctx, owner, eventID); err != nil {
		t.Fatal(err)
	}
	found := false
	for _, msg := range mail.All()[nBefore:] {
		if msg.Template == mailer.TemplateEventCancelled && msg.ToUserID == buyer {
			found = true
		}
	}
	if !found {
		t.Fatal("expected event_cancelled to buyer")
	}
}

type stubLineupFollowers struct {
	slots     []LineupSlot
	followers map[string][]string
}

func (s stubLineupFollowers) EventLineup(context.Context, string) ([]LineupSlot, error) {
	return s.slots, nil
}

func (s stubLineupFollowers) EventIDsByArtist(context.Context, string) ([]string, error) {
	return nil, nil
}

func (s stubLineupFollowers) FollowerUserIDs(_ context.Context, artistID string) ([]string, error) {
	return s.followers[artistID], nil
}

func TestPublishEmailsArtistFollowers(t *testing.T) {
	ctx, svc, mail, owner, _, eventID := memberFixture(t)
	fan := mustUser(t, svc.Tenancy.(*auth.Memory), "fan-mail@example.com", auth.ProfileAttendee)
	artistID := "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
	stub := stubLineupFollowers{
		slots:     []LineupSlot{{ArtistID: artistID, Name: "Norte Bass", BillingOrder: 1}},
		followers: map[string][]string{artistID: {fan}},
	}
	svc.Lineup = stub
	svc.Followers = stub

	ev, err := svc.Store.ByID(ctx, eventID)
	if err != nil {
		t.Fatal(err)
	}
	ev.FlyerAssetID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
	if err := svc.Store.Update(ctx, ev); err != nil {
		t.Fatal(err)
	}
	if err := svc.Submit(ctx, owner, eventID); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Publish(ctx, eventID); err != nil {
		t.Fatal(err)
	}

	n := 0
	for _, msg := range mail.All() {
		if msg.Template != mailer.TemplateArtistNewEvent {
			continue
		}
		n++
		if msg.ToUserID != fan || msg.Vars["artist_name"] != "Norte Bass" || msg.Vars["event_url"] == "" {
			t.Fatalf("%+v", msg)
		}
	}
	if n != 1 {
		t.Fatalf("artist_new_event count=%d", n)
	}
}
