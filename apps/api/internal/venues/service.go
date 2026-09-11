package venues

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/geo"
)

const (
	maxName    = 120
	maxAddress = 500
	maxQuery   = 80
)

// Service is F07 venue CRUD and public map lists.
type Service struct {
	Store   Store
	Tenancy Tenancy
}

func NewService(store Store, tenancy Tenancy) *Service {
	return &Service{Store: store, Tenancy: tenancy}
}

func (s *Service) Create(ctx context.Context, userID string, in CreateInput) (Venue, error) {
	if err := s.requireMember(ctx, in.TenantID, userID); err != nil {
		return Venue{}, err
	}
	name := strings.TrimSpace(in.Name)
	addr := strings.TrimSpace(in.AddressText)
	if err := validateNameAddress(name, addr); err != nil {
		return Venue{}, err
	}
	if err := geo.ValidLatLng(in.Lat, in.Lng); err != nil {
		return Venue{}, err
	}
	if err := geo.ValidateGeoJSON(in.GeoJSON); err != nil {
		return Venue{}, err
	}
	src := strings.TrimSpace(in.Source)
	if src == "" {
		src = SourceUserPin
	}
	if src != SourceUserPin {
		return Venue{}, auth.Invalid{Fields: []auth.Field{{Name: "source", Issue: "unsupported"}}}
	}
	id, err := newID()
	if err != nil {
		return Venue{}, err
	}
	kind, err := normalizeKind(in.Kind)
	if err != nil {
		return Venue{}, err
	}
	listed := in.Listed && kind == KindClub
	v := Venue{
		ID:          id,
		TenantID:    in.TenantID,
		Name:        name,
		AddressText: addr,
		Lat:         in.Lat,
		Lng:         in.Lng,
		GeoJSON:     normalizeGeoJSON(in.GeoJSON),
		Source:      SourceUserPin,
		Kind:        kind,
		Listed:      listed,
	}
	if err := s.Store.Create(ctx, v); err != nil {
		return Venue{}, err
	}
	got, err := s.Store.ByID(ctx, id)
	if err != nil {
		return Venue{}, err
	}
	return got, nil
}

func (s *Service) Get(ctx context.Context, userID, id string) (Venue, error) {
	v, err := s.Store.ByID(ctx, id)
	if err != nil {
		return Venue{}, err
	}
	return s.visible(ctx, userID, v)
}

// CreateClub is POST /v1/clubs: a venue with kind=club and listed=true.
func (s *Service) CreateClub(ctx context.Context, userID string, in CreateInput) (Venue, error) {
	in.Kind = KindClub
	in.Listed = true
	return s.Create(ctx, userID, in)
}

// GetClub is GET /v1/clubs/{id}. Public when listed or a published event uses it.
func (s *Service) GetClub(ctx context.Context, userID, id string) (Venue, error) {
	v, err := s.Store.ByID(ctx, id)
	if err != nil {
		return Venue{}, err
	}
	if v.Kind != KindClub {
		return Venue{}, auth.ErrNotFound
	}
	if v.Listed || v.PublishedUses > 0 {
		return v, nil
	}
	return s.visible(ctx, userID, v)
}

// PatchClub is PATCH /v1/clubs/{id} for the tenant owner.
func (s *Service) PatchClub(ctx context.Context, userID, id string, in PatchInput) (Venue, error) {
	v, err := s.Store.ByID(ctx, id)
	if err != nil {
		return Venue{}, err
	}
	if v.Kind != KindClub {
		return Venue{}, auth.ErrNotFound
	}
	if err := s.requireOwner(ctx, v.TenantID, userID); err != nil {
		return Venue{}, err
	}
	return s.patchVenue(ctx, v, in)
}

// ListClubs is GET /v1/clubs: kind=club and (listed or ≥1 published event).
func (s *Service) ListClubs(ctx context.Context, f ListFilter) ([]Venue, error) {
	f.Kind = KindClub
	f.Directory = true
	f.TenantID = ""
	return s.List(ctx, "", f)
}

func (s *Service) Patch(ctx context.Context, userID, id string, in PatchInput) (Venue, error) {
	v, err := s.Store.ByID(ctx, id)
	if err != nil {
		return Venue{}, err
	}
	if err := s.requireMember(ctx, v.TenantID, userID); err != nil {
		if errors.Is(err, auth.ErrForbidden) {
			return Venue{}, err
		}
		return Venue{}, auth.ErrNotFound
	}
	return s.patchVenue(ctx, v, in)
}

func (s *Service) List(ctx context.Context, userID string, f ListFilter) ([]Venue, error) {
	if utf8.RuneCountInString(f.Q) > maxQuery {
		return nil, auth.Invalid{Fields: []auth.Field{{Name: "q", Issue: "length"}}}
	}
	if f.Limit < 1 {
		f.Limit = 20
	}
	if f.TenantID != "" {
		if userID == "" {
			return nil, auth.ErrUnauthorized
		}
		if err := s.requireMember(ctx, f.TenantID, userID); err != nil {
			return nil, err
		}
	}
	items, err := s.Store.List(ctx, f)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []Venue{}
	}
	return items, nil
}

// RecordPublishedEvent adjusts the public-map counter. F08 calls this on publish/unpublish.
func (s *Service) RecordPublishedEvent(ctx context.Context, venueID string, delta int) error {
	if delta == 0 {
		return nil
	}
	return s.Store.AdjustPublishedUses(ctx, venueID, delta)
}

func (s *Service) visible(ctx context.Context, userID string, v Venue) (Venue, error) {
	if v.PublishedUses > 0 || v.Listed {
		return v, nil
	}
	if userID == "" {
		return Venue{}, auth.ErrNotFound
	}
	if err := s.requireMember(ctx, v.TenantID, userID); err != nil {
		return Venue{}, auth.ErrNotFound
	}
	return v, nil
}

func (s *Service) patchVenue(ctx context.Context, v Venue, in PatchInput) (Venue, error) {
	if in.Name == nil && in.AddressText == nil && in.Lat == nil && in.Lng == nil && in.GeoJSON == nil && in.Kind == nil && in.Listed == nil {
		return Venue{}, auth.Invalid{Fields: []auth.Field{{Name: "body", Issue: "empty"}}}
	}
	if in.Name != nil {
		v.Name = strings.TrimSpace(*in.Name)
	}
	if in.AddressText != nil {
		v.AddressText = strings.TrimSpace(*in.AddressText)
	}
	if err := validateNameAddress(v.Name, v.AddressText); err != nil {
		return Venue{}, err
	}
	if (in.Lat == nil) != (in.Lng == nil) {
		return Venue{}, auth.Invalid{Fields: []auth.Field{{Name: "lat", Issue: "pair"}, {Name: "lng", Issue: "pair"}}}
	}
	if in.Lat != nil {
		if err := geo.ValidLatLng(*in.Lat, *in.Lng); err != nil {
			return Venue{}, err
		}
		v.Lat, v.Lng = *in.Lat, *in.Lng
	}
	if in.GeoJSON != nil {
		if err := geo.ValidateGeoJSON(*in.GeoJSON); err != nil {
			return Venue{}, err
		}
		v.GeoJSON = normalizeGeoJSON(*in.GeoJSON)
	}
	if in.Kind != nil {
		kind, err := normalizeKind(*in.Kind)
		if err != nil {
			return Venue{}, err
		}
		v.Kind = kind
	}
	if in.Listed != nil {
		v.Listed = *in.Listed
	}
	if v.Kind != KindClub {
		v.Listed = false
	}
	if err := s.Store.Update(ctx, v); err != nil {
		return Venue{}, err
	}
	return s.Store.ByID(ctx, v.ID)
}

func (s *Service) requireMember(ctx context.Context, tenantID, userID string) error {
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

func (s *Service) requireOwner(ctx context.Context, tenantID, userID string) error {
	if s.Tenancy == nil {
		return auth.ErrForbidden
	}
	if strings.TrimSpace(tenantID) == "" || strings.TrimSpace(userID) == "" {
		return auth.ErrNotFound
	}
	role, err := s.Tenancy.Membership(ctx, tenantID, userID)
	if err != nil {
		if errors.Is(err, auth.ErrNotFound) {
			return auth.ErrNotFound
		}
		return err
	}
	if role != auth.TenantOwner {
		return auth.ErrForbidden
	}
	return nil
}

func normalizeKind(kind string) (string, error) {
	k := strings.ToLower(strings.TrimSpace(kind))
	if k == "" {
		return KindOther, nil
	}
	if k != KindClub && k != KindOther {
		return "", auth.Invalid{Fields: []auth.Field{{Name: "kind", Issue: "invalid"}}}
	}
	return k, nil
}

func validateNameAddress(name, addr string) error {
	var fields []auth.Field
	if name == "" || utf8.RuneCountInString(name) > maxName {
		fields = append(fields, auth.Field{Name: "name", Issue: "invalid"})
	}
	if utf8.RuneCountInString(addr) > maxAddress {
		fields = append(fields, auth.Field{Name: "address_text", Issue: "length"})
	}
	if len(fields) > 0 {
		return auth.Invalid{Fields: fields}
	}
	return nil
}

func normalizeGeoJSON(raw json.RawMessage) json.RawMessage {
	trim := strings.TrimSpace(string(raw))
	if trim == "" || trim == "null" {
		return nil
	}
	return json.RawMessage(trim)
}

func newID() (string, error) {
	id, err := uuid.NewV7()
	if err != nil {
		return uuid.NewString(), nil
	}
	return id.String(), nil
}

func likeContains(q string) string {
	q = strings.ToLower(strings.TrimSpace(q))
	return q
}
