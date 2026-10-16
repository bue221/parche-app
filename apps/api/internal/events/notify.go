package events

import (
	"context"
	"strings"

	"github.com/parche-app/backend/internal/mailer"
)

func (s *Service) notifyOrderMail(ctx context.Context, orderID, status string) {
	if s.Mailer == nil {
		return
	}
	o, err := s.Store.OrderByID(ctx, orderID)
	if err != nil {
		return
	}
	u, err := s.Tenancy.UserByID(ctx, o.UserID)
	if err != nil || strings.TrimSpace(u.Email) == "" {
		return
	}
	ev, err := s.Store.ByID(ctx, o.EventID)
	if err != nil {
		return
	}
	tpl := mailer.TemplateOrderPaid
	key := "order_paid:" + o.ID
	if status != "success" {
		tpl = mailer.TemplateOrderFailed
		key = "order_failed:" + o.ID
	}
	origin := strings.TrimRight(s.AppOrigin, "/")
	if origin == "" {
		origin = "http://localhost:3000"
	}
	_ = s.Mailer.Send(ctx, mailer.Message{
		To:       u.Email,
		ToUserID: u.ID,
		Template: tpl,
		Vars: map[string]string{
			"event_title": ev.Title,
			"order_id":    o.ID,
			"app_origin":  origin,
		},
		IdempotencyKey: key,
	})
}

func (s *Service) notifyEventCancelled(ctx context.Context, e Event) {
	if s.Mailer == nil {
		return
	}
	ids, err := s.Store.ListTicketHolderIDs(ctx, e.ID)
	if err != nil {
		return
	}
	seen := map[string]struct{}{}
	for _, uid := range ids {
		if _, ok := seen[uid]; ok {
			continue
		}
		seen[uid] = struct{}{}
		u, err := s.Tenancy.UserByID(ctx, uid)
		if err != nil || strings.TrimSpace(u.Email) == "" {
			continue
		}
		_ = s.Mailer.Send(ctx, mailer.Message{
			To:       u.Email,
			ToUserID: u.ID,
			Template: mailer.TemplateEventCancelled,
			Vars: map[string]string{
				"event_title": e.Title,
			},
			IdempotencyKey: "event_cancelled:" + e.ID + ":" + u.ID,
		})
	}
}

func (s *Service) notifyArtistNewEvent(ctx context.Context, e Event) {
	if s.Mailer == nil || s.Lineup == nil || s.Followers == nil {
		return
	}
	slots, err := s.Lineup.EventLineup(ctx, e.ID)
	if err != nil {
		return
	}
	origin := strings.TrimRight(s.AppOrigin, "/")
	if origin == "" {
		origin = "http://localhost:3000"
	}
	eventURL := origin + "/events/" + e.ID
	sent := map[string]struct{}{}
	for _, sl := range slots {
		followers, err := s.Followers.FollowerUserIDs(ctx, sl.ArtistID)
		if err != nil {
			continue
		}
		for _, uid := range followers {
			key := sl.ArtistID + ":" + uid
			if _, ok := sent[key]; ok {
				continue
			}
			sent[key] = struct{}{}
			u, err := s.Tenancy.UserByID(ctx, uid)
			if err != nil || strings.TrimSpace(u.Email) == "" {
				continue
			}
			_ = s.Mailer.Send(ctx, mailer.Message{
				To:       u.Email,
				ToUserID: u.ID,
				Template: mailer.TemplateArtistNewEvent,
				Vars: map[string]string{
					"artist_name": sl.Name,
					"event_title": e.Title,
					"event_url":   eventURL,
				},
				IdempotencyKey: "artist_new_event:" + e.ID + ":" + sl.ArtistID + ":" + u.ID,
			})
		}
	}
}
