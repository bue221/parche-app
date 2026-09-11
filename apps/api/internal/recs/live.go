package recs

import (
	"context"
	"time"

	"github.com/parche-app/backend/internal/artists"
	"github.com/parche-app/backend/internal/events"
)

// Live reads F12 lineup, F13 follows, F16 tickets, and F22 published events.
type Live struct {
	Events  *events.Service
	Artists *artists.Service
}

func NewLive(catalog *events.Service, acts *artists.Service) *Live {
	return &Live{Events: catalog, Artists: acts}
}

func (l *Live) Candidates(ctx context.Context, now time.Time) ([]Candidate, error) {
	if l.Events == nil {
		return []Candidate{}, nil
	}
	items, err := l.Events.ListPublic(ctx, events.ListFilter{Limit: candidateLimit, Now: now})
	if err != nil {
		return nil, err
	}
	out := make([]Candidate, 0, len(items))
	for _, e := range items {
		artists := make([]string, 0)
		if l.Artists != nil {
			slots, err := l.Artists.EventLineup(ctx, e.ID)
			if err != nil {
				return nil, err
			}
			for _, sl := range slots {
				if sl.ArtistID != "" {
					artists = append(artists, sl.ArtistID)
				}
			}
		}
		sold := 0
		if l.Events.Store != nil {
			tts, err := l.Events.Store.ListTicketTypes(ctx, e.ID)
			if err != nil {
				return nil, err
			}
			for _, tt := range tts {
				sold += tt.SoldCount
			}
		}
		genres := e.Genres
		if genres == nil {
			genres = []string{}
		}
		out = append(out, Candidate{
			Event:    e,
			Artists:  artists,
			Sold7d:   sold,
			Genres:   genres,
			Lat:      e.Lat,
			Lng:      e.Lng,
			StartsAt: e.StartsAt,
		})
	}
	return out, nil
}

func (l *Live) FollowedArtistIDs(ctx context.Context, userID string) ([]string, error) {
	if l.Artists == nil || l.Artists.Store == nil {
		return []string{}, nil
	}
	fs, err := l.Artists.Store.FollowsByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(fs))
	for _, f := range fs {
		ids = append(ids, f.ArtistID)
	}
	return ids, nil
}

func (l *Live) PaidEventIDs(ctx context.Context, userID string) ([]string, error) {
	if l.Events == nil || l.Events.Store == nil {
		return []string{}, nil
	}
	tix, err := l.Events.Store.ListTicketsByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	seen := map[string]struct{}{}
	var ids []string
	for _, t := range tix {
		if t.Status != events.TicketValid && t.Status != events.TicketUsed {
			continue
		}
		if _, ok := seen[t.EventID]; ok {
			continue
		}
		seen[t.EventID] = struct{}{}
		ids = append(ids, t.EventID)
	}
	if ids == nil {
		ids = []string{}
	}
	return ids, nil
}

func (l *Live) UserIDs(ctx context.Context) ([]string, error) {
	// Worker uses PG.UserIDs. Live is for request-path compute.
	return []string{}, nil
}
