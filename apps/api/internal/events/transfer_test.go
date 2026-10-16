package events

import (
	"context"
	"errors"
	"net/url"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/mailer"
	"github.com/parche-app/backend/internal/payments"
)

func TestTransferTicketRotatesJTIAndDenylists(t *testing.T) {
	ctx, svc, mail, buyer, eventID, typeID := transferFixture(t)
	dest := mustUser(t, svc.Tenancy.(*auth.Memory), "dest@example.com", auth.ProfileAttendee)
	ticketID, oldJTI := payOneTicket(t, svc, buyer, eventID, typeID)

	first, err := svc.ListMyTickets(ctx, buyer, "", true)
	if err != nil || len(first) != 1 {
		t.Fatalf("buyer wallet=%+v %v", first, err)
	}

	if err := svc.TransferTicket(ctx, buyer, ticketID, TransferInput{UserID: dest}); err != nil {
		t.Fatal(err)
	}
	tix, err := svc.Store.TicketByID(ctx, ticketID)
	if err != nil || tix.UserID != dest || tix.JTI == "" || tix.JTI == oldJTI || tix.TransferCount != 1 {
		t.Fatalf("moved=%+v %v", tix, err)
	}
	denied, err := svc.TicketJTIDenied(ctx, oldJTI)
	if err != nil || !denied {
		t.Fatalf("denylist old jti: %v %v", denied, err)
	}
	denied, err = svc.TicketJTIDenied(ctx, tix.JTI)
	if err != nil || denied {
		t.Fatalf("new jti denylisted: %v %v", denied, err)
	}

	hidden, err := svc.ListMyTickets(ctx, buyer, "", false)
	if err != nil || len(hidden) != 0 {
		t.Fatalf("sender wallet=%+v %v", hidden, err)
	}
	got, err := svc.ListMyTickets(ctx, dest, "", true)
	if err != nil || len(got) != 1 || got[0].TicketID != ticketID || got[0].QRToken == "" || got[0].QRToken == first[0].QRToken {
		t.Fatalf("dest wallet=%+v %v", got, err)
	}
	claims := 0
	for _, msg := range mail.All() {
		if msg.Template == mailer.TemplateTicketClaim {
			claims++
		}
	}
	if claims != 2 {
		t.Fatalf("expected emails to both parties, got %d", claims)
	}

	if err := svc.TransferTicket(ctx, dest, ticketID, TransferInput{Email: "dest@example.com"}); !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("self=%v", err)
	}
	stranger := mustUser(t, svc.Tenancy.(*auth.Memory), "stranger@example.com", auth.ProfileAttendee)
	if err := svc.TransferTicket(ctx, stranger, ticketID, TransferInput{UserID: buyer}); !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("not owner=%v", err)
	}
}

func TestTransferTicketRejectsReservedUsedAndFourth(t *testing.T) {
	ctx, svc, _, buyer, eventID, typeID := transferFixture(t)
	created, err := svc.CreateOrder(ctx, buyer, eventID, "idem-xfer-res", []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	reserved, err := svc.Store.ListTicketsByOrder(ctx, created.OrderID)
	if err != nil || len(reserved) != 1 {
		t.Fatalf("reserved=%+v %v", reserved, err)
	}
	dest := mustUser(t, svc.Tenancy.(*auth.Memory), "d2@example.com", auth.ProfileAttendee)
	if err := svc.TransferTicket(ctx, buyer, reserved[0].ID, TransferInput{UserID: dest}); !errors.Is(err, auth.ErrConflict) {
		t.Fatalf("reserved=%v", err)
	}

	ticketID, _ := payOneTicket(t, svc, buyer, eventID, typeID)
	used, err := svc.Store.TicketByID(ctx, ticketID)
	if err != nil {
		t.Fatal(err)
	}
	used.Status = TicketUsed
	svc.Store.(*Memory).tix[used.ID] = used
	if err := svc.TransferTicket(ctx, buyer, ticketID, TransferInput{UserID: dest}); !errors.Is(err, auth.ErrConflict) {
		t.Fatalf("used=%v", err)
	}

	okID, _ := payOneTicket(t, svc, buyer, eventID, typeID)
	a := dest
	b := mustUser(t, svc.Tenancy.(*auth.Memory), "d3@example.com", auth.ProfileAttendee)
	c := mustUser(t, svc.Tenancy.(*auth.Memory), "d4@example.com", auth.ProfileAttendee)
	d := mustUser(t, svc.Tenancy.(*auth.Memory), "d5@example.com", auth.ProfileAttendee)
	holders := []string{buyer, a, b, c}
	next := []string{a, b, c, d}
	for i, from := range holders {
		err := svc.TransferTicket(ctx, from, okID, TransferInput{UserID: next[i]})
		if i < maxTicketTransfers {
			if err != nil {
				t.Fatalf("transfer %d: %v", i+1, err)
			}
			continue
		}
		if !errors.Is(err, auth.ErrConflict) {
			t.Fatalf("fourth=%v", err)
		}
	}
}

func TestTransferTicketClaimAcceptAndExpiry(t *testing.T) {
	ctx, svc, mail, buyer, eventID, typeID := transferFixture(t)
	ticketID, oldJTI := payOneTicket(t, svc, buyer, eventID, typeID)
	if err := svc.TransferTicket(ctx, buyer, ticketID, TransferInput{Email: "new.guest@example.com"}); err != nil {
		t.Fatal(err)
	}
	tix, _ := svc.Store.TicketByID(ctx, ticketID)
	if tix.UserID != buyer || tix.JTI != oldJTI {
		t.Fatalf("pending must keep owner/jti %+v", tix)
	}
	tok := claimMailToken(t, mail)
	guest := mustUser(t, svc.Tenancy.(*auth.Memory), "new.guest@example.com", auth.ProfileAttendee)
	other := mustUser(t, svc.Tenancy.(*auth.Memory), "wrong.guest@example.com", auth.ProfileAttendee)
	if _, err := svc.AcceptTicketClaim(ctx, other, tok); !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("email mismatch=%v", err)
	}
	item, err := svc.AcceptTicketClaim(ctx, guest, tok)
	if err != nil || item.TicketID != ticketID || item.QRToken == "" {
		t.Fatalf("accept=%+v %v", item, err)
	}
	denied, err := svc.TicketJTIDenied(ctx, oldJTI)
	if err != nil || !denied {
		t.Fatalf("denylist after claim: %v %v", denied, err)
	}
	got, err := svc.ListMyTickets(ctx, guest, "", true)
	if err != nil || len(got) != 1 {
		t.Fatalf("guest wallet=%+v %v", got, err)
	}
	if _, err := svc.AcceptTicketClaim(ctx, guest, tok); !errors.Is(err, auth.ErrGone) {
		t.Fatalf("reuse=%v", err)
	}

	ticket2, _ := payOneTicket(t, svc, buyer, eventID, typeID)
	if err := svc.TransferTicket(ctx, buyer, ticket2, TransferInput{Email: "late@example.com"}); err != nil {
		t.Fatal(err)
	}
	lateTok := claimMailToken(t, mail)
	late := mustUser(t, svc.Tenancy.(*auth.Memory), "late@example.com", auth.ProfileAttendee)
	svc.Now = func() time.Time { return time.Date(2026, 9, 14, 18, 0, 0, 0, time.UTC) }
	if _, err := svc.AcceptTicketClaim(ctx, late, lateTok); !errors.Is(err, auth.ErrGone) {
		t.Fatalf("expired=%v", err)
	}
}

func transferFixture(t *testing.T) (context.Context, *Service, *mailer.Memory, string, string, string) {
	t.Helper()
	ctx, svc, buyer, eventID, typeID := checkoutFixture(t)
	mail, ok := svc.Mailer.(*mailer.Memory)
	if !ok {
		t.Fatal("mailer")
	}
	return ctx, svc, mail, buyer, eventID, typeID
}

func payOneTicket(t *testing.T, svc *Service, buyer, eventID, typeID string) (ticketID, jti string) {
	t.Helper()
	created, err := svc.CreateOrder(t.Context(), buyer, eventID, "idem-"+newTestID(t), []OrderItemInput{
		{TicketTypeID: typeID, Quantity: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.ApplyWebhook(t.Context(), payments.Event{
		ProviderEventID: "pay-" + created.OrderID, OrderID: created.OrderID, Status: "success",
	}, "fake", "h", "{}"); err != nil {
		t.Fatal(err)
	}
	tix, err := svc.Store.ListTicketsByOrder(t.Context(), created.OrderID)
	if err != nil || len(tix) != 1 || tix[0].Status != TicketValid || tix[0].JTI == "" {
		t.Fatalf("paid=%+v %v", tix, err)
	}
	return tix[0].ID, tix[0].JTI
}

func newTestID(t *testing.T) string {
	t.Helper()
	id, err := newID()
	if err != nil {
		t.Fatal(err)
	}
	return id
}

func claimMailToken(t *testing.T, mail *mailer.Memory) string {
	t.Helper()
	msgs := mail.All()
	for i := len(msgs) - 1; i >= 0; i-- {
		raw := msgs[i].Vars["claim_url"]
		if raw == "" {
			continue
		}
		u, err := url.Parse(raw)
		if err != nil {
			t.Fatal(err)
		}
		tok := u.Query().Get("token")
		if tok == "" {
			t.Fatalf("claim_url=%s", raw)
		}
		return tok
	}
	t.Fatal("expected ticket_claim mail")
	return ""
}
