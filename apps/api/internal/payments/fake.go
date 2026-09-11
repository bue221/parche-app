package payments

import (
	"context"
	"fmt"
	"strings"
)

// Fake redirects to the API's /v1/dev/pay/{order} page and is the Compose driver.
type Fake struct{}

func (Fake) Name() string { return "fake" }

func (Fake) CreateCheckout(_ context.Context, req CheckoutRequest) (Session, error) {
	id := strings.TrimSpace(req.OrderID)
	if id == "" {
		return Session{}, fmt.Errorf("order id is required")
	}
	return Session{URL: "/v1/dev/pay/" + id, ProviderRef: id}, nil
}
