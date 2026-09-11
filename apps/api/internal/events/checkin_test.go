package events

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/broker"
	"github.com/parche-app/backend/internal/mailer"
	"github.com/parche-app/backend/internal/payments"
	"github.com/parche-app/backend/internal/ticketsign"
)

type captureQueue struct {
	mu   sync.Mutex
	jobs []TicketScanJob
}

func (c *captureQueue) Publish(_ context.Context, subject string, payload []byte) error {
	if subject != broker.SubjectTicketUsed {
		return nil
	}
	var job TicketScanJob
	if err := json.Unmarshal(payload, &job); err != nil {
		return err
	}
	c.mu.Lock()
	c.jobs = append(c.jobs, job)
	c.mu.Unlock()
	return nil
}

func TestCheckInSignatureWrongEventExpiredDuplicate(t *testing.T) {
	ctx, svc, owner, buyer, door, metrics, eventID, qr := doorScanFixture(t)
	otherEvent := otherPublishedEvent(t, svc, owner)

	bad, err := svc.CheckIn(ctx, door, eventID, "not-a-jws")
	if err != nil || bad.Result != ScanInvalid || bad.TicketID != nil {
		t.Fatalf("invalid=%+v %v", bad, err)
	}

	wrongTok, err := svc.Tickets.Sign(ticketsign.Claims{
		TicketID: "00000000-0000-0000-0000-000000000099", EventID: otherEvent, JWTID: "jti-wrong",
		IssuedAt: svc.now(), ExpiresAt: svc.now().Add(time.Hour),
	})
	if err != nil {
		t.Fatal(err)
	}
	wrong, err := svc.CheckIn(ctx, door, eventID, wrongTok)
	if err != nil || wrong.Result != ScanWrongEvent || wrong.TicketID == nil {
		t.Fatalf("wrong event=%+v %v", wrong, err)
	}

	if _, err := svc.CheckIn(ctx, metrics, eventID, qr); !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("metrics scan=%v", err)
	}

	first, err := svc.CheckIn(ctx, door, eventID, qr)
	if err != nil || first.Result != ScanApproved || first.TicketID == nil {
		t.Fatalf("approved=%+v %v", first, err)
	}
	dup, err := svc.CheckIn(ctx, door, eventID, qr)
	if err != nil || dup.Result != ScanDuplicate {
		t.Fatalf("duplicate=%+v %v", dup, err)
	}

	used, err := svc.Store.TicketByID(ctx, *first.TicketID)
	if err != nil || used.Status != TicketUsed {
		t.Fatalf("in-process persist=%+v %v", used, err)
	}
	logs, err := svc.Store.ListRecentScanLogs(ctx, eventID, 10)
	if err != nil || len(logs) != 2 {
		t.Fatalf("logs=%d %v", len(logs), err)
	}

	live, err := svc.DoorLive(ctx, door, eventID, true)
	if err != nil || live.Used != 1 || live.Inside != 1 || live.Sold != 1 || live.Capacity != 40 {
		t.Fatalf("door live=%+v %v", live, err)
	}
	if len(live.Recent) == 0 || live.Recent[0].GuestName != "" {
		t.Fatalf("door must not see guest names: %+v", live.Recent)
	}
	ownerLive, err := svc.DoorLive(ctx, owner, eventID, true)
	if err != nil || len(ownerLive.Recent) == 0 || ownerLive.Recent[0].GuestName == "" {
		t.Fatalf("owner guest_name=%+v %v", ownerLive, err)
	}

	svc.Now = func() time.Time { return time.Date(2099, 1, 1, 0, 0, 0, 0, time.UTC) }
	expired, err := svc.CheckIn(ctx, door, eventID, qr)
	if err != nil || expired.Result != ScanExpired {
		t.Fatalf("expired=%+v %v", expired, err)
	}
	_ = buyer
}

func TestCheckInTwoScannersAndPostgresOffPath(t *testing.T) {
	ctx, svc, owner, _, doorA, _, eventID, qr := doorScanFixture(t)
	mail, ok := svc.Mailer.(*mailer.Memory)
	if !ok {
		t.Fatal("mailer")
	}
	doorB := mustUser(t, svc.Tenancy.(*auth.Memory), "door-b-scan@example.com", auth.ProfileAttendee)
	acceptRole(t, svc, mail, owner, eventID, doorB, RoleDoor)

	q := &captureQueue{}
	svc.Publisher = q
	first, err := svc.CheckIn(ctx, doorA, eventID, qr)
	if err != nil || first.Result != ScanApproved {
		t.Fatalf("a=%+v %v", first, err)
	}
	second, err := svc.CheckIn(ctx, doorB, eventID, qr)
	if err != nil || second.Result != ScanDuplicate {
		t.Fatalf("b=%+v %v", second, err)
	}
	row, err := svc.Store.TicketByID(ctx, *first.TicketID)
	if err != nil || row.Status != TicketValid {
		t.Fatalf("must not wait on postgres: %+v %v", row, err)
	}
	if len(q.jobs) != 2 {
		t.Fatalf("published=%d", len(q.jobs))
	}
	if err := PersistTicketScan(ctx, svc.Store, q.jobs[0]); err != nil {
		t.Fatal(err)
	}
	if err := PersistTicketScan(ctx, svc.Store, q.jobs[1]); err != nil {
		t.Fatal(err)
	}
	row, _ = svc.Store.TicketByID(ctx, *first.TicketID)
	if row.Status != TicketUsed {
		t.Fatalf("after worker=%s", row.Status)
	}
	logs, _ := svc.Store.ListRecentScanLogs(ctx, eventID, 10)
	if len(logs) != 2 {
		t.Fatalf("both scanners log=%d", len(logs))
	}
}

func TestCheckInDenylistedJTIIsInvalid(t *testing.T) {
	ctx, svc, _, buyer, door, _, eventID, qr := doorScanFixture(t)
	wallet, err := svc.ListMyTickets(ctx, buyer, "", true)
	if err != nil || len(wallet) != 1 {
		t.Fatal(err)
	}
	dest := mustUser(t, svc.Tenancy.(*auth.Memory), "new-owner@example.com", auth.ProfileAttendee)
	if err := svc.TransferTicket(ctx, buyer, wallet[0].TicketID, TransferInput{UserID: dest}); err != nil {
		t.Fatal(err)
	}
	got, err := svc.CheckIn(ctx, door, eventID, qr)
	if err != nil || got.Result != ScanInvalid {
		t.Fatalf("old qr after transfer=%+v %v", got, err)
	}
}

func doorScanFixture(t *testing.T) (context.Context, *Service, string, string, string, string, string, string) {
	t.Helper()
	ctx, svc, buyer, eventID, typeID := checkoutFixture(t)
	mail, ok := svc.Mailer.(*mailer.Memory)
	if !ok {
		t.Fatal("mailer")
	}
	members, err := svc.Store.ListMembers(ctx, eventID)
	if err != nil {
		t.Fatal(err)
	}
	owner := ""
	for _, m := range members {
		if m.Role == RoleOwner {
			owner = m.UserID
			break
		}
	}
	if owner == "" {
		t.Fatal("owner")
	}
	door := mustUser(t, svc.Tenancy.(*auth.Memory), "door-scan@example.com", auth.ProfileAttendee)
	metrics := mustUser(t, svc.Tenancy.(*auth.Memory), "metrics-scan@example.com", auth.ProfileAttendee)
	acceptRole(t, svc, mail, owner, eventID, door, RoleDoor)
	acceptRole(t, svc, mail, owner, eventID, metrics, RoleMetrics)

	created, err := svc.CreateOrder(ctx, buyer, eventID, "idem-door-"+buyer, []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.ApplyWebhook(ctx, payments.Event{
		ProviderEventID: "pay-door-" + created.OrderID, OrderID: created.OrderID, Status: "success",
	}, "fake", "h", "{}"); err != nil {
		t.Fatal(err)
	}
	wallet, err := svc.ListMyTickets(ctx, buyer, "", true)
	if err != nil || len(wallet) != 1 || wallet[0].QRToken == "" {
		t.Fatalf("wallet=%+v %v", wallet, err)
	}
	return ctx, svc, owner, buyer, door, metrics, eventID, wallet[0].QRToken
}

func otherPublishedEvent(t *testing.T, svc *Service, owner string) string {
	t.Helper()
	ctx := context.Background()
	tenants, err := svc.Tenancy.TenantsForUser(ctx, owner)
	if err != nil || len(tenants) == 0 {
		t.Fatal(err)
	}
	draft, err := svc.Create(ctx, owner, CreateInput{
		TenantID: tenants[0].ID, Title: "Sur",
		StartsAt: svc.now().Add(48 * time.Hour), EndsAt: svc.now().Add(52 * time.Hour),
		Pin: &PinInput{Name: "Sur", Lat: 4.6, Lng: -74.1},
	})
	if err != nil {
		t.Fatal(err)
	}
	draft.Status = StatusPublished
	if err := svc.Store.Update(ctx, draft); err != nil {
		t.Fatal(err)
	}
	return draft.ID
}
