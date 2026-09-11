package events

import (
	"context"
	"encoding/base64"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/geo"
	"github.com/parche-app/backend/internal/mailer"
	"github.com/parche-app/backend/internal/payments"
	"github.com/parche-app/backend/internal/ticketsign"
	"github.com/parche-app/backend/internal/venues"
)

const (
	maxTitle       = 120
	maxDescription = 20000
	maxAgePolicy   = 80
	maxGenres      = 16
	maxGenreLen    = 32
)

// Service is F08 event lifecycle, public agenda, EventWrite, F11 members, and F15 ticket types.
type Service struct {
	Store     Store
	Tenancy   Tenancy
	Venues    Venues
	Lookup    VenueLookup
	Cache     Cache
	Media     Media
	Lineup    Lineup
	Mailer    mailer.Sender
	AppOrigin string
	Pepper    []byte
	Payments  payments.Provider
	Tickets   ticketsign.Keys
	Publisher Queue
	Now       func() time.Time
}

func NewService(store Store, tenancy Tenancy, v Venues, lookup VenueLookup, cache Cache) *Service {
	return &Service{
		Store:   store,
		Tenancy: tenancy,
		Venues:  v,
		Lookup:  lookup,
		Cache:   cache,
		Now:     func() time.Time { return time.Now().UTC() },
	}
}

func (s *Service) now() time.Time {
	if s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func (s *Service) Create(ctx context.Context, userID string, in CreateInput) (Event, error) {
	if err := s.requireCanCreate(ctx, userID); err != nil {
		return Event{}, err
	}
	if err := s.requireTenantMember(ctx, in.TenantID, userID); err != nil {
		return Event{}, err
	}
	title := strings.TrimSpace(in.Title)
	desc := strings.TrimSpace(in.Description)
	age := strings.TrimSpace(in.AgePolicy)
	genres, err := normalizeGenres(in.Genres)
	if err != nil {
		return Event{}, err
	}
	if err := validateTitleDescAge(title, desc, age); err != nil {
		return Event{}, err
	}
	if err := validateDates(in.StartsAt, in.EndsAt); err != nil {
		return Event{}, err
	}
	venueID, err := s.resolveVenue(ctx, userID, in.TenantID, in.VenueID, in.Pin)
	if err != nil {
		return Event{}, err
	}
	id, err := newID()
	if err != nil {
		return Event{}, err
	}
	e := Event{
		ID:          id,
		TenantID:    in.TenantID,
		Title:       title,
		Slug:        eventSlug(title, slugSuffix(id)),
		Description: desc,
		StartsAt:    in.StartsAt.UTC(),
		EndsAt:      in.EndsAt.UTC(),
		VenueID:     venueID,
		Status:      StatusDraft,
		Genres:      genres,
		AgePolicy:   age,
		CreatedBy:   userID,
	}
	e = s.attachVenue(ctx, userID, e)
	if err := s.Store.Create(ctx, e, userID); err != nil {
		if errors.Is(err, auth.ErrConflict) {
			return Event{}, auth.ErrConflict
		}
		return Event{}, err
	}
	return s.loaded(ctx, userID, id)
}

func (s *Service) Get(ctx context.Context, userID, id string) (Event, error) {
	e, err := s.Store.ByID(ctx, id)
	if err != nil {
		return Event{}, err
	}
	switch e.Status {
	case StatusPublished, StatusCancelled:
		return s.attachMedia(ctx, s.attachVenue(ctx, userID, e)), nil
	}
	if userID == "" {
		return Event{}, auth.ErrNotFound
	}
	if _, err := s.memberRole(ctx, id, userID); err != nil {
		return Event{}, auth.ErrNotFound
	}
	return s.attachMedia(ctx, s.attachVenue(ctx, userID, e)), nil
}

func (s *Service) Patch(ctx context.Context, userID, id string, in PatchInput) (Event, error) {
	e, err := s.requireWrite(ctx, userID, id)
	if err != nil {
		return Event{}, err
	}
	if in.Title == nil && in.Description == nil && in.StartsAt == nil && in.EndsAt == nil &&
		in.VenueID == nil && in.Pin == nil && in.Genres == nil && in.AgePolicy == nil {
		return Event{}, auth.Invalid{Fields: []auth.Field{{Name: "body", Issue: "empty"}}}
	}
	if e.Status == StatusCancelled || e.Status == StatusArchived {
		return Event{}, auth.ErrConflict
	}
	prevVenue := e.VenueID
	wasPublished := e.Status == StatusPublished
	scheduleOrVenue := false
	if in.Title != nil {
		e.Title = strings.TrimSpace(*in.Title)
	}
	if in.Description != nil {
		e.Description = strings.TrimSpace(*in.Description)
	}
	if in.AgePolicy != nil {
		e.AgePolicy = strings.TrimSpace(*in.AgePolicy)
	}
	if in.Genres != nil {
		genres, err := normalizeGenres(*in.Genres)
		if err != nil {
			return Event{}, err
		}
		e.Genres = genres
	}
	if err := validateTitleDescAge(e.Title, e.Description, e.AgePolicy); err != nil {
		return Event{}, err
	}
	starts, ends := e.StartsAt, e.EndsAt
	if in.StartsAt != nil {
		starts = *in.StartsAt
		scheduleOrVenue = true
	}
	if in.EndsAt != nil {
		ends = *in.EndsAt
		scheduleOrVenue = true
	}
	if err := validateDates(starts, ends); err != nil {
		return Event{}, err
	}
	e.StartsAt, e.EndsAt = starts.UTC(), ends.UTC()
	if in.VenueID != nil || in.Pin != nil {
		scheduleOrVenue = true
		vid, err := s.resolveVenue(ctx, userID, e.TenantID, deref(in.VenueID), in.Pin)
		if err != nil {
			return Event{}, err
		}
		e.VenueID = vid
	}
	if wasPublished && scheduleOrVenue {
		if err := s.Venues.RecordPublishedEvent(ctx, prevVenue, -1); err != nil {
			return Event{}, err
		}
		e.Status = StatusPendingReview
	}
	e = s.attachVenue(ctx, userID, e)
	if err := s.Store.Update(ctx, e); err != nil {
		return Event{}, err
	}
	if wasPublished {
		s.invalidateList(ctx)
	}
	return s.loaded(ctx, userID, id)
}

func (s *Service) Submit(ctx context.Context, userID, id string) error {
	e, err := s.requirePublish(ctx, userID, id)
	if err != nil {
		return err
	}
	switch e.Status {
	case StatusPendingReview:
		return nil
	case StatusDraft, StatusRejected:
	default:
		return auth.ErrConflict
	}
	if err := s.requirePin(ctx, userID, e); err != nil {
		return err
	}
	if err := s.requireFlyer(ctx, e); err != nil {
		return err
	}
	if strings.TrimSpace(e.Title) == "" {
		return auth.Invalid{Fields: []auth.Field{{Name: "title", Issue: "required"}}}
	}
	if err := validateDates(e.StartsAt, e.EndsAt); err != nil {
		return err
	}
	e.Status = StatusPendingReview
	return s.Store.Update(ctx, e)
}

// Publish is pending_review → published. F27 will expose admin HTTP; tests call this so GET /v1/events works.
func (s *Service) Publish(ctx context.Context, id string) (Event, error) {
	e, err := s.Store.ByID(ctx, id)
	if err != nil {
		return Event{}, err
	}
	if e.Status != StatusPendingReview {
		return Event{}, auth.ErrConflict
	}
	if err := s.requirePin(ctx, e.CreatedBy, e); err != nil {
		return Event{}, err
	}
	if err := s.requireFlyer(ctx, e); err != nil {
		return Event{}, err
	}
	e.Status = StatusPublished
	if err := s.Store.Update(ctx, e); err != nil {
		return Event{}, err
	}
	if err := s.Venues.RecordPublishedEvent(ctx, e.VenueID, 1); err != nil {
		return Event{}, err
	}
	s.invalidateList(ctx)
	return s.loaded(ctx, e.CreatedBy, id)
}

func (s *Service) Cancel(ctx context.Context, userID, id string) error {
	e, err := s.Store.ByID(ctx, id)
	if err != nil {
		return err
	}
	role, err := s.memberRole(ctx, id, userID)
	if err != nil {
		if e.Status == StatusPublished || e.Status == StatusCancelled {
			return auth.ErrForbidden
		}
		return auth.ErrNotFound
	}
	if role != RoleOwner {
		return auth.ErrForbidden
	}
	if e.Status != StatusPublished {
		return auth.ErrConflict
	}
	e.Status = StatusCancelled
	if err := s.Store.Update(ctx, e); err != nil {
		return err
	}
	if err := s.Venues.RecordPublishedEvent(ctx, e.VenueID, -1); err != nil {
		return err
	}
	s.invalidateList(ctx)
	return nil
}

func (s *Service) ListPublic(ctx context.Context, f ListFilter) ([]Event, error) {
	f.Public = true
	f.Now = s.now()
	if f.Limit < 1 {
		f.Limit = 20
	}
	items, err := s.Store.List(ctx, f)
	if err != nil {
		return nil, err
	}
	return s.attachAll(ctx, "", items), nil
}

func (s *Service) ListTenant(ctx context.Context, userID, tenantID string, f ListFilter) ([]Event, error) {
	if err := s.requireTenantMember(ctx, tenantID, userID); err != nil {
		return nil, err
	}
	f.TenantID = tenantID
	f.Public = false
	if f.Limit < 1 {
		f.Limit = 20
	}
	items, err := s.Store.List(ctx, f)
	if err != nil {
		return nil, err
	}
	return s.attachAll(ctx, userID, items), nil
}

func (s *Service) CachedPublicJSON(ctx context.Context, query string, miss func() ([]byte, error)) ([]byte, error) {
	key := listCacheKey(query)
	if s.Cache != nil {
		if raw, ok, err := s.Cache.Get(ctx, key); err == nil && ok {
			return []byte(raw), nil
		}
	}
	body, err := miss()
	if err != nil {
		return nil, err
	}
	if s.Cache != nil {
		_ = s.Cache.Set(ctx, key, string(body), listCacheTTL)
	}
	return body, nil
}

// Authorize implements httpserver.EventWrite via event.write (owner and manager).
func (s *Service) Authorize(ctx context.Context, userID, eventID string) (string, error) {
	e, err := s.requirePerm(ctx, userID, eventID, PermWrite)
	if err != nil {
		return "", err
	}
	return e.TenantID, nil
}

func (s *Service) requireFlyer(ctx context.Context, e Event) error {
	if strings.TrimSpace(e.FlyerAssetID) == "" {
		return auth.Invalid{Fields: []auth.Field{{Name: "flyer", Issue: "required"}}}
	}
	if s.Media == nil {
		return nil
	}
	if err := s.Media.UsableFlyer(ctx, e.ID, e.FlyerAssetID); err != nil {
		return err
	}
	return nil
}

func (s *Service) BindFlyer(ctx context.Context, eventID, assetID string) (string, string, error) {
	e, err := s.Store.ByID(ctx, eventID)
	if err != nil {
		return "", "", err
	}
	prev := e.FlyerAssetID
	e.FlyerAssetID = assetID
	if err := s.Store.Update(ctx, e); err != nil {
		return "", "", err
	}
	if e.Status == StatusPublished {
		s.invalidateList(ctx)
	}
	return prev, e.Status, nil
}

func (s *Service) ClearFlyerIf(ctx context.Context, eventID, assetID string) error {
	e, err := s.Store.ByID(ctx, eventID)
	if err != nil {
		return err
	}
	if e.FlyerAssetID != assetID {
		return nil
	}
	e.FlyerAssetID = ""
	if err := s.Store.Update(ctx, e); err != nil {
		return err
	}
	if e.Status == StatusPublished {
		s.invalidateList(ctx)
	}
	return nil
}

func (s *Service) EventStatus(ctx context.Context, eventID string) (string, string, error) {
	e, err := s.Store.ByID(ctx, eventID)
	if err != nil {
		return "", "", err
	}
	return e.Status, e.FlyerAssetID, nil
}

func (s *Service) requirePin(ctx context.Context, userID string, e Event) error {
	if strings.TrimSpace(e.VenueID) == "" {
		return auth.Invalid{Fields: []auth.Field{{Name: "venue_id", Issue: "required"}}}
	}
	v, err := s.lookupVenue(ctx, userID, e.VenueID)
	if err != nil {
		return auth.Invalid{Fields: []auth.Field{{Name: "lat", Issue: "required"}, {Name: "lng", Issue: "required"}}}
	}
	lat, lng := v.Lat, v.Lng
	return geo.RequirePin(&lat, &lng)
}

func (s *Service) loaded(ctx context.Context, userID, id string) (Event, error) {
	e, err := s.Store.ByID(ctx, id)
	if err != nil {
		return Event{}, err
	}
	return s.attachMedia(ctx, s.attachVenue(ctx, userID, e)), nil
}

func (s *Service) attachAll(ctx context.Context, userID string, items []Event) []Event {
	if items == nil {
		return []Event{}
	}
	ids := make([]string, 0, len(items))
	for _, e := range items {
		ids = append(ids, e.ID)
	}
	var images map[string]EventMedia
	if s.Media != nil {
		images, _ = s.Media.EventImages(ctx, ids...)
	}
	out := make([]Event, 0, len(items))
	for _, e := range items {
		e = s.attachVenue(ctx, userID, e)
		if images != nil {
			em := images[e.ID]
			e.Flyer = em.Flyer
			e.Gallery = em.Gallery
			if e.Gallery == nil {
				e.Gallery = []Image{}
			}
		}
		out = append(out, e)
	}
	return out
}

func (s *Service) attachVenue(ctx context.Context, userID string, e Event) Event {
	v, err := s.lookupVenue(ctx, userID, e.VenueID)
	if err != nil {
		return e
	}
	e.Lat, e.Lng = v.Lat, v.Lng
	e.AddressText = v.AddressText
	e.VenueName = v.Name
	return e
}

func (s *Service) attachImages(ctx context.Context, e Event) Event {
	if s.Media == nil {
		return e
	}
	got, err := s.Media.EventImages(ctx, e.ID)
	if err != nil {
		return e
	}
	em := got[e.ID]
	e.Flyer = em.Flyer
	e.Gallery = em.Gallery
	if e.Gallery == nil {
		e.Gallery = []Image{}
	}
	return e
}

func (s *Service) attachTracks(ctx context.Context, e Event) Event {
	if s.Media == nil {
		if e.Tracks == nil {
			e.Tracks = []Track{}
		}
		return e
	}
	got, err := s.Media.EventTracks(ctx, e.ID)
	if err != nil {
		if e.Tracks == nil {
			e.Tracks = []Track{}
		}
		return e
	}
	e.Tracks = got[e.ID]
	if e.Tracks == nil {
		e.Tracks = []Track{}
	}
	return e
}

func (s *Service) attachMedia(ctx context.Context, e Event) Event {
	e = s.attachTracks(ctx, s.attachImages(ctx, e))
	return s.attachLineup(ctx, e)
}

func (s *Service) attachLineup(ctx context.Context, e Event) Event {
	if s.Lineup == nil {
		if e.Lineup == nil {
			e.Lineup = []LineupSlot{}
		}
		return e
	}
	slots, err := s.Lineup.EventLineup(ctx, e.ID)
	if err != nil || slots == nil {
		e.Lineup = []LineupSlot{}
		return e
	}
	e.Lineup = slots
	return e
}

func (s *Service) lookupVenue(ctx context.Context, userID, id string) (venues.Venue, error) {
	if s.Lookup != nil {
		return s.Lookup.ByID(ctx, id)
	}
	if s.Venues == nil {
		return venues.Venue{}, auth.ErrNotFound
	}
	return s.Venues.Get(ctx, userID, id)
}

func (s *Service) resolveVenue(ctx context.Context, userID, tenantID, venueID string, pin *PinInput) (string, error) {
	hasID := strings.TrimSpace(venueID) != ""
	hasPin := pin != nil
	if hasID == hasPin {
		return "", auth.Invalid{Fields: []auth.Field{{Name: "venue", Issue: "venue_or_pin"}}}
	}
	if hasPin {
		name := strings.TrimSpace(pin.Name)
		if name == "" {
			name = "Pin"
		}
		v, err := s.Venues.Create(ctx, userID, venues.CreateInput{
			TenantID:    tenantID,
			Name:        name,
			AddressText: pin.AddressText,
			Lat:         pin.Lat,
			Lng:         pin.Lng,
			GeoJSON:     pin.GeoJSON,
			Source:      venues.SourceUserPin,
		})
		if err != nil {
			return "", err
		}
		return v.ID, nil
	}
	v, err := s.lookupVenue(ctx, userID, venueID)
	if err != nil {
		return "", auth.ErrNotFound
	}
	if v.TenantID != tenantID {
		return "", auth.ErrNotFound
	}
	return v.ID, nil
}

func (s *Service) requireCanCreate(ctx context.Context, userID string) error {
	if s.Tenancy == nil {
		return auth.ErrForbidden
	}
	tenants, err := s.Tenancy.TenantsForUser(ctx, userID)
	if err != nil {
		return err
	}
	if len(tenants) == 0 {
		return auth.ErrForbidden
	}
	return nil
}

func (s *Service) requireTenantMember(ctx context.Context, tenantID, userID string) error {
	if s.Tenancy == nil {
		return auth.ErrForbidden
	}
	if strings.TrimSpace(tenantID) == "" || strings.TrimSpace(userID) == "" {
		return auth.ErrNotFound
	}
	_, err := s.Tenancy.Membership(ctx, tenantID, userID)
	if err != nil {
		if errors.Is(err, auth.ErrNotFound) {
			return auth.ErrNotFound
		}
		return err
	}
	return nil
}

func (s *Service) memberRole(ctx context.Context, eventID, userID string) (string, error) {
	m, err := s.Store.Member(ctx, eventID, userID)
	if err != nil {
		return "", err
	}
	if m.Status != MemberActive {
		return "", auth.ErrNotFound
	}
	return m.Role, nil
}

func (s *Service) requireWrite(ctx context.Context, userID, id string) (Event, error) {
	return s.requirePerm(ctx, userID, id, PermWrite)
}

func (s *Service) requirePublish(ctx context.Context, userID, id string) (Event, error) {
	return s.requirePerm(ctx, userID, id, PermPublish)
}

func (s *Service) invalidateList(ctx context.Context) {
	if s.Cache == nil {
		return
	}
	_ = s.Cache.DeletePrefix(ctx, listCachePref)
}

func validateTitleDescAge(title, desc, age string) error {
	var fields []auth.Field
	if title == "" || utf8.RuneCountInString(title) > maxTitle {
		fields = append(fields, auth.Field{Name: "title", Issue: "invalid"})
	}
	if utf8.RuneCountInString(desc) > maxDescription {
		fields = append(fields, auth.Field{Name: "description", Issue: "length"})
	}
	if utf8.RuneCountInString(age) > maxAgePolicy {
		fields = append(fields, auth.Field{Name: "age_policy", Issue: "length"})
	}
	if len(fields) > 0 {
		return auth.Invalid{Fields: fields}
	}
	return nil
}

func validateDates(starts, ends time.Time) error {
	if starts.IsZero() {
		return auth.Invalid{Fields: []auth.Field{{Name: "starts_at", Issue: "required"}}}
	}
	if ends.IsZero() {
		return auth.Invalid{Fields: []auth.Field{{Name: "ends_at", Issue: "required"}}}
	}
	if !ends.After(starts) {
		return auth.Invalid{Fields: []auth.Field{{Name: "ends_at", Issue: "order"}}}
	}
	return nil
}

func normalizeGenres(in []string) ([]string, error) {
	if len(in) > maxGenres {
		return nil, auth.Invalid{Fields: []auth.Field{{Name: "genres", Issue: "max"}}}
	}
	out := make([]string, 0, len(in))
	seen := map[string]struct{}{}
	for _, g := range in {
		g = strings.ToLower(strings.TrimSpace(g))
		if g == "" {
			continue
		}
		if utf8.RuneCountInString(g) > maxGenreLen {
			return nil, auth.Invalid{Fields: []auth.Field{{Name: "genres", Issue: "length"}}}
		}
		if _, ok := seen[g]; ok {
			continue
		}
		seen[g] = struct{}{}
		out = append(out, g)
	}
	if out == nil {
		out = []string{}
	}
	return out, nil
}

func newID() (string, error) {
	id, err := uuid.NewV7()
	if err != nil {
		return uuid.NewString(), nil
	}
	return id.String(), nil
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func ToPublic(e Event) PublicItem {
	g := e.Genres
	if g == nil {
		g = []string{}
	}
	return PublicItem{
		ID:          e.ID,
		Title:       e.Title,
		Slug:        e.Slug,
		StartsAt:    e.StartsAt,
		EndsAt:      e.EndsAt,
		Status:      e.Status,
		Lat:         e.Lat,
		Lng:         e.Lng,
		VenueID:     e.VenueID,
		AddressText: e.AddressText,
		Genres:      g,
		Flyer:       e.Flyer,
	}
}

func EncodeCursor(starts time.Time, id string) string {
	raw := starts.UTC().Format(time.RFC3339Nano) + "|" + id
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

func DecodeCursor(cur string) (time.Time, string, error) {
	if strings.TrimSpace(cur) == "" {
		return time.Time{}, "", nil
	}
	b, err := base64.RawURLEncoding.DecodeString(cur)
	if err != nil {
		return time.Time{}, "", auth.Invalid{Fields: []auth.Field{{Name: "cursor", Issue: "invalid"}}}
	}
	parts := strings.SplitN(string(b), "|", 2)
	if len(parts) != 2 {
		return time.Time{}, "", auth.Invalid{Fields: []auth.Field{{Name: "cursor", Issue: "invalid"}}}
	}
	ts, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return time.Time{}, "", auth.Invalid{Fields: []auth.Field{{Name: "cursor", Issue: "invalid"}}}
	}
	return ts, parts[1], nil
}

func NextCursor(items []Event, limit int) *string {
	if limit < 1 || len(items) < limit {
		return nil
	}
	last := items[len(items)-1]
	c := EncodeCursor(last.StartsAt, last.ID)
	return &c
}

func publicWindowStart(now time.Time) time.Time {
	return now.Add(-publicHorizon)
}

func afterCursor(e Event, ts time.Time, id string) bool {
	if ts.IsZero() && id == "" {
		return true
	}
	if e.StartsAt.After(ts) {
		return true
	}
	if e.StartsAt.Equal(ts) && e.ID > id {
		return true
	}
	return false
}

func cloneGenres(g []string) []string {
	if g == nil {
		return []string{}
	}
	out := make([]string, len(g))
	copy(out, g)
	return out
}
