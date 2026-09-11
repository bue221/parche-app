package events

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/payments"
)

func TestCreateOrderReservesAndWebhookSells(t *testing.T) {
	ctx, svc, buyer, eventID, typeID := checkoutFixture(t)

	created, err := svc.CreateOrder(ctx, buyer, eventID, "idem-key-01", []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 2},
	})
	if err != nil {
		t.Fatal(err)
	}
	if created.Status != OrderPending || created.CheckoutURL != "/v1/dev/pay/"+created.OrderID {
		t.Fatalf("%+v", created)
	}
	types, err := svc.ListTicketTypes(ctx, buyer, eventID)
	if err != nil {
		t.Fatal(err)
	}
	if statusOfCounts(types, typeID) != [2]int{0, 2} {
		t.Fatalf("reserved after create=%+v", types)
	}

	again, err := svc.CreateOrder(ctx, buyer, eventID, "idem-key-01", []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 2},
	})
	if err != nil || again.OrderID != created.OrderID {
		t.Fatalf("idempotent=%+v %v", again, err)
	}
	_, err = svc.CreateOrder(ctx, buyer, eventID, "idem-key-01", []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 1},
	})
	if !errors.Is(err, auth.ErrConflict) {
		t.Fatalf("different body=%v", err)
	}

	if err := svc.ApplyWebhook(ctx, payments.Event{
		ProviderEventID: "evt-1", OrderID: created.OrderID, Status: "success",
	}, "fake", "hash", `{"status":"success"}`); err != nil {
		t.Fatal(err)
	}
	if err := svc.ApplyWebhook(ctx, payments.Event{
		ProviderEventID: "evt-1", OrderID: created.OrderID, Status: "success",
	}, "fake", "hash", `{"status":"success"}`); err != nil {
		t.Fatal(err)
	}
	types, _ = svc.ListTicketTypes(ctx, buyer, eventID)
	if statusOfCounts(types, typeID) != [2]int{2, 0} {
		t.Fatalf("after pay=%+v", types)
	}
	view, err := svc.GetOrder(ctx, buyer, created.OrderID)
	if err != nil || view.Status != OrderPaid || len(view.Tickets) != 2 {
		t.Fatalf("view=%+v %v", view, err)
	}
	for _, tk := range view.Tickets {
		if tk.Status != TicketValid {
			t.Fatalf("ticket=%+v", tk)
		}
	}
}

func TestCreateOrderCapacityAndWindow(t *testing.T) {
	ctx, svc, buyer, eventID, typeID := checkoutFixture(t)
	end := svc.now().Add(-time.Minute)
	mem := svc.Store.(*Memory)
	tt := mem.tickets[typeID]
	tt.Capacity = 1
	mem.tickets[typeID] = tt

	_, err := svc.CreateOrder(ctx, buyer, eventID, "idem-cap-1", []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 2},
	})
	if !errors.Is(err, auth.ErrConflict) {
		t.Fatalf("over capacity=%v", err)
	}

	first, err := svc.CreateOrder(ctx, buyer, eventID, "idem-cap-2", []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	_, err = svc.CreateOrder(ctx, buyer, eventID, "idem-cap-3", []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 1},
	})
	if !errors.Is(err, auth.ErrConflict) {
		t.Fatalf("second=%v", err)
	}

	tt = mem.tickets[typeID]
	tt.SalesEndsAt = &end
	tt.Capacity = 40
	tt.ReservedCount = 0
	mem.tickets[typeID] = tt
	o := mem.orders[first.OrderID]
	o.Status = OrderExpired
	mem.orders[first.OrderID] = o

	_, err = svc.CreateOrder(ctx, buyer, eventID, "idem-win", []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 1},
	})
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("window=%v", err)
	}
}

func TestCreateOrderUnpublishedForbidden(t *testing.T) {
	ctx, svc, _, owner, _, eventID := memberFixture(t)
	svc.Payments = payments.Fake{}
	buyer := mustUser(t, svc.Tenancy.(*auth.Memory), "buy@example.com", auth.ProfileAttendee)
	created, err := svc.PutTicketTypes(ctx, owner, eventID, []TicketTypeInput{
		{Name: "Early", PriceCents: 1000, Capacity: 10, Status: TicketOnSale},
	})
	if err != nil {
		t.Fatal(err)
	}
	_, err = svc.CreateOrder(ctx, buyer, eventID, "idem-draft", []OrderItemInput{
		{TicketTypeID: created[0].ID, Quantity: 1},
	})
	if !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("draft=%v", err)
	}
}

func TestExpirePendingReleasesAforo(t *testing.T) {
	ctx, svc, buyer, eventID, typeID := checkoutFixture(t)
	created, err := svc.CreateOrder(ctx, buyer, eventID, "idem-exp", []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 3},
	})
	if err != nil {
		t.Fatal(err)
	}
	base := svc.now()
	svc.Now = func() time.Time { return base.Add(16 * time.Minute) }
	n, err := svc.ExpirePendingOrders(ctx)
	if err != nil || n != 1 {
		t.Fatalf("expire n=%d %v", n, err)
	}
	types, _ := svc.ListTicketTypes(ctx, buyer, eventID)
	if statusOfCounts(types, typeID) != [2]int{0, 0} {
		t.Fatalf("released=%+v", types)
	}
	view, err := svc.GetOrder(ctx, buyer, created.OrderID)
	if err != nil || view.Status != OrderExpired {
		t.Fatalf("expired view=%+v %v", view, err)
	}
	if err := svc.ApplyWebhook(ctx, payments.Event{
		ProviderEventID: "late", OrderID: created.OrderID, Status: "success",
	}, "fake", "h", "{}"); err != nil {
		t.Fatal(err)
	}
	view, _ = svc.GetOrder(ctx, buyer, created.OrderID)
	if view.Status != OrderExpired {
		t.Fatalf("late webhook mutated %s", view.Status)
	}
}

func TestFailedWebhookReleasesReserve(t *testing.T) {
	ctx, svc, buyer, eventID, typeID := checkoutFixture(t)
	created, err := svc.CreateOrder(ctx, buyer, eventID, "idem-fail", []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.ApplyWebhook(ctx, payments.Event{
		ProviderEventID: "fail-1", OrderID: created.OrderID, Status: "failed",
	}, "fake", "h", "{}"); err != nil {
		t.Fatal(err)
	}
	types, _ := svc.ListTicketTypes(ctx, buyer, eventID)
	if statusOfCounts(types, typeID) != [2]int{0, 0} {
		t.Fatalf("fail release=%+v", types)
	}
	view, _ := svc.GetOrder(ctx, buyer, created.OrderID)
	if view.Status != OrderFailed || view.Tickets[0].Status != TicketCancelled {
		t.Fatalf("%+v", view)
	}
}

func TestGetOrderHidesFromStrangers(t *testing.T) {
	ctx, svc, buyer, eventID, typeID := checkoutFixture(t)
	created, err := svc.CreateOrder(ctx, buyer, eventID, "idem-hide", []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	other := mustUser(t, svc.Tenancy.(*auth.Memory), "other@example.com", auth.ProfileAttendee)
	if _, err := svc.GetOrder(ctx, other, created.OrderID); !errors.Is(err, auth.ErrNotFound) {
		t.Fatalf("stranger=%v", err)
	}
}

func TestCreateOrderMaxEight(t *testing.T) {
	ctx, svc, buyer, eventID, typeID := checkoutFixture(t)
	_, err := svc.CreateOrder(ctx, buyer, eventID, "idem-nine", []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 9},
	})
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("max=%v", err)
	}
}

func checkoutFixture(t *testing.T) (context.Context, *Service, string, string, string) {
	t.Helper()
	c, s, _, owner, _, eid := memberFixture(t)
	s.Payments = payments.Fake{}
	ev, err := s.Store.ByID(c, eid)
	if err != nil {
		t.Fatal(err)
	}
	ev.Status = StatusPublished
	if err := s.Store.Update(c, ev); err != nil {
		t.Fatal(err)
	}
	types, err := s.PutTicketTypes(c, owner, eid, []TicketTypeInput{
		{Name: "Early", PriceCents: 50000, Capacity: 40, Status: TicketOnSale},
	})
	if err != nil || len(types) != 1 {
		t.Fatalf("types=%v %v", types, err)
	}
	buy := mustUser(t, s.Tenancy.(*auth.Memory), "buyer@example.com", auth.ProfileAttendee)
	return c, s, buy, eid, types[0].ID
}

func statusOfCounts(items []TicketType, id string) [2]int {
	for _, t := range items {
		if t.ID == id {
			return [2]int{t.SoldCount, t.ReservedCount}
		}
	}
	return [2]int{-1, -1}
}
