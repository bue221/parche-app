package auth

import (
	"context"
	"time"
)

const (
	StatusActive          = "active"
	StatusDisabled        = "disabled"
	ProfileAttendee       = "attendee"
	ProfilePromoter       = "promoter"
	ProfileArtist         = "artist"
	ProfilePlatformAdmin  = "platform_admin"
	TenantOwner           = "owner"
	TenantStaff           = "staff"
	DefaultTenantCurrency = "COP"
)

// User is the persisted account. PasswordHash must never be serialized to clients.
type User struct {
	ID            string
	Email         string
	PasswordHash  string
	DisplayName   string
	Bio           string
	AvatarAssetID string
	Status        string
	SessionEpoch  int
	CreatedAt     time.Time
}

// EmailChangeRow is a hashed one-use token to confirm a new email (F14).
type EmailChangeRow struct {
	ID        string
	UserID    string
	NewEmail  string
	TokenHash string
	ExpiresAt time.Time
	UsedAt    *time.Time
}

// PasswordResetRow is a hashed one-use reset token. TokenHash is never the mail value.
type PasswordResetRow struct {
	ID        string
	UserID    string
	TokenHash string
	ExpiresAt time.Time
	UsedAt    *time.Time
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

// Tenant is a promoter colectivo.
type Tenant struct {
	ID       string `json:"id"`
	Slug     string `json:"slug"`
	Name     string `json:"name"`
	Currency string `json:"currency"`
	Status   string `json:"status"`
}

// TenantView is the public tenant slice on GET /v1/me.
type TenantView struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Role string `json:"role"`
}

// TenantMemberView is one row of GET /v1/tenants/{id}/members.
type TenantMemberView struct {
	UserID      string `json:"user_id"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	Role        string `json:"role"`
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
	InsertProfile(ctx context.Context, userID, profile string) error
	TenantForUser(ctx context.Context, userID string) (*TenantView, error)
	TenantsForUser(ctx context.Context, userID string) ([]TenantView, error)
	CreateTenant(ctx context.Context, t Tenant, ownerUserID string) error
	TenantByID(ctx context.Context, id string) (Tenant, error)
	Membership(ctx context.Context, tenantID, userID string) (role string, err error)
	UpdateTenant(ctx context.Context, id, name, currency string) error
	ListMembers(ctx context.Context, tenantID string) ([]TenantMemberView, error)
	AddMember(ctx context.Context, tenantID, userID, role string) error
	OwnerCount(ctx context.Context, tenantID string) (int, error)
	RemoveMember(ctx context.Context, tenantID, userID string) error

	InsertRefresh(ctx context.Context, row RefreshRow) error
	RefreshByHash(ctx context.Context, hash string) (RefreshRow, error)
	MarkReplaced(ctx context.Context, id, newID string, at time.Time) error
	RevokeFamily(ctx context.Context, familyID string, at time.Time) error
	RevokeUser(ctx context.Context, userID string, at time.Time) error
	ListSessions(ctx context.Context, userID string, now time.Time) ([]SessionView, error)

	InsertPasswordReset(ctx context.Context, row PasswordResetRow) error
	PasswordResetByHash(ctx context.Context, hash string) (PasswordResetRow, error)
	MarkPasswordResetUsed(ctx context.Context, id string, at time.Time) error
	InvalidateUserPasswordResets(ctx context.Context, userID string, at time.Time) error
	SetPasswordAndBumpEpoch(ctx context.Context, userID, passwordHash string) error

	UpdateProfile(ctx context.Context, userID, displayName, bio string) error
	SetAvatarAsset(ctx context.Context, userID, assetID string) (previousAssetID string, err error)
	SetEmail(ctx context.Context, userID, email string) error
	InsertEmailChange(ctx context.Context, row EmailChangeRow) error
	EmailChangeByHash(ctx context.Context, hash string) (EmailChangeRow, error)
	MarkEmailChangeUsed(ctx context.Context, id string, at time.Time) error
	InvalidateUserEmailChanges(ctx context.Context, userID string, at time.Time) error

	InTx(ctx context.Context, fn func(Store) error) error
}
