package events

import (
	"context"
	"time"

	"github.com/parche-app/backend/internal/auth"
)

// EventSave is one bookmarked date (F30).
type EventSave struct {
	UserID    string
	EventID   string
	CreatedAt time.Time
}

func (s *Service) SaveEvent(ctx context.Context, userID, eventID string) error {
	if _, err := s.Store.ByID(ctx, eventID); err != nil {
		return err
	}
	return s.Store.SaveEvent(ctx, EventSave{UserID: userID, EventID: eventID, CreatedAt: s.now()})
}

func (s *Service) UnsaveEvent(ctx context.Context, userID, eventID string) error {
	return s.Store.UnsaveEvent(ctx, userID, eventID)
}

func (s *Service) ListSavedEvents(ctx context.Context, userID string) ([]Event, error) {
	ids, err := s.Store.SavedEventIDs(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]Event, 0, len(ids))
	for _, id := range ids {
		e, err := s.Get(ctx, userID, id)
		if err != nil {
			continue
		}
		out = append(out, e)
	}
	return out, nil
}

func (s *Service) ListPendingInvites(ctx context.Context, userID string) ([]auth.EventMembership, error) {
	user, err := s.Tenancy.UserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	rows, err := s.Store.PendingInvitesFor(ctx, user.Email, userID)
	if err != nil {
		return nil, err
	}
	now := s.now()
	out := make([]auth.EventMembership, 0, len(rows))
	for _, inv := range rows {
		if inv.AcceptedAt != nil || !inv.ExpiresAt.After(now) {
			continue
		}
		out = append(out, auth.EventMembership{
			EventID: inv.EventID,
			Role:    inv.Role,
			Status:  "pending",
		})
	}
	return out, nil
}
