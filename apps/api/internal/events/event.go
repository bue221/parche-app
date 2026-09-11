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

	Flyer   *Image       `json:"flyer,omitempty"`
	Gallery []Image      `json:"gallery,omitempty"`
	Tracks  []Track      `json:"tracks,omitempty"`
	Lineup  []LineupSlot `json:"lineup,omitempty"`
}

// LineupSlot is one billed artist on an event (F12).
type LineupSlot struct {
	ArtistID     string     `json:"artist_id"`
	Name         string     `json:"name"`
	BillingOrder int        `json:"billing_order"`
	StartsAt     *time.Time `json:"starts_at,omitempty"`
	Avatar       *Image     `json:"avatar,omitempty"`
}

// Track is a public reference-audio row. Preview URLs are short-lived; never a master URL.
type Track struct {
	ID               string     `json:"id"`
	Title            string     `json:"title"`
	Position         int        `json:"position"`
	DurationMS       int        `json:"duration_ms,omitempty"`
	PreviewURL       string     `json:"preview_url,omitempty"`
	PreviewExpiresAt *time.Time `json:"preview_expires_at,omitempty"`
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

// Member is an event-scoped role. Status is active or revoked (pending lives on Invite).
type Member struct {
	EventID string
	UserID  string
	Role    string
	Status  string
}

// MemberView is GET /v1/events/{id}/members.
type MemberView struct {
	UserID      string `json:"user_id"`
	DisplayName string `json:"display_name"`
	Role        string `json:"role"`
	Status      string `json:"status"`
}

// Invite is a pending email invite (7 days). TokenHash is never the mail value.
type Invite struct {
	ID            string
	EventID       string
	Email         string
	InvitedUserID string
	Role          string
	TokenHash     string
	ExpiresAt     time.Time
	AcceptedAt    *time.Time
	InvitedBy     string
}

// InviteCreated is POST /v1/events/{id}/members (201).
type InviteCreated struct {
	ID        string    `json:"id"`
	ExpiresAt time.Time `json:"expires_at"`
}

// InviteInput is POST /v1/events/{id}/members. Exactly one of Email or UserID.
type InviteInput struct {
	Email  string
	UserID string
	Role   string
}

// Store persists events, members, and pending invites.
type Store interface {
	Create(ctx context.Context, e Event, ownerUserID string) error
	ByID(ctx context.Context, id string) (Event, error)
	Update(ctx context.Context, e Event) error
	List(ctx context.Context, f ListFilter) ([]Event, error)
	Member(ctx context.Context, eventID, userID string) (Member, error)
	ListMembers(ctx context.Context, eventID string) ([]Member, error)
	ListActiveByUser(ctx context.Context, userID string) ([]Member, error)
	UpsertMember(ctx context.Context, m Member) error
	ActiveOwnerCount(ctx context.Context, eventID string) (int, error)
	CreateInvite(ctx context.Context, in Invite) error
	InviteByTokenHash(ctx context.Context, hash string) (Invite, error)
	PendingInvite(ctx context.Context, eventID, email string) (Invite, error)
	AcceptInvite(ctx context.Context, inviteID string, member Member, at time.Time) error
	ListTicketTypes(ctx context.Context, eventID string) ([]TicketType, error)
	PutTicketTypes(ctx context.Context, eventID string, upsert []TicketType, archiveIDs, deleteIDs []string) error
	CreateReservedOrder(ctx context.Context, o Order, items []OrderItem, tickets []Ticket) error
	OrderByID(ctx context.Context, id string) (Order, error)
	OrderByIdempotency(ctx context.Context, userID, eventID, key string) (Order, error)
	ListOrderItems(ctx context.Context, orderID string) ([]OrderItem, error)
	ListTicketsByOrder(ctx context.Context, orderID string) ([]Ticket, error)
	ListTicketsByUser(ctx context.Context, userID string) ([]Ticket, error)
	TicketByID(ctx context.Context, id string) (Ticket, error)
	SetTicketJTI(ctx context.Context, ticketID, jti string) error
	TransferValidTicket(ctx context.Context, ticketID, fromUserID, toUserID, newJTI string, now time.Time) (Ticket, error)
	CreateTicketClaim(ctx context.Context, in TicketClaim) error
	TicketClaimByTokenHash(ctx context.Context, hash string) (TicketClaim, error)
	PendingTicketClaim(ctx context.Context, ticketID string) (TicketClaim, error)
	DeleteExpiredTicketClaims(ctx context.Context, ticketID string, now time.Time) error
	AcceptTicketClaim(ctx context.Context, claimID, toUserID, newJTI string, now time.Time) (Ticket, error)
	ApplyPayment(ctx context.Context, orderID string, tx PaymentTx, success bool) (applied bool, err error)
	ExpirePendingOrders(ctx context.Context, now time.Time) (int, error)
	MarkTicketUsed(ctx context.Context, ticketID string, now time.Time) error
	InsertScanLog(ctx context.Context, row TicketScanLog) error
	DoorInventory(ctx context.Context, eventID string) (sold, capacity, used int, err error)
	ListRecentScanLogs(ctx context.Context, eventID string, limit int) ([]TicketScanLog, error)
}

// Tenancy is F06 membership plus user lookup for invites. auth.Store satisfies it.
type Tenancy interface {
	Membership(ctx context.Context, tenantID, userID string) (role string, err error)
	TenantsForUser(ctx context.Context, userID string) ([]auth.TenantView, error)
	TenantByID(ctx context.Context, id string) (auth.Tenant, error)
	UserByID(ctx context.Context, id string) (auth.User, error)
	UserByEmail(ctx context.Context, email string) (auth.User, error)
	Profiles(ctx context.Context, userID string) ([]string, error)
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

// Cache is Redis (or memory) for the public list, event ACL hashes, and F19 SETNX.
type Cache interface {
	Get(ctx context.Context, key string) (string, bool, error)
	Set(ctx context.Context, key, val string, ttl time.Duration) error
	SetNX(ctx context.Context, key, val string, ttl time.Duration) (bool, error)
	Incr(ctx context.Context, key string, ttl time.Duration) (int64, error)
	LPushTrim(ctx context.Context, key, val string, max int, ttl time.Duration) error
	LRange(ctx context.Context, key string, start, stop int64) ([]string, error)
	DeletePrefix(ctx context.Context, prefix string) error
	HashGet(ctx context.Context, key, field string) (string, bool, error)
	HashSet(ctx context.Context, key, field, val string, ttl time.Duration) error
	Delete(ctx context.Context, keys ...string) error
}

// Media is F09 flyers/gallery and F10 tracks. Wired after construction to avoid an import cycle.
type Media interface {
	UsableFlyer(ctx context.Context, eventID, assetID string) error
	EventImages(ctx context.Context, eventIDs ...string) (map[string]EventMedia, error)
	EventTracks(ctx context.Context, eventIDs ...string) (map[string][]Track, error)
}

// EventMedia is the public image payload for one event.
type EventMedia struct {
	Flyer   *Image
	Gallery []Image
}

// Lineup loads billed artists for GET event detail (F12).
type Lineup interface {
	EventLineup(ctx context.Context, eventID string) ([]LineupSlot, error)
}

// Queue publishes broker subjects. Optional until a worker is connected.
type Queue interface {
	Publish(ctx context.Context, subject string, payload []byte) error
}

// FlyerBinder is implemented by Service for media.Confirm (F09).
type FlyerBinder interface {
	BindFlyer(ctx context.Context, eventID, assetID string) (previousAssetID, status string, err error)
	ClearFlyerIf(ctx context.Context, eventID, assetID string) error
	EventStatus(ctx context.Context, eventID string) (status, flyerAssetID string, err error)
}
