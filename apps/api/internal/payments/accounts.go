package payments

import (
	"context"
	"errors"
	"strings"
	"time"
)

// ErrNotConnected means the event tenant has no Mercado Pago OAuth seller.
var ErrNotConnected = errors.New("mercadopago seller not connected")

// ErrCheckout means Mercado Pago rejected the preference. Log the cause; tell the buyer to retry.
var ErrCheckout = errors.New("mercadopago checkout")

// ErrPayoutRequired means the promoter must connect Mercado Pago before creating events.
var ErrPayoutRequired = errors.New("mercadopago seller required")

// TokenSet is the OAuth payload we persist. Never log these fields.
type TokenSet struct {
	AccessToken  string
	RefreshToken string
	PublicKey    string
	UserID       string
	ExpiresAt    time.Time
}

// Account is the promoter's Mercado Pago connection for one tenant.
type Account struct {
	TenantID     string
	MPUserID     string
	AccessToken  string
	RefreshToken string
	PublicKey    string
	ExpiresAt    time.Time
}

// Accounts stores encrypted seller tokens and refreshes them before expiry.
type Accounts interface {
	Get(ctx context.Context, tenantID string) (Account, error)
	Upsert(ctx context.Context, acc Account) error
	Delete(ctx context.Context, tenantID string) error
	AccessToken(ctx context.Context, tenantID string) (string, error)
}

// Refresher exchanges a refresh_token. OAuth implements it.
type Refresher interface {
	Refresh(ctx context.Context, refreshToken string) (TokenSet, error)
}

func (a Account) connected() bool {
	return strings.TrimSpace(a.TenantID) != "" && strings.TrimSpace(a.AccessToken) != ""
}
