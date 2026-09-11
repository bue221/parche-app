package artists

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/events"
)

const upcomingOnProfile = 5

// Service is F12 public artist documents and event lineup.
type Service struct {
	Store    Store
	Accounts Accounts
	Catalog  Catalog
	Avatars  Avatars
	Now      func() time.Time
}

func NewService(store Store, accounts Accounts) *Service {
	return &Service{
		Store:    store,
		Accounts: accounts,
		Now:      func() time.Time { return time.Now().UTC() },
	}
}

func (s *Service) now() time.Time {
	if s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func (s *Service) Create(ctx context.Context, userID string, in CreateInput) (Artist, error) {
	profiles, err := s.profiles(ctx, userID)
	if err != nil {
		return Artist{}, err
	}
	hasArtist := hasProfile(profiles, auth.ProfileArtist)
	hasPromoter := hasProfile(profiles, auth.ProfilePromoter)
	if !hasArtist && !hasPromoter {
		return Artist{}, auth.ErrForbidden
	}

	name, bio, links, err := normalizeProfile(in.Name, in.Bio, in.Links)
	if err != nil {
		return Artist{}, err
	}

	_, err = s.Store.ByUserID(ctx, userID)
	hasOwn := err == nil
	if err != nil && !errors.Is(err, auth.ErrNotFound) {
		return Artist{}, err
	}

	if hasOwn && !hasPromoter {
		return Artist{}, auth.ErrConflict
	}

	a := Artist{
		Name:  name,
		Bio:   bio,
		Links: links,
	}
	if !hasOwn && hasArtist {
		a.UserID = userID
	} else {
		if !hasPromoter {
			return Artist{}, auth.ErrForbidden
		}
		tid := strings.TrimSpace(in.TenantID)
		if tid == "" {
			return Artist{}, auth.Invalid{Fields: []auth.Field{{Name: "tenant_id", Issue: "required"}}}
		}
		if _, err := uuid.Parse(tid); err != nil {
			return Artist{}, auth.Invalid{Fields: []auth.Field{{Name: "tenant_id", Issue: "uuid"}}}
		}
		if err := s.requireTenantMember(ctx, tid, userID); err != nil {
			return Artist{}, err
		}
		a.TenantID = tid
	}

	id, err := newID()
	if err != nil {
		return Artist{}, err
	}
	now := s.now()
	a.ID = id
	a.CreatedAt = now
	a.UpdatedAt = now
	if err := s.Store.Create(ctx, a); err != nil {
		if errors.Is(err, auth.ErrConflict) {
			return Artist{}, auth.ErrConflict
		}
		return Artist{}, err
	}
	return s.profile(ctx, a.ID)
}

func (s *Service) Get(ctx context.Context, id string) (Artist, error) {
	a, err := s.profile(ctx, id)
	if err != nil {
		return Artist{}, err
	}
	a.Upcoming = s.upcoming(ctx, a.ID)
	a.FollowersCount = s.followers(ctx, a.ID)
	return a, nil
}

func (s *Service) Follow(ctx context.Context, userID, artistID string) error {
	artistID, err := parseArtistID(artistID)
	if err != nil {
		return err
	}
	if _, err := s.Store.ByID(ctx, artistID); err != nil {
		return err
	}
	return s.Store.Follow(ctx, Follow{UserID: userID, ArtistID: artistID, CreatedAt: s.now()})
}

func (s *Service) Unfollow(ctx context.Context, userID, artistID string) error {
	artistID, err := parseArtistID(artistID)
	if err != nil {
		return err
	}
	if _, err := s.Store.ByID(ctx, artistID); err != nil {
		return err
	}
	return s.Store.Unfollow(ctx, userID, artistID)
}

func (s *Service) ListFollowing(ctx context.Context, userID string, f FollowFilter) ([]Artist, *string, error) {
	rows, err := s.Store.FollowsByUser(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	curAt, curID, err := events.DecodeCursor(f.Cursor)
	if err != nil {
		return nil, nil, err
	}
	limit := f.Limit
	if limit < 1 {
		limit = 20
	}
	out := make([]Artist, 0)
	var last Follow
	for _, row := range rows {
		if !afterFollowCursor(row, curAt, curID) {
			continue
		}
		a, err := s.profile(ctx, row.ArtistID)
		if err != nil {
			continue
		}
		a.FollowersCount = s.followers(ctx, a.ID)
		out = append(out, a)
		last = row
		if len(out) == limit {
			break
		}
	}
	var next *string
	if limit > 0 && len(out) == limit {
		c := events.EncodeCursor(last.CreatedAt, last.ArtistID)
		next = &c
	}
	return out, next, nil
}

func (s *Service) followers(ctx context.Context, artistID string) int {
	n, err := s.Store.CountFollowers(ctx, artistID)
	if err != nil {
		return 0
	}
	return n
}

func (s *Service) Patch(ctx context.Context, userID, id string, in PatchInput) (Artist, error) {
	a, err := s.requireOwner(ctx, userID, id)
	if err != nil {
		return Artist{}, err
	}
	if in.Name == nil && in.Bio == nil && in.Links == nil {
		return Artist{}, auth.Invalid{Fields: []auth.Field{{Name: "body", Issue: "empty"}}}
	}
	name, bio, links := a.Name, a.Bio, a.Links
	if in.Name != nil {
		name = *in.Name
	}
	if in.Bio != nil {
		bio = *in.Bio
	}
	if in.Links != nil {
		links = *in.Links
	}
	name, bio, links, err = normalizeProfile(name, bio, links)
	if err != nil {
		return Artist{}, err
	}
	a.Name = name
	a.Bio = bio
	a.Links = links
	a.UpdatedAt = s.now()
	if err := s.Store.Update(ctx, a); err != nil {
		return Artist{}, err
	}
	return s.Get(ctx, a.ID)
}

// Authorize is artist-owner write (claimed user or tenant member of a promoter act).
func (s *Service) Authorize(ctx context.Context, userID, artistID string) (string, error) {
	a, err := s.requireOwner(ctx, userID, artistID)
	if err != nil {
		return "", err
	}
	return a.TenantID, nil
}

func (s *Service) BindAvatar(ctx context.Context, artistID, assetID string) (string, error) {
	a, err := s.Store.ByID(ctx, artistID)
	if err != nil {
		return "", err
	}
	prev := a.AvatarAssetID
	a.AvatarAssetID = assetID
	a.UpdatedAt = s.now()
	if err := s.Store.Update(ctx, a); err != nil {
		return "", err
	}
	return prev, nil
}

func (s *Service) AddLineup(ctx context.Context, eventID string, in LineupInput) error {
	artistID := strings.TrimSpace(in.ArtistID)
	if _, err := uuid.Parse(artistID); err != nil {
		return auth.Invalid{Fields: []auth.Field{{Name: "artist_id", Issue: "uuid"}}}
	}
	if _, err := s.Store.ByID(ctx, artistID); err != nil {
		return err
	}
	if in.BillingOrder < 0 {
		return auth.Invalid{Fields: []auth.Field{{Name: "billing_order", Issue: "range"}}}
	}
	return s.Store.AddSlot(ctx, Slot{
		EventID:      eventID,
		ArtistID:     artistID,
		BillingOrder: in.BillingOrder,
		StartsAt:     in.StartsAt,
	})
}

func (s *Service) RemoveLineup(ctx context.Context, eventID, artistID string) error {
	if _, err := uuid.Parse(strings.TrimSpace(artistID)); err != nil {
		return auth.Invalid{Fields: []auth.Field{{Name: "artistId", Issue: "uuid"}}}
	}
	return s.Store.RemoveSlot(ctx, eventID, artistID)
}

// EventLineup implements events.Lineup for GET event detail.
func (s *Service) EventLineup(ctx context.Context, eventID string) ([]events.LineupSlot, error) {
	slots, err := s.Store.SlotsByEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}
	out := make([]events.LineupSlot, 0, len(slots))
	for _, sl := range slots {
		a, err := s.profile(ctx, sl.ArtistID)
		if err != nil {
			continue
		}
		item := events.LineupSlot{
			ArtistID:     a.ID,
			Name:         a.Name,
			BillingOrder: sl.BillingOrder,
			StartsAt:     sl.StartsAt,
			Avatar:       a.Avatar,
		}
		out = append(out, item)
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].BillingOrder != out[j].BillingOrder {
			return out[i].BillingOrder < out[j].BillingOrder
		}
		return out[i].ArtistID < out[j].ArtistID
	})
	return out, nil
}

// EventIDsByArtist implements events.Lineup for GET /v1/events?artist_id= (F22).
func (s *Service) EventIDsByArtist(ctx context.Context, artistID string) ([]string, error) {
	slots, err := s.Store.SlotsByArtist(ctx, artistID)
	if err != nil {
		return nil, err
	}
	seen := make(map[string]struct{}, len(slots))
	out := make([]string, 0, len(slots))
	for _, sl := range slots {
		if _, ok := seen[sl.EventID]; ok {
			continue
		}
		seen[sl.EventID] = struct{}{}
		out = append(out, sl.EventID)
	}
	return out, nil
}

func (s *Service) ListEvents(ctx context.Context, artistID string, f EventFilter) ([]events.Event, error) {
	if _, err := s.Store.ByID(ctx, artistID); err != nil {
		return nil, err
	}
	when := strings.ToLower(strings.TrimSpace(f.When))
	if when == "" {
		when = "upcoming"
	}
	if when != "upcoming" && when != "past" {
		return nil, auth.Invalid{Fields: []auth.Field{{Name: "when", Issue: "invalid"}}}
	}
	slots, err := s.Store.SlotsByArtist(ctx, artistID)
	if err != nil {
		return nil, err
	}
	now := f.Now
	if now.IsZero() {
		now = s.now()
	}
	limit := f.Limit
	if limit < 1 {
		limit = 20
	}
	curStarts, curID, err := events.DecodeCursor(f.Cursor)
	if err != nil {
		return nil, err
	}
	items := make([]events.Event, 0)
	for _, sl := range slots {
		if s.Catalog == nil {
			break
		}
		e, err := s.Catalog.Get(ctx, "", sl.EventID)
		if err != nil {
			continue
		}
		if e.Status != events.StatusPublished {
			continue
		}
		if when == "upcoming" && e.EndsAt.Before(now) {
			continue
		}
		if when == "past" && !e.EndsAt.Before(now) {
			continue
		}
		if !afterEventCursor(e, when, curStarts, curID) {
			continue
		}
		items = append(items, e)
	}
	sort.Slice(items, func(i, j int) bool {
		if when == "past" {
			if !items[i].StartsAt.Equal(items[j].StartsAt) {
				return items[i].StartsAt.After(items[j].StartsAt)
			}
			return items[i].ID > items[j].ID
		}
		if !items[i].StartsAt.Equal(items[j].StartsAt) {
			return items[i].StartsAt.Before(items[j].StartsAt)
		}
		return items[i].ID < items[j].ID
	})
	if len(items) > limit {
		items = items[:limit]
	}
	return items, nil
}

func (s *Service) profile(ctx context.Context, id string) (Artist, error) {
	a, err := s.Store.ByID(ctx, id)
	if err != nil {
		return Artist{}, err
	}
	if a.AvatarAssetID != "" && s.Avatars != nil {
		if img, err := s.Avatars.Image(ctx, a.AvatarAssetID); err == nil {
			a.Avatar = img
		}
	}
	if a.Upcoming == nil {
		a.Upcoming = []events.PublicItem{}
	}
	return a, nil
}

func (s *Service) upcoming(ctx context.Context, artistID string) []events.PublicItem {
	items, err := s.ListEvents(ctx, artistID, EventFilter{When: "upcoming", Limit: upcomingOnProfile, Now: s.now()})
	if err != nil {
		return []events.PublicItem{}
	}
	out := make([]events.PublicItem, 0, len(items))
	for _, e := range items {
		out = append(out, events.ToPublic(e))
	}
	return out
}

func (s *Service) requireOwner(ctx context.Context, userID, artistID string) (Artist, error) {
	a, err := s.Store.ByID(ctx, artistID)
	if err != nil {
		return Artist{}, err
	}
	if a.UserID != "" && a.UserID == userID {
		return a, nil
	}
	if a.TenantID != "" {
		if err := s.requireTenantMember(ctx, a.TenantID, userID); err == nil {
			return a, nil
		}
	}
	return Artist{}, auth.ErrForbidden
}

func (s *Service) requireTenantMember(ctx context.Context, tenantID, userID string) error {
	if s.Accounts == nil {
		return auth.ErrForbidden
	}
	_, err := s.Accounts.Membership(ctx, tenantID, userID)
	if err != nil {
		if errors.Is(err, auth.ErrNotFound) {
			return auth.ErrForbidden
		}
		return err
	}
	return nil
}

func (s *Service) profiles(ctx context.Context, userID string) ([]string, error) {
	if s.Accounts == nil {
		return nil, auth.ErrForbidden
	}
	return s.Accounts.Profiles(ctx, userID)
}

func normalizeProfile(name, bio string, links Links) (string, string, Links, error) {
	name = strings.TrimSpace(name)
	bio = strings.TrimSpace(bio)
	var fields []auth.Field
	if name == "" || utf8.RuneCountInString(name) > maxName {
		fields = append(fields, auth.Field{Name: "name", Issue: "invalid"})
	}
	if utf8.RuneCountInString(bio) > maxBio {
		fields = append(fields, auth.Field{Name: "bio", Issue: "length"})
	}
	links.Instagram = strings.TrimSpace(links.Instagram)
	links.Soundcloud = strings.TrimSpace(links.Soundcloud)
	if utf8.RuneCountInString(links.Instagram) > maxLink {
		fields = append(fields, auth.Field{Name: "links.instagram", Issue: "length"})
	}
	if utf8.RuneCountInString(links.Soundcloud) > maxLink {
		fields = append(fields, auth.Field{Name: "links.soundcloud", Issue: "length"})
	}
	if len(fields) > 0 {
		return "", "", Links{}, auth.Invalid{Fields: fields}
	}
	return name, bio, links, nil
}

func hasProfile(profiles []string, want string) bool {
	for _, p := range profiles {
		if p == want {
			return true
		}
	}
	return false
}

func parseArtistID(id string) (string, error) {
	id = strings.TrimSpace(id)
	if _, err := uuid.Parse(id); err != nil {
		return "", auth.ErrNotFound
	}
	return id, nil
}

func afterFollowCursor(f Follow, curAt time.Time, curID string) bool {
	if curID == "" {
		return true
	}
	if f.CreatedAt.After(curAt) {
		return false
	}
	if f.CreatedAt.Equal(curAt) && f.ArtistID >= curID {
		return false
	}
	return true
}

func afterEventCursor(e events.Event, when string, curStarts time.Time, curID string) bool {
	if curID == "" {
		return true
	}
	if when == "past" {
		if e.StartsAt.After(curStarts) {
			return false
		}
		if e.StartsAt.Equal(curStarts) && e.ID >= curID {
			return false
		}
		return true
	}
	if e.StartsAt.Before(curStarts) {
		return false
	}
	if e.StartsAt.Equal(curStarts) && e.ID <= curID {
		return false
	}
	return true
}

func newID() (string, error) {
	id, err := uuid.NewV7()
	if err != nil {
		return uuid.NewString(), nil
	}
	return id.String(), nil
}
