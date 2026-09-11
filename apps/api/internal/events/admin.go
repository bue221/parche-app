package events

import (
	"context"
	"strings"
	"unicode/utf8"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/mailer"
)

const maxRejectReason = 500

// PlatformMetrics is GET /v1/admin/metrics (users come from auth).
type PlatformMetrics struct {
	Users           int `json:"users"`
	EventsPublished int `json:"events_published"`
	GMVCents30d     int `json:"gmv_cents_30d"`
}

// ListAdmin is GET /v1/admin/events. Default status is pending_review.
func (s *Service) ListAdmin(ctx context.Context, status, cursor string, limit int) ([]Event, error) {
	status = strings.TrimSpace(status)
	if status == "" {
		status = StatusPendingReview
	}
	switch status {
	case StatusDraft, StatusPendingReview, StatusPublished, StatusRejected, StatusCancelled, StatusArchived:
	default:
		return nil, auth.Invalid{Fields: []auth.Field{{Name: "status", Issue: "invalid"}}}
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	items, err := s.Store.List(ctx, ListFilter{Status: status, Cursor: cursor, Limit: limit})
	if err != nil {
		return nil, err
	}
	return s.attachAll(ctx, "", items), nil
}

// Approve is POST /v1/admin/events/{id}/approve: pending_review → published.
func (s *Service) Approve(ctx context.Context, id string) (Event, error) {
	return s.Publish(ctx, id)
}

// Reject is POST /v1/admin/events/{id}/reject.
func (s *Service) Reject(ctx context.Context, id, reason string) (Event, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return Event{}, auth.Invalid{Fields: []auth.Field{{Name: "reason", Issue: "required"}}}
	}
	if utf8.RuneCountInString(reason) > maxRejectReason {
		return Event{}, auth.Invalid{Fields: []auth.Field{{Name: "reason", Issue: "too_long"}}}
	}
	e, err := s.Store.ByID(ctx, id)
	if err != nil {
		return Event{}, err
	}
	if e.Status != StatusPendingReview {
		return Event{}, auth.ErrConflict
	}
	e.Status = StatusRejected
	if err := s.Store.Update(ctx, e); err != nil {
		return Event{}, err
	}
	s.notifyEventRejected(ctx, e, reason)
	return s.loaded(ctx, e.CreatedBy, id)
}

// PlatformCounts is published events and 30-day GMV for GET /v1/admin/metrics.
func (s *Service) PlatformCounts(ctx context.Context) (published, gmvCents int, err error) {
	published, err = s.Store.CountPublished(ctx)
	if err != nil {
		return 0, 0, err
	}
	gmvCents, err = s.Store.GMVSince(ctx, s.now().AddDate(0, 0, -30))
	return published, gmvCents, err
}

// ListTicketHolderIDs exposes store holders for F27 broadcasts.
func (s *Service) ListTicketHolderIDs(ctx context.Context, eventID string) ([]string, error) {
	return s.Store.ListTicketHolderIDs(ctx, eventID)
}

func (s *Service) notifyEventRejected(ctx context.Context, e Event, reason string) {
	if s.Mailer == nil {
		return
	}
	u, err := s.Tenancy.UserByID(ctx, e.CreatedBy)
	if err != nil || strings.TrimSpace(u.Email) == "" {
		return
	}
	_ = s.Mailer.Send(ctx, mailer.Message{
		To:       u.Email,
		ToUserID: u.ID,
		Template: mailer.TemplateEventRejected,
		Vars: map[string]string{
			"event_title": e.Title,
			"reason":      reason,
		},
		IdempotencyKey: "event_rejected:" + e.ID,
	})
}
