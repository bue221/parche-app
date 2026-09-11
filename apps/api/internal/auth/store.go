package auth

import (
	"context"
	"time"
)

const (
	StatusActive    = "active"
	StatusDisabled  = "disabled"
	ProfileAttendee = "attendee"
	ProfilePromoter = "promoter"
	TenantOwner     = "owner"
)

// User is the persisted account. PasswordHash must never be serialized to clients.
type User struct {
	ID           string
	Email        string
	PasswordHash string
	DisplayName  string
	Status       string
	CreatedAt    time.Time
}

// RefreshRow is a hashed refresh token. TokenHash is HMAC hex, never the client value.
type RefreshRow struct {
	ID         string
	UserID     string
	FamilyID   string
	TokenHash  string
	ExpiresAt  time.Time
	RevokedAt  *time.Time
	ReplacedBy *string
	UserAgent  string
	CreatedAt  time.Time
}

// Tenant is a promoter colectivo stub (F06).
type Tenant struct {
	ID       string
	Slug     string
	Name     string
	Currency string
	Status   string
}

// TenantView is the public tenant slice on GET /v1/me.
type TenantView struct {
	ID   string
	Name string
	Role string
}

// SessionView is one refresh family for GET /v1/me/sessions.
type SessionView struct {
	ID        string
	CreatedAt time.Time
	UserAgent string
}

// Account is the write-set for register (user + profiles + optional tenant).
type Account struct {
	User     User
	Profiles []string
	Tenant   *Tenant
	Role     string
}

// Store persists users and refresh families. Implementations must not log secrets.
type Store interface {
	CreateAccount(ctx context.Context, acc Account) error
	UserByEmail(ctx context.Context, email string) (User, error)
	UserByID(ctx context.Context, id string) (User, error)
	Profiles(ctx context.Context, userID string) ([]string, error)
	TenantForUser(ctx context.Context, userID string) (*TenantView, error)

	InsertRefresh(ctx context.Context, row RefreshRow) error
	RefreshByHash(ctx context.Context, hash string) (RefreshRow, error)
	MarkReplaced(ctx context.Context, id, newID string, at time.Time) error
	RevokeFamily(ctx context.Context, familyID string, at time.Time) error
	RevokeUser(ctx context.Context, userID string, at time.Time) error
	ListSessions(ctx context.Context, userID string, now time.Time) ([]SessionView, error)

	InTx(ctx context.Context, fn func(Store) error) error
}
