package artists

import (
	"context"
	"time"

	"github.com/parche-app/backend/internal/events"
)

const (
	maxName = 80
	maxBio  = 2000
	maxLink = 500
)

// Links are public social URLs or handles. Email never lives here.
type Links struct {
	Instagram  string `json:"instagram,omitempty"`
	Soundcloud string `json:"soundcloud,omitempty"`
}

// Artist is the public DJ/act document (F12). UserID and TenantID are ownership, not contact.
type Artist struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id,omitempty"`
	TenantID      string    `json:"tenant_id,omitempty"`
	Name          string    `json:"name"`
	Bio           string    `json:"bio"`
	AvatarAssetID string    `json:"avatar_asset_id,omitempty"`
	Links         Links     `json:"links"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	Avatar   *events.Image       `json:"avatar,omitempty"`
	Upcoming []events.PublicItem `json:"upcoming,omitempty"`
}

// Slot is one lineup row (event_artists).
type Slot struct {
	EventID      string
	ArtistID     string
	Name         string
	BillingOrder int
	StartsAt     *time.Time
	Avatar       *events.Image
}

// CreateInput is POST /v1/artists.
type CreateInput struct {
	Name     string
	Bio      string
	Links    Links
	TenantID string
}

// PatchInput is PATCH /v1/artists/{id}. Nil fields stay unchanged.
type PatchInput struct {
	Name  *string
	Bio   *string
	Links *Links
}

// LineupInput is POST /v1/events/{id}/artists.
type LineupInput struct {
	ArtistID     string
	BillingOrder int
	StartsAt     *time.Time
}

// EventFilter is GET /v1/artists/{id}/events.
type EventFilter struct {
	When   string
	Cursor string
	Limit  int
	Now    time.Time
}

// Store persists artists and lineup slots.
type Store interface {
	Create(ctx context.Context, a Artist) error
	ByID(ctx context.Context, id string) (Artist, error)
	ByUserID(ctx context.Context, userID string) (Artist, error)
	Update(ctx context.Context, a Artist) error
	AddSlot(ctx context.Context, sl Slot) error
	RemoveSlot(ctx context.Context, eventID, artistID string) error
	SlotsByEvent(ctx context.Context, eventID string) ([]Slot, error)
	SlotsByArtist(ctx context.Context, artistID string) ([]Slot, error)
}

// Accounts is F06 profiles and tenant membership. auth.Store satisfies it.
type Accounts interface {
	Profiles(ctx context.Context, userID string) ([]string, error)
	Membership(ctx context.Context, tenantID, userID string) (role string, err error)
}

// Catalog loads published event detail for artist pages. events.Service.Get satisfies it.
type Catalog interface {
	Get(ctx context.Context, userID, id string) (events.Event, error)
}

// Avatars resolves public image URLs for avatar_asset_id.
type Avatars interface {
	Image(ctx context.Context, assetID string) (*events.Image, error)
}
