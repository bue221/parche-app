package events

import (
	"errors"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/payments"
	"github.com/parche-app/backend/internal/ticketsign"
)

func TestPaidTicketsGetStableQR(t *testing.T) {
	ctx, svc, buyer, eventID, typeID := checkoutFixture(t)
	created, err := svc.CreateOrder(ctx, buyer, eventID, "idem-qr-1", []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.ApplyWebhook(ctx, payments.Event{
		ProviderEventID: "qr-pay", OrderID: created.OrderID, Status: "success",
	}, "fake", "h", "{}"); err != nil {
		t.Fatal(err)
	}

	tix, err := svc.Store.ListTicketsByOrder(ctx, created.OrderID)
	if err != nil || len(tix) != 1 || tix[0].Status != TicketValid || tix[0].JTI == "" {
		t.Fatalf("issued=%+v %v", tix, err)
	}
	jti := tix[0].JTI

	first, err := svc.ListMyTickets(ctx, buyer, "", true)
	if err != nil || len(first) != 1 {
		t.Fatalf("list=%+v %v", first, err)
	}
	if first[0].QRToken == "" || first[0].TicketID != tix[0].ID {
		t.Fatalf("%+v", first[0])
	}
	second, err := svc.ListMyTickets(ctx, buyer, "", true)
	if err != nil || second[0].QRToken != first[0].QRToken {
		t.Fatalf("re-sign must keep jti/qr")
	}

	ev, err := svc.Store.ByID(ctx, eventID)
	if err != nil {
		t.Fatal(err)
	}
	got, err := svc.Tickets.Verify(first[0].QRToken, svc.now())
	if err != nil {
		t.Fatal(err)
	}
	if got.TicketID != tix[0].ID || got.EventID != eventID || got.JWTID != jti {
		t.Fatalf("claims=%+v", got)
	}
	wantExp := ev.EndsAt.UTC().Add(ticketQRGrace).Unix()
	if got.ExpiresAt.Unix() != wantExp {
		t.Fatalf("exp=%d want %d", got.ExpiresAt.Unix(), wantExp)
	}

	tix, _ = svc.Store.ListTicketsByOrder(ctx, created.OrderID)
	if tix[0].JTI != jti {
		t.Fatalf("jti rotated on GET: %s vs %s", tix[0].JTI, jti)
	}

	other := mustUser(t, svc.Tenancy.(*auth.Memory), "other-qr@example.com", auth.ProfileAttendee)
	hidden, err := svc.ListMyTickets(ctx, other, "", false)
	if err != nil || len(hidden) != 0 {
		t.Fatalf("stranger=%+v %v", hidden, err)
	}

	used := tix[0]
	used.Status = TicketUsed
	svc.Store.(*Memory).tix[used.ID] = used
	upcoming, err := svc.ListMyTickets(ctx, buyer, "", true)
	if err != nil || len(upcoming) != 0 {
		t.Fatalf("upcoming used=%+v %v", upcoming, err)
	}
	listedUsed, err := svc.ListMyTickets(ctx, buyer, TicketUsed, false)
	if err != nil || len(listedUsed) != 1 {
		t.Fatalf("status used=%+v %v", listedUsed, err)
	}

	if _, err := svc.ListMyTickets(ctx, buyer, "nope", false); !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("bad status=%v", err)
	}
}

func TestTicketQRKeyIsNotAccessSecret(t *testing.T) {
	const ticketKey = "ticket-signing-key-32-bytes-min!!"
	const accessKey = "0123456789abcdef0123456789abcdef"
	if ticketKey == accessKey {
		t.Fatal("fixture keys collided")
	}
	k, err := ticketsign.Parse(ticketKey, "")
	if err != nil {
		t.Fatal(err)
	}
	tok, err := k.Sign(ticketsign.Claims{
		TicketID: "t", EventID: "e", JWTID: "j",
		IssuedAt: time.Unix(1, 0), ExpiresAt: time.Unix(9_999_999_999, 0),
	})
	if err != nil {
		t.Fatal(err)
	}
	access, err := ticketsign.Parse(accessKey, "")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := access.Verify(tok, time.Unix(10, 0)); !errors.Is(err, ticketsign.ErrInvalidToken) {
		t.Fatalf("access key must not verify ticket QR: %v", err)
	}
}
