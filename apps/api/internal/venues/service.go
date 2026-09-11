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
	v := Venue{
		ID:          id,
		TenantID:    in.TenantID,
		Name:        name,
		AddressText: addr,
		Lat:         in.Lat,
		Lng:         in.Lng,
		GeoJSON:     normalizeGeoJSON(in.GeoJSON),
		Source:      SourceUserPin,
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
	if v.PublishedUses > 0 {
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
	if in.Name == nil && in.AddressText == nil && in.Lat == nil && in.Lng == nil && in.GeoJSON == nil {
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
	if err := s.Store.Update(ctx, v); err != nil {
		return Venue{}, err
	}
	return s.Store.ByID(ctx, id)
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
