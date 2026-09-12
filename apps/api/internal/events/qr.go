package events

import (
	"context"
	"strings"
	"time"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/ticketsign"
)

const ticketQRGrace = 6 * time.Hour

// MyTicket is one GET /v1/me/tickets row. qr_token is a JWS, never the ticket UUID.
type MyTicket struct {
	TicketID string        `json:"ticket_id"`
	Event    MyTicketEvent `json:"event"`
	Status   string        `json:"status"`
	QRToken  string        `json:"qr_token"`
	Barcode  string        `json:"barcode"`
}

// MyTicketEvent is the public event slice on a wallet ticket.
type MyTicketEvent struct {
	ID       string    `json:"id"`
	Title    string    `json:"title"`
	StartsAt time.Time `json:"starts_at"`
}

// ListMyTickets is GET /v1/me/tickets. Default status is valid. upcoming=true drops used and past events.
func (s *Service) ListMyTickets(ctx context.Context, userID, status string, upcoming bool) ([]MyTicket, error) {
	if err := s.requireAttendee(ctx, userID); err != nil {
		return nil, err
	}
	status = strings.TrimSpace(status)
	switch status {
	case "", TicketValid, TicketUsed:
	default:
		return nil, auth.Invalid{Fields: []auth.Field{{Name: "status", Issue: "invalid"}}}
	}
	if status == "" {
		status = TicketValid
	}
	rows, err := s.Store.ListTicketsByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	now := s.now()
	out := make([]MyTicket, 0, len(rows))
	events := map[string]Event{}
	for _, t := range rows {
		if t.Status != status {
			continue
		}
		if upcoming && t.Status == TicketUsed {
			continue
		}
		ev, ok := events[t.EventID]
		if !ok {
			loaded, err := s.Store.ByID(ctx, t.EventID)
			if err != nil {
				return nil, err
			}
			ev = loaded
			events[t.EventID] = ev
		}
		if upcoming && !ev.EndsAt.After(now) {
			continue
		}
		qr, err := s.qrForTicket(ctx, t, ev)
		if err != nil {
			return nil, err
		}
		out = append(out, MyTicket{
			TicketID: t.ID,
			Event:    MyTicketEvent{ID: ev.ID, Title: ev.Title, StartsAt: ev.StartsAt.UTC()},
			Status:   t.Status,
			QRToken:  qr,
			Barcode:  barcodePayload(t.JTI),
		})
	}
	return out, nil
}

func (s *Service) qrForTicket(ctx context.Context, t Ticket, ev Event) (string, error) {
	if t.Status != TicketValid && t.Status != TicketUsed {
		return "", nil
	}
	if t.JTI == "" {
		jti, err := newID()
		if err != nil {
			return "", err
		}
		if err := s.Store.SetTicketJTI(ctx, t.ID, jti); err != nil {
			return "", err
		}
		t.JTI = jti
	}
	token, err := s.Tickets.Sign(ticketsign.Claims{
		TicketID:  t.ID,
		EventID:   t.EventID,
		JWTID:     t.JTI,
		IssuedAt:  t.UpdatedAt,
		ExpiresAt: ev.EndsAt.UTC().Add(ticketQRGrace),
	})
	if err != nil {
		return "", err
	}
	return token, nil
}

func barcodePayload(jti string) string {
	return strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(jti), "-", ""))
}

func parseBarcodeJTI(raw string) (string, bool) {
	s := strings.ToUpper(strings.TrimSpace(raw))
	s = strings.TrimPrefix(s, "PCH")
	s = strings.ReplaceAll(s, "-", "")
	if len(s) != 32 {
		return "", false
	}
	for _, c := range s {
		if (c < '0' || c > '9') && (c < 'A' || c > 'F') {
			return "", false
		}
	}
	return strings.ToLower(s[0:8] + "-" + s[8:12] + "-" + s[12:16] + "-" + s[16:20] + "-" + s[20:32]), true
}
