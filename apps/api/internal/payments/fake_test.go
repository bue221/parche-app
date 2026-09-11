package payments

import (
	"context"
	"testing"

	"github.com/parche-app/backend/internal/config"
)

func TestNewFakeAndRedirect(t *testing.T) {
	p, err := New(config.Config{PaymentProvider: "fake"})
	if err != nil {
		t.Fatal(err)
	}
	sess, err := p.CreateCheckout(context.Background(), CheckoutRequest{OrderID: "abc"})
	if err != nil || sess.URL != "/v1/dev/pay/abc" || p.Name() != "fake" {
		t.Fatalf("%+v %v", sess, err)
	}

	_, err = New(config.Config{PaymentProvider: "wompi"})
	if err == nil {
		t.Fatal("wompi without base url")
	}
	live, err := New(config.Config{PaymentProvider: "stripe", PaymentCheckoutBaseURL: "https://pay.example/go"})
	if err != nil {
		t.Fatal(err)
	}
	sess, err = live.CreateCheckout(context.Background(), CheckoutRequest{OrderID: "oid"})
	if err != nil || live.Name() != "stripe" {
		t.Fatal(err)
	}
	if sess.URL != "https://pay.example/go?order_id=oid" {
		t.Fatalf("url=%s", sess.URL)
	}
}
