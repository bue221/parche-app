package recs

import (
	"context"
	"log/slog"
	"time"

	"github.com/parche-app/backend/internal/auth"
)

// Service ranks published events from follows, genres, city, and popularity (F24).
type Service struct {
	Loader Loader
	Table  Table
	Now    func() time.Time
	Log    *slog.Logger
}

func NewService(loader Loader, table Table) *Service {
	return &Service{
		Loader: loader,
		Table:  table,
		Now:    func() time.Time { return time.Now().UTC() },
	}
}

func (s *Service) now() time.Time {
	if s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

// ForUser is GET /v1/me/recommendations. Scores live from follows and genres so a new follow
// is visible immediately; the worker still materializes top 50 for recs.refresh.
func (s *Service) ForUser(ctx context.Context, userID string) ([]Item, error) {
	if userID == "" {
		return nil, auth.ErrUnauthorized
	}
	items, err := s.computeUser(ctx, userID, maxReturn)
	if err != nil {
		return nil, err
	}
	if s.Table != nil {
		if err := s.Table.ReplaceUser(ctx, userID, items, s.now()); err != nil {
			s.logErr("recs.cache write", err)
		}
	}
	return items, nil
}

// Similar is GET /v1/events/{id}/similar: genre + lineup, no user.
func (s *Service) Similar(ctx context.Context, eventID string) ([]Item, error) {
	if eventID == "" {
		return nil, auth.ErrNotFound
	}
	cands, err := s.Loader.Candidates(ctx, s.now())
	if err != nil {
		return nil, err
	}
	var seed *Candidate
	for i := range cands {
		if cands[i].Event.ID == eventID {
			seed = &cands[i]
			break
		}
	}
	if seed == nil {
		return nil, auth.ErrNotFound
	}
	p := profile{
		followed: setOf(seed.Artists),
		genres:   map[string]struct{}{},
		paid:     map[string]struct{}{},
		lat:      seed.Lat,
		lng:      seed.Lng,
		hasLoc:   true,
		cold:     false,
	}
	for _, g := range seed.Genres {
		if g != "" {
			p.genres[g] = struct{}{}
		}
	}
	if len(p.followed) == 0 && len(p.genres) == 0 {
		p.cold = true
	}
	return rank(cands, p, eventID, maxReturn), nil
}

// RefreshAll is worker recs.refresh: top 50 per user with follows or purchases.
func (s *Service) RefreshAll(ctx context.Context) (int, error) {
	if s.Loader == nil || s.Table == nil {
		return 0, nil
	}
	ids, err := s.Loader.UserIDs(ctx)
	if err != nil {
		return 0, err
	}
	n := 0
	for _, userID := range ids {
		if ctx.Err() != nil {
			return n, ctx.Err()
		}
		if err := s.RefreshUser(ctx, userID); err != nil {
			s.logErr("recs.refresh user", err)
			continue
		}
		n++
	}
	return n, nil
}

// RefreshUser materializes top 50 for one attendee.
func (s *Service) RefreshUser(ctx context.Context, userID string) error {
	items, err := s.computeUser(ctx, userID, maxStore)
	if err != nil {
		return err
	}
	return s.Table.ReplaceUser(ctx, userID, items, s.now())
}

func (s *Service) computeUser(ctx context.Context, userID string, limit int) ([]Item, error) {
	cands, err := s.Loader.Candidates(ctx, s.now())
	if err != nil {
		return nil, err
	}
	followed, err := s.Loader.FollowedArtistIDs(ctx, userID)
	if err != nil {
		return nil, err
	}
	paid, err := s.Loader.PaidEventIDs(ctx, userID)
	if err != nil {
		return nil, err
	}
	p := buildProfile(cands, followed, paid)
	return rank(cands, p, "", limit), nil
}

func (s *Service) logErr(msg string, err error) {
	if s.Log != nil {
		s.Log.Error(msg, "err", err)
	}
}
