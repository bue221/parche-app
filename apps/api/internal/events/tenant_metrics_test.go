package events

import (
	"errors"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/payments"
)

func TestTenantMetricsOwnerOnlyAndMatchesEventTotals(t *testing.T) {
	ctx, svc, owner, _, door, metricsUser, eventID, _ := doorScanFixture(t)
	tenants, err := svc.Tenancy.TenantsForUser(ctx, owner)
	if err != nil || len(tenants) == 0 {
		t.Fatal(err)
	}
	tid := tenants[0].ID
	now := svc.now()
	from := now.Format(time.RFC3339)
	to := now.Add(72 * time.Hour).Format(time.RFC3339)

	if _, err := svc.TenantMetrics(ctx, door, tid, from, to); !errors.Is(err, auth.ErrNotFound) {
		t.Fatalf("door stranger=%v", err)
	}
	if _, err := svc.TenantMetrics(ctx, metricsUser, tid, from, to); !errors.Is(err, auth.ErrNotFound) {
		t.Fatalf("event metrics role=%v", err)
	}

	staff := mustUser(t, svc.Tenancy.(*auth.Memory), "staff-metrics@example.com", auth.ProfileAttendee)
	if err := svc.Tenancy.(*auth.Memory).AddMember(ctx, tid, staff, auth.TenantStaff); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.TenantMetrics(ctx, staff, tid, from, to); !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("staff=%v", err)
	}
	if _, err := svc.TenantMetrics(ctx, owner, "missing", from, to); !errors.Is(err, auth.ErrNotFound) {
		t.Fatalf("unknown tenant=%v", err)
	}

	second := otherPublishedEvent(t, svc, owner)
	buyer := mustUser(t, svc.Tenancy.(*auth.Memory), "buyer-two@example.com", auth.ProfileAttendee)
	types, err := svc.PutTicketTypes(ctx, owner, second, []TicketTypeInput{
		{Name: "Door", PriceCents: 20000, Capacity: 10, Status: TicketOnSale},
	})
	if err != nil || len(types) != 1 {
		t.Fatalf("types=%v %v", types, err)
	}
	created, err := svc.CreateOrder(ctx, buyer, second, "idem-tenant-metrics", []OrderItemInput{
		{TicketTypeID: types[0].ID, Quantity: 2},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.ApplyWebhook(ctx, payments.Event{
		ProviderEventID: "pay-tenant-2", OrderID: created.OrderID, Status: "success",
	}, "fake", "h", "{}"); err != nil {
		t.Fatal(err)
	}

	first, err := svc.EventMetrics(ctx, owner, eventID)
	if err != nil {
		t.Fatal(err)
	}
	secondM, err := svc.EventMetrics(ctx, owner, second)
	if err != nil {
		t.Fatal(err)
	}

	got, err := svc.TenantMetrics(ctx, owner, tid, from, to)
	if err != nil {
		t.Fatal(err)
	}
	wantGross := first.GrossCents + secondM.GrossCents
	wantSold := 0
	for _, line := range first.ByType {
		wantSold += line.Sold
	}
	for _, line := range secondM.ByType {
		wantSold += line.Sold
	}
	if got.GrossCents != wantGross || got.TicketsSold != wantSold || got.OrdersPaid != 2 {
		t.Fatalf("totals=%+v want gross=%d sold=%d paid=2 first=%+v second=%+v", got, wantGross, wantSold, first, secondM)
	}
	if got.EventsPublished != 2 || len(got.ByEvent) != 2 {
		t.Fatalf("events=%+v", got)
	}
	sumGross, sumSold := 0, 0
	for _, row := range got.ByEvent {
		sumGross += row.GrossCents
		sumSold += row.Sold
	}
	if sumGross != got.GrossCents || sumSold != got.TicketsSold {
		t.Fatalf("by_event mismatch %+v", got)
	}

	outside, err := svc.TenantMetrics(ctx, owner, tid, now.Add(-48*time.Hour).Format(time.RFC3339), now.Format(time.RFC3339))
	if err != nil || outside.GrossCents != 0 || outside.EventsPublished != 0 || len(outside.ByEvent) != 0 {
		t.Fatalf("outside window=%+v %v", outside, err)
	}
}

func TestParseTenantMetricsWindow(t *testing.T) {
	now := time.Date(2026, 9, 11, 18, 0, 0, 0, time.UTC)
	from, to, err := parseTenantMetricsWindow(now, "", "")
	if err != nil || !from.Equal(now.AddDate(0, 0, -30)) || !to.Equal(now) {
		t.Fatalf("default=%v %v %v", from, to, err)
	}
	if _, _, err := parseTenantMetricsWindow(now, now.Format(time.RFC3339), ""); !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("missing to=%v", err)
	}
	if _, _, err := parseTenantMetricsWindow(now, "nope", now.Format(time.RFC3339)); !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("bad from=%v", err)
	}
	if _, _, err := parseTenantMetricsWindow(now, now.Format(time.RFC3339), now.Format(time.RFC3339)); !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("equal=%v", err)
	}
	far := now.Add(367 * 24 * time.Hour)
	if _, _, err := parseTenantMetricsWindow(now, now.Format(time.RFC3339), far.Format(time.RFC3339)); !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("range=%v", err)
	}
	okFrom, okTo, err := parseTenantMetricsWindow(now, "2026-09-01", "2026-09-10")
	if err != nil || !okFrom.Equal(time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)) || !okTo.Equal(time.Date(2026, 9, 10, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("dates=%v %v %v", okFrom, okTo, err)
	}
}
