package events

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/mailer"
	"github.com/parche-app/backend/internal/payments"
)

func TestEventMetricsDoorForbiddenAndScannerTotals(t *testing.T) {
	ctx, svc, owner, buyer, door, metricsUser, eventID, qr := doorScanFixture(t)

	if _, err := svc.EventMetrics(ctx, door, eventID); !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("door metrics=%v", err)
	}

	created, err := svc.CreateOrder(ctx, buyer, eventID, "idem-metrics-2", []OrderItemInput{
		{TicketTypeID: walletType(t, svc, eventID), Quantity: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.ApplyWebhook(ctx, payments.Event{
		ProviderEventID: "pay-metrics-2", OrderID: created.OrderID, Status: "success",
	}, "fake", "h", "{}"); err != nil {
		t.Fatal(err)
	}

	first, err := svc.CheckIn(ctx, door, eventID, qr)
	if err != nil || first.Result != ScanApproved {
		t.Fatalf("approved=%+v %v", first, err)
	}
	if _, err := svc.CheckIn(ctx, door, eventID, qr); err != nil {
		t.Fatal(err)
	}

	got, err := svc.EventMetrics(ctx, metricsUser, eventID)
	if err != nil {
		t.Fatal(err)
	}
	if got.GrossCents != 100000 || got.Currency != "COP" || got.Checkins != 1 {
		t.Fatalf("summary=%+v", got)
	}
	if got.SoldValidUsed.Valid != 1 || got.SoldValidUsed.Used != 1 || got.SoldValidUsed.Cancelled != 0 {
		t.Fatalf("split=%+v", got.SoldValidUsed)
	}
	if got.NoShowRate != 0 {
		t.Fatalf("no_show before end=%v", got.NoShowRate)
	}
	if len(got.ByScanner) != 1 || got.ByScanner[0].UserID != door || got.ByScanner[0].Approved != 1 || got.ByScanner[0].Duplicate != 1 {
		t.Fatalf("by_scanner=%+v", got.ByScanner)
	}
	if got.ByScanner[0].DisplayName == "" {
		t.Fatalf("scanner name empty: %+v", got.ByScanner[0])
	}
	if len(got.Hourly) != 1 || got.Hourly[0].Approved != 1 {
		t.Fatalf("hourly=%+v", got.Hourly)
	}
	raw, _ := json.Marshal(got)
	if strings.Contains(string(raw), "buyer@example.com") {
		t.Fatalf("buyer PII in summary: %s", raw)
	}

	live, err := svc.DoorLive(ctx, door, eventID, false)
	if err != nil {
		t.Fatal(err)
	}
	liveJSON, _ := json.Marshal(live)
	if strings.Contains(string(liveJSON), "gross") {
		t.Fatalf("door live leaked revenue: %s", liveJSON)
	}

	ev, err := svc.Store.ByID(ctx, eventID)
	if err != nil {
		t.Fatal(err)
	}
	svc.Now = func() time.Time { return ev.EndsAt.Add(time.Second) }
	InvalidateEventMetrics(ctx, svc.Cache, eventID)
	ended, err := svc.EventMetrics(ctx, owner, eventID)
	if err != nil || ended.NoShowRate != 0.5 {
		t.Fatalf("no_show after end=%+v %v", ended, err)
	}
}

func TestEventMetricsCacheAndOrdersExport(t *testing.T) {
	ctx, svc, owner, _, door, metricsUser, eventID, _ := doorScanFixture(t)
	mail, ok := svc.Mailer.(*mailer.Memory)
	if !ok {
		t.Fatal("mailer")
	}
	manager := mustUser(t, svc.Tenancy.(*auth.Memory), "mgr-metrics@example.com", auth.ProfileAttendee)
	acceptRole(t, svc, mail, owner, eventID, manager, RoleManager)

	first, err := svc.EventMetrics(ctx, owner, eventID)
	if err != nil || first.GrossCents != 50000 {
		t.Fatalf("first=%+v %v", first, err)
	}
	mem := svc.Store.(*Memory)
	ttID := walletType(t, svc, eventID)
	row := mem.tickets[ttID]
	row.SoldCount = 9
	mem.tickets[ttID] = row
	cached, err := svc.EventMetrics(ctx, owner, eventID)
	if err != nil || cached.GrossCents != 50000 {
		t.Fatalf("cache hit=%+v %v", cached, err)
	}
	InvalidateEventMetrics(ctx, svc.Cache, eventID)
	fresh, err := svc.EventMetrics(ctx, owner, eventID)
	if err != nil || fresh.GrossCents != 9*50000 {
		t.Fatalf("after invalidate=%+v %v", fresh, err)
	}

	orders, err := svc.ListMetricsOrders(ctx, metricsUser, eventID, "", 20)
	if err != nil || len(orders) != 1 {
		t.Fatalf("metrics orders=%+v %v", orders, err)
	}
	if orders[0].Email != "b***@example.com" {
		t.Fatalf("masked=%q", orders[0].Email)
	}
	ownerOrders, err := svc.ListMetricsOrders(ctx, owner, eventID, "", 20)
	if err != nil || ownerOrders[0].Email != "buyer@example.com" {
		t.Fatalf("owner email=%+v %v", ownerOrders, err)
	}
	mgrOrders, err := svc.ListMetricsOrders(ctx, manager, eventID, "", 20)
	if err != nil || mgrOrders[0].Email != "b***@example.com" {
		t.Fatalf("manager masked=%+v %v", mgrOrders, err)
	}
	if _, err := svc.ListMetricsOrders(ctx, door, eventID, "", 20); !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("door orders=%v", err)
	}

	csvBody, err := svc.ExportEventTickets(ctx, owner, eventID)
	if err != nil {
		t.Fatal(err)
	}
	text := string(csvBody)
	if strings.Contains(strings.ToLower(text), "qr") || !strings.Contains(text, "ticket_id,ticket_type,status") {
		t.Fatalf("csv=%s", text)
	}
	if !strings.Contains(text, "valid") && !strings.Contains(text, "used") {
		t.Fatalf("csv status=%s", text)
	}
	if _, err := svc.ExportEventTickets(ctx, manager, eventID); err != nil {
		t.Fatalf("manager export=%v", err)
	}
	if _, err := svc.ExportEventTickets(ctx, metricsUser, eventID); !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("metrics export=%v", err)
	}
	if _, err := svc.ExportEventTickets(ctx, door, eventID); !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("door export=%v", err)
	}
}

func TestMaskEmail(t *testing.T) {
	if got := maskEmail("ada@x.co"); got != "a***@x.co" {
		t.Fatalf("got %q", got)
	}
}

func walletType(t *testing.T, svc *Service, eventID string) string {
	t.Helper()
	types, err := svc.Store.ListTicketTypes(t.Context(), eventID)
	if err != nil || len(types) == 0 {
		t.Fatalf("types=%v %v", types, err)
	}
	return types[0].ID
}
