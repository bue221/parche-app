package venues

import (
	"context"
	"encoding/json"
	"time"

	"github.com/parche-app/backend/internal/geo"
)

const SourceUserPin = "user_pin"

// Venue is a reusable place. lat/lng are WGS84. GeoJSON is Point or Polygon.
type Venue struct {
	ID            string          `json:"id"`
	TenantID      string          `json:"tenant_id"`
	Name          string          `json:"name"`
	AddressText   string          `json:"address_text"`
	Lat           float64         `json:"lat"`
	Lng           float64         `json:"lng"`
	GeoJSON       json.RawMessage `json:"geojson,omitempty"`
	Source        string          `json:"source"`
	CreatedAt     time.Time       `json:"created_at"`
	PublishedUses int             `json:"-"`
}

// CreateInput is POST /v1/venues.
type CreateInput struct {
	TenantID    string
	Name        string
	AddressText string
	Lat         float64
	Lng         float64
	GeoJSON     json.RawMessage
	Source      string
}

// PatchInput is PATCH /v1/venues/{id}. Nil fields stay unchanged.
type PatchInput struct {
	Name        *string
	AddressText *string
	Lat         *float64
	Lng         *float64
	GeoJSON     *json.RawMessage
}

// ListFilter is GET /v1/venues.
type ListFilter struct {
	Q        string
	BBox     *geo.BBox
	TenantID string
	Cursor   string
	Limit    int
}

// Store persists venues. Implementations must not talk to Google or other map vendors.
type Store interface {
	Create(ctx context.Context, v Venue) error
	ByID(ctx context.Context, id string) (Venue, error)
	Update(ctx context.Context, v Venue) error
	List(ctx context.Context, f ListFilter) ([]Venue, error)
	AdjustPublishedUses(ctx context.Context, id string, delta int) error
}

// Tenancy is tenant membership from F06.
type Tenancy interface {
	Membership(ctx context.Context, tenantID, userID string) (role string, err error)
}
