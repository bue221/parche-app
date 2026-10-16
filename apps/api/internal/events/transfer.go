package events

import (
	"context"
	"errors"
	"net/url"
	"strings"
	"time"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/mailer"
)

const (
	maxTicketTransfers      = 3
	ticketClaimTTL          = 48 * time.Hour
	ticketJTIDenylistPrefix = "ticket:jti:"
)

// TransferInput is POST /v1/tickets/{id}/transfer. Exactly one of Email or UserID.
type TransferInput struct {
	Email  string
	UserID string
}

// TicketClaim is a 48h pending cesión when the destination has no account yet.
type TicketClaim struct {
	ID         string
	TicketID   string
	FromUserID string
	ToEmail    string
	TokenHash  string
	ExpiresAt  time.Time
	AcceptedAt *time.Time
	CreatedAt  time.Time
}

// TransferTicket is POST /v1/tickets/{id}/transfer. Known users take the ticket immediately.
func (s *Service) TransferTicket(ctx context.Context, actorID, ticketID string, in TransferInput) error {
	if err := s.requireAttendee(ctx, actorID); err != nil {
		return err
	}
	t, err := s.Store.TicketByID(ctx, ticketID)
	if err != nil {
		return err
	}
	if t.UserID != actorID {
		return auth.ErrForbidden
	}
	if t.Status == TicketUsed {
		return auth.ErrConflict
	}
	if t.Status != TicketValid {
		return auth.ErrConflict
	}
	if t.TransferCount >= maxTicketTransfers {
		return auth.ErrConflict
	}
	actor, err := s.userByID(ctx, actorID)
	if err != nil {
		return err
	}
	destUser, destEmail, err := s.resolveTransferDest(ctx, in)
	if err != nil {
		return err
	}
	if destUser.ID == actorID || strings.EqualFold(destEmail, actor.Email) {
		return auth.Invalid{Fields: []auth.Field{{Name: destField(in), Issue: "self"}}}
	}
	if err := s.Store.DeleteExpiredTicketClaims(ctx, t.ID, s.now()); err != nil {
		return err
	}
	if _, err := s.Store.PendingTicketClaim(ctx, t.ID); err == nil {
		return auth.ErrConflict
	} else if !errors.Is(err, auth.ErrNotFound) {
		return err
	}

	ev, err := s.Store.ByID(ctx, t.EventID)
	if err != nil {
		return err
	}
	if destUser.ID != "" {
		return s.completeTransfer(ctx, t, ev, actor, destUser)
	}
	return s.createPendingClaim(ctx, t, ev, actor, destEmail)
}

// AcceptTicketClaim is POST /v1/tickets/claims/{token}/accept.
func (s *Service) AcceptTicketClaim(ctx context.Context, userID, token string) (MyTicket, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return MyTicket{}, auth.ErrGone
	}
	if err := s.requireAttendee(ctx, userID); err != nil {
		return MyTicket{}, err
	}
	u, err := s.userByID(ctx, userID)
	if err != nil {
		return MyTicket{}, err
	}
	claim, err := s.Store.TicketClaimByTokenHash(ctx, s.hashToken(token))
	if err != nil {
		if errors.Is(err, auth.ErrNotFound) {
			return MyTicket{}, auth.ErrGone
		}
		return MyTicket{}, err
	}
	now := s.now()
	if claim.AcceptedAt != nil || !claim.ExpiresAt.After(now) {
		return MyTicket{}, auth.ErrGone
	}
	if !strings.EqualFold(u.Email, claim.ToEmail) {
		return MyTicket{}, auth.ErrForbidden
	}
	t, err := s.Store.TicketByID(ctx, claim.TicketID)
	if err != nil {
		return MyTicket{}, err
	}
	if t.Status != TicketValid {
		return MyTicket{}, auth.ErrConflict
	}
	if t.TransferCount >= maxTicketTransfers {
		return MyTicket{}, auth.ErrConflict
	}
	ev, err := s.Store.ByID(ctx, t.EventID)
	if err != nil {
		return MyTicket{}, err
	}
	newJTI, err := newID()
	if err != nil {
		return MyTicket{}, err
	}
	oldJTI := t.JTI
	moved, err := s.Store.AcceptTicketClaim(ctx, claim.ID, u.ID, newJTI, now)
	if err != nil {
		return MyTicket{}, err
	}
	s.denylistTicketJTI(ctx, oldJTI, ev)
	from, ferr := s.userByID(ctx, claim.FromUserID)
	if ferr != nil {
		from = auth.User{ID: claim.FromUserID}
	}
	s.sendTransferMail(ctx, from, u, ev, moved.ID, "", "accepted")
	qr, err := s.qrForTicket(ctx, moved, ev)
	if err != nil {
		return MyTicket{}, err
	}
	return MyTicket{
		TicketID: moved.ID,
		Event:    MyTicketEvent{ID: ev.ID, Title: ev.Title, StartsAt: ev.StartsAt.UTC()},
		Status:   moved.Status,
		QRToken:  qr,
		Barcode:  barcodePayload(moved.JTI),
	}, nil
}

// TicketJTIDenied reports Redis/memory denylist hits. F19 check-in must call this after Verify.
func (s *Service) TicketJTIDenied(ctx context.Context, jti string) (bool, error) {
	jti = strings.TrimSpace(jti)
	if jti == "" || s.Cache == nil {
		return false, nil
	}
	_, ok, err := s.Cache.Get(ctx, ticketJTIDenylistKey(jti))
	return ok, err
}

func (s *Service) completeTransfer(ctx context.Context, t Ticket, ev Event, from, to auth.User) error {
	newJTI, err := newID()
	if err != nil {
		return err
	}
	oldJTI := t.JTI
	if _, err := s.Store.TransferValidTicket(ctx, t.ID, from.ID, to.ID, newJTI, s.now()); err != nil {
		return err
	}
	s.denylistTicketJTI(ctx, oldJTI, ev)
	s.sendTransferMail(ctx, from, to, ev, t.ID, "", "completed")
	return nil
}

func (s *Service) createPendingClaim(ctx context.Context, t Ticket, ev Event, from auth.User, destEmail string) error {
	raw, err := auth.NewRefresh()
	if err != nil {
		return err
	}
	id, err := newID()
	if err != nil {
		return err
	}
	now := s.now()
	claim := TicketClaim{
		ID:         id,
		TicketID:   t.ID,
		FromUserID: from.ID,
		ToEmail:    destEmail,
		TokenHash:  s.hashToken(raw),
		ExpiresAt:  now.Add(ticketClaimTTL),
		CreatedAt:  now,
	}
	if err := s.Store.CreateTicketClaim(ctx, claim); err != nil {
		if errors.Is(err, auth.ErrConflict) {
			return auth.ErrConflict
		}
		return err
	}
	s.sendTransferMail(ctx, from, auth.User{Email: destEmail}, ev, t.ID, raw, "pending")
	return nil
}

func (s *Service) resolveTransferDest(ctx context.Context, in TransferInput) (auth.User, string, error) {
	uid := strings.TrimSpace(in.UserID)
	email := normalizeInviteEmail(in.Email)
	if (uid == "") == (email == "") {
		return auth.User{}, "", auth.Invalid{Fields: []auth.Field{{Name: "body", Issue: "user_or_email"}}}
	}
	if uid != "" {
		u, err := s.userByID(ctx, uid)
		if err != nil {
			return auth.User{}, "", err
		}
		return u, u.Email, nil
	}
	if !validInviteEmail(email) {
		return auth.User{}, "", auth.Invalid{Fields: []auth.Field{{Name: "to_email", Issue: "invalid"}}}
	}
	u, err := s.userByEmail(ctx, email)
	if err == nil {
		return u, u.Email, nil
	}
	if !errors.Is(err, auth.ErrNotFound) {
		return auth.User{}, "", err
	}
	return auth.User{}, email, nil
}

func (s *Service) denylistTicketJTI(ctx context.Context, jti string, ev Event) {
	jti = strings.TrimSpace(jti)
	if jti == "" || s.Cache == nil {
		return
	}
	until := ev.EndsAt.UTC().Add(ticketQRGrace)
	ttl := until.Sub(s.now())
	if ttl < time.Second {
		ttl = time.Second
	}
	_ = s.Cache.Set(ctx, ticketJTIDenylistKey(jti), "1", ttl)
}

func (s *Service) sendTransferMail(ctx context.Context, from, to auth.User, ev Event, ticketID, rawToken, kind string) {
	if s.Mailer == nil {
		return
	}
	origin := strings.TrimRight(s.AppOrigin, "/")
	if origin == "" {
		origin = "http://localhost:3000"
	}
	destVars := map[string]string{
		"event_title": ev.Title,
		"kind":        kind,
		"ticket_id":   ticketID,
	}
	if rawToken != "" {
		destVars["claim_url"] = origin + "/tickets/claim?token=" + url.QueryEscape(rawToken)
	}
	toAddr := to.Email
	if toAddr == "" {
		return
	}
	_ = s.Mailer.Send(ctx, mailer.Message{
		To:             toAddr,
		ToUserID:       to.ID,
		Template:       mailer.TemplateTicketClaim,
		Vars:           destVars,
		IdempotencyKey: "ticket-claim:" + ticketID + ":" + kind + ":to",
	})
	if from.Email == "" {
		return
	}
	_ = s.Mailer.Send(ctx, mailer.Message{
		To:       from.Email,
		ToUserID: from.ID,
		Template: mailer.TemplateTicketClaim,
		Vars: map[string]string{
			"event_title": ev.Title,
			"kind":        kind + "_from",
			"ticket_id":   ticketID,
		},
		IdempotencyKey: "ticket-claim:" + ticketID + ":" + kind + ":from",
	})
}

func destField(in TransferInput) string {
	if strings.TrimSpace(in.UserID) != "" {
		return "to_user_id"
	}
	return "to_email"
}

func ticketJTIDenylistKey(jti string) string {
	return ticketJTIDenylistPrefix + jti
}
