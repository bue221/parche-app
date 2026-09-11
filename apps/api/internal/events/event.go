package events

import (
	"context"
	"encoding/json"
	"time"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/geo"
	"github.com/parche-app/backend/internal/venues"
)

const (
	StatusDraft         = "draft"
	StatusPendingReview = "pending_review"
	StatusPublished     = "published"
	StatusRejected      = "rejected"
	StatusCancelled     = "cancelled"
	StatusArchived      = "archived"

	RoleOwner   = "owner"
	RoleManager = "manager"
	RoleDoor    = "door"
	RoleMetrics = "metrics"

	MemberActive  = "active"
	MemberRevoked = "revoked"

	publicHorizon = 12 * time.Hour
	listCacheTTL  = 30 * time.Second
	listCachePref = "events:list:"
)

// Event is a parche with a venue pin and a lifecycle status.
type Event struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenant_id"`
	Title        string    `json:"title"`
	Slug         string    `json:"slug"`
	Description  string    `json:"description"`
	StartsAt     time.Time `json:"starts_at"`
	EndsAt       time.Time `json:"ends_at"`
	VenueID      string    `json:"venue_id"`
	Status       string    `json:"status"`
	FlyerAssetID string    `json:"flyer_asset_id,omitempty"`
	Genres       []string  `json:"genres"`
	AgePolicy    string    `json:"age_policy,omitempty"`
	CreatedBy    string    `json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
	AddressText string  `json:"address_text,omitempty"`
	VenueName   string  `json:"venue_name,omitempty"`

	Flyer   *Image  `json:"flyer,omitempty"`
	Gallery []Image `json:"gallery,omitempty"`
}

// Image is a public flyer or gallery item (F09). URLs are CDN/public, never object keys.
type Image struct {
	ID        string `json:"id"`
	Kind      string `json:"kind"`
	PublicURL string `json:"public_url"`
	ThumbURL  string `json:"thumb_url,omitempty"`
}

// PublicItem is GET /v1/events: published pins plus agenda fields.
type PublicItem struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Slug        string    `json:"slug,omitempty"`
	StartsAt    time.Time `json:"starts_at"`
	EndsAt      time.Time `json:"ends_at"`
	Status      string    `json:"status"`
	Lat         float64   `json:"lat"`
	Lng         float64   `json:"lng"`
	VenueID     string    `json:"venue_id,omitempty"`
	AddressText string    `json:"address_text,omitempty"`
	Genres      []string  `json:"genres"`
	Flyer       *Image    `json:"flyer,omitempty"`
}

// PinInput creates a venue when the client drops a map pin instead of venue_id.
type PinInput struct {
	Name        string
	AddressText string
	Lat         float64
	Lng         float64
	GeoJSON     json.RawMessage
}

// CreateInput is POST /v1/events. Exactly one of VenueID or Pin.
type CreateInput struct {
	TenantID    string
	Title       string
	Description string
	StartsAt    time.Time
	EndsAt      time.Time
	VenueID     string
	Pin         *PinInput
	Genres      []string
	AgePolicy   string
}

// PatchInput is PATCH /v1/events/{id}. Nil fields stay unchanged.
type PatchInput struct {
	Title       *string
	Description *string
	StartsAt    *time.Time
	EndsAt      *time.Time
	VenueID     *string
	Pin         *PinInput
	Genres      *[]string
	AgePolicy   *string
}

// ListFilter is GET /v1/events (public) and GET /v1/tenants/{id}/events.
type ListFilter struct {
	TenantID string
	Public   bool
	BBox     *geo.BBox
	Cursor   string
	Limit    int
	Now      time.Time
}

// Member is an event-scoped role (F11 expands this).
type Member struct {
	EventID string
	UserID  string
	Role    string
	Status  string
}

// Store persists events and the creating owner row.
type Store interface {
	Create(ctx context.Context, e Event, ownerUserID string) error
	ByID(ctx context.Context, id string) (Event, error)
	Update(ctx context.Context, e Event) error
	List(ctx context.Context, f ListFilter) ([]Event, error)
	Member(ctx context.Context, eventID, userID string) (Member, error)
}

// Tenancy is F06 membership. Store implementations satisfy it.
type Tenancy interface {
	Membership(ctx context.Context, tenantID, userID string) (role string, err error)
	TenantsForUser(ctx context.Context, userID string) ([]auth.TenantView, error)
}

// Venues creates inline pins and counts published uses (F07).
type Venues interface {
	Create(ctx context.Context, userID string, in venues.CreateInput) (venues.Venue, error)
	Get(ctx context.Context, userID, id string) (venues.Venue, error)
	RecordPublishedEvent(ctx context.Context, venueID string, delta int) error
}

// VenueLookup loads a venue by id without visibility rules (same-tenant check is in Service).
type VenueLookup interface {
	ByID(ctx context.Context, id string) (venues.Venue, error)
}

// Cache is Redis (or memory) for the public list. Prefix events:list:.
type Cache interface {
	Get(ctx context.Context, key string) (string, bool, error)
	Set(ctx context.Context, key, val string, ttl time.Duration) error
	DeletePrefix(ctx context.Context, prefix string) error
}

// Media is F09 flyers and gallery. Wired after construction to avoid an import cycle.
type Media interface {
	UsableFlyer(ctx context.Context, eventID, assetID string) error
	EventImages(ctx context.Context, eventIDs ...string) (map[string]EventMedia, error)
}

// EventMedia is the public image payload for one event.
type EventMedia struct {
	Flyer   *Image
	Gallery []Image
}

// FlyerBinder is implemented by Service for media.Confirm (F09).
type FlyerBinder interface {
	BindFlyer(ctx context.Context, eventID, assetID string) (previousAssetID, status string, err error)
	ClearFlyerIf(ctx context.Context, eventID, assetID string) error
	EventStatus(ctx context.Context, eventID string) (status, flyerAssetID string, err error)
}
