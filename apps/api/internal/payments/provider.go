package payments

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	"github.com/parche-app/backend/internal/config"
)

// CheckoutRequest is the portable order slice a provider needs. No PAN, no secrets.
type CheckoutRequest struct {
	OrderID     string
	AmountCents int
	Currency    string
	ExpiresAt   string
}

// Session is the redirect the attendee follows. Handlers never build provider URLs.
type Session struct {
	URL         string
	ProviderRef string
}

// Provider is the payment port. Swap PAYMENT_PROVIDER without touching HTTP handlers.
type Provider interface {
	Name() string
	CreateCheckout(ctx context.Context, req CheckoutRequest) (Session, error)
}

// New builds a driver from env. fake is the Compose default; live providers use a checkout base URL.
func New(cfg config.Config) (Provider, error) {
	name := strings.ToLower(strings.TrimSpace(cfg.PaymentProvider))
	if name == "" {
		name = "fake"
	}
	switch name {
	case "fake", "dev":
		return Fake{}, nil
	case "wompi", "stripe":
		base := strings.TrimSpace(cfg.PaymentCheckoutBaseURL)
		if base == "" {
			return nil, fmt.Errorf("PAYMENT_CHECKOUT_BASE_URL is required for PAYMENT_PROVIDER=%s", name)
		}
		return Redirect{Driver: name, BaseURL: base}, nil
	default:
		return nil, fmt.Errorf("unknown PAYMENT_PROVIDER %q", cfg.PaymentProvider)
	}
}

// Redirect is the S3-less live adapter: the gateway hosts checkout; we only hand back a URL.
type Redirect struct {
	Driver  string
	BaseURL string
}

func (r Redirect) Name() string {
	if r.Driver == "" {
		return "redirect"
	}
	return r.Driver
}

func (r Redirect) CreateCheckout(_ context.Context, req CheckoutRequest) (Session, error) {
	base := strings.TrimRight(strings.TrimSpace(r.BaseURL), "/")
	if base == "" || req.OrderID == "" {
		return Session{}, fmt.Errorf("checkout base url or order id missing")
	}
	u, err := url.Parse(base)
	if err != nil {
		return Session{}, err
	}
	q := u.Query()
	q.Set("order_id", req.OrderID)
	u.RawQuery = q.Encode()
	return Session{URL: u.String(), ProviderRef: req.OrderID}, nil
}
