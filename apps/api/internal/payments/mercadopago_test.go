package payments

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/mercadopago/sdk-go/pkg/preference"
	"github.com/parche-app/backend/internal/config"
)

func TestMercadoPagoCheckoutUsesInitPointAndPesos(t *testing.T) {
	var got preference.Request
	mp := MercadoPago{
		Marketplace: "app-id",
		BackURLBase: "https://app.parche.co",
		CreatePref: func(_ context.Context, token string, req preference.Request) (*preference.Response, error) {
			if token != "seller-token" {
				t.Fatalf("token=%s", token)
			}
			got = req
			return &preference.Response{
				ID:               "pref-1",
				InitPoint:        "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=pref-1",
				SandboxInitPoint: "https://sandbox.mercadopago.com.co/never-use",
			}, nil
		},
	}
	sess, err := mp.CreateCheckout(context.Background(), CheckoutRequest{
		OrderID:           "ord-1",
		AmountCents:       50000,
		Currency:          "COP",
		SellerAccessToken: "seller-token",
		Items: []CheckoutItem{{
			ID: "tt-1", Title: "Early", Quantity: 2, UnitPrice: 50000, Currency: "COP",
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if sess.URL != "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=pref-1" {
		t.Fatalf("must use init_point, got %s", sess.URL)
	}
	if len(got.Items) != 2 || got.Items[0].UnitPrice != 50000 || got.Items[0].Quantity != 2 {
		t.Fatalf("COP pesos must not be divided: %+v", got.Items)
	}
	if got.Items[1].ID != "parche-fee" || got.Items[1].UnitPrice != 5950 {
		t.Fatalf("buyer surcharge=%+v", got.Items[1])
	}
	if got.MarketplaceFee != 5950 || got.ExternalReference != "ord-1" || got.Marketplace != "app-id" {
		t.Fatalf("split=%+v", got)
	}
	if got.AutoReturn != "approved" || got.BackURLs == nil || got.BackURLs.Success != "https://app.parche.co/orders/ord-1" {
		t.Fatalf("back urls=%+v", got.BackURLs)
	}
	if !got.BinaryMode || got.PaymentMethods == nil || got.PaymentMethods.Installments != 1 || got.PaymentMethods.DefaultPaymentMethodID != "master" {
		t.Fatalf("binary/card-only=%+v", got.PaymentMethods)
	}
}

func TestMercadoPagoOmitsLocalhostURLs(t *testing.T) {
	var got preference.Request
	mp := MercadoPago{
		PlatformToken:   "APP-TOKEN",
		NotificationURL: "http://localhost:8080/v1/payments/webhook",
		BackURLBase:     "http://127.0.0.1:8081",
		Marketplace:     "app-id",
		CreatePref: func(_ context.Context, _ string, req preference.Request) (*preference.Response, error) {
			got = req
			return &preference.Response{ID: "pref-local", InitPoint: "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=pref-local"}, nil
		},
	}
	if _, err := mp.CreateCheckout(context.Background(), CheckoutRequest{OrderID: "ord-local", AmountCents: 10000, Currency: "COP"}); err != nil {
		t.Fatal(err)
	}
	if got.NotificationURL != "" || got.Marketplace != "" {
		t.Fatalf("localhost leaked: %+v", got)
	}
	if got.BackURLs == nil || got.BackURLs.Success != "parche://orders/ord-local" || got.AutoReturn != "" {
		t.Fatalf("app return=%+v auto=%s", got.BackURLs, got.AutoReturn)
	}
}

func TestMercadoPagoOmitsPayer(t *testing.T) {
	var got *preference.PayerRequest
	mp := MercadoPago{
		PlatformToken: "TEST-abc",
		CreatePref: func(_ context.Context, _ string, req preference.Request) (*preference.Response, error) {
			got = req.Payer
			return &preference.Response{ID: "pref-payer", InitPoint: "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=pref-payer"}, nil
		},
	}
	if _, err := mp.CreateCheckout(context.Background(), CheckoutRequest{
		OrderID:     "ord-payer",
		AmountCents: 10000,
		Currency:    "COP",
	}); err != nil {
		t.Fatal(err)
	}
	if got != nil {
		t.Fatalf("preference must be guest checkout, payer=%+v", got)
	}
}

func TestMercadoPagoHidesPendingPaymentTypes(t *testing.T) {
	var got *preference.PaymentMethodsRequest
	mp := MercadoPago{
		PlatformToken: "APP_USR-abc",
		CreatePref: func(_ context.Context, _ string, req preference.Request) (*preference.Response, error) {
			got = req.PaymentMethods
			return &preference.Response{ID: "pref-pm", InitPoint: "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=pref-pm"}, nil
		},
	}
	if _, err := mp.CreateCheckout(context.Background(), CheckoutRequest{OrderID: "ord-pm", AmountCents: 10000, Currency: "COP"}); err != nil {
		t.Fatal(err)
	}
	want := map[string]bool{"ticket": false, "atm": false, "bank_transfer": false}
	for _, tpe := range got.ExcludedPaymentTypes {
		if tpe.ID == "account_money" {
			t.Fatal("Colombia Checkout Pro cannot exclude account_money")
		}
		if _, ok := want[tpe.ID]; ok {
			want[tpe.ID] = true
		}
	}
	for id, ok := range want {
		if !ok {
			t.Fatalf("missing excluded type %s in %+v", id, got.ExcludedPaymentTypes)
		}
	}
}

func TestMercadoPagoWrapsPreferenceError(t *testing.T) {
	mp := MercadoPago{
		PlatformToken: "APP-TOKEN",
		CreatePref: func(_ context.Context, _ string, _ preference.Request) (*preference.Response, error) {
			return nil, fmt.Errorf("mp down")
		},
	}
	_, err := mp.CreateCheckout(context.Background(), CheckoutRequest{OrderID: "ord-err", AmountCents: 1000, Currency: "COP"})
	if !errors.Is(err, ErrCheckout) {
		t.Fatalf("err=%v", err)
	}
}

func TestMercadoPagoRequiresSellerOrPlatformToken(t *testing.T) {
	_, err := MercadoPago{}.CreateCheckout(context.Background(), CheckoutRequest{OrderID: "x", AmountCents: 1})
	if err != ErrNotConnected {
		t.Fatalf("err=%v", err)
	}
}

func TestMercadoPagoFallsBackToPlatformToken(t *testing.T) {
	var gotToken string
	var gotFee float64
	var gotItems int
	mp := MercadoPago{
		PlatformToken: "APP-TOKEN",
		CreatePref: func(_ context.Context, token string, req preference.Request) (*preference.Response, error) {
			gotToken = token
			gotFee = req.MarketplaceFee
			gotItems = len(req.Items)
			return &preference.Response{ID: "pref-2", InitPoint: "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=pref-2"}, nil
		},
	}
	sess, err := mp.CreateCheckout(context.Background(), CheckoutRequest{OrderID: "ord-2", AmountCents: 10000, Currency: "COP"})
	if err != nil {
		t.Fatal(err)
	}
	if gotToken != "APP-TOKEN" || gotFee != 0 || gotItems != 2 {
		t.Fatalf("token=%s fee=%v items=%d", gotToken, gotFee, gotItems)
	}
	if sess.URL == "" {
		t.Fatal("missing init_point")
	}
}

func TestNewMercadoPagoRequiresToken(t *testing.T) {
	_, err := New(config.Config{PaymentProvider: "mercadopago"})
	if err == nil {
		t.Fatal("expected missing MP_ACCESS_TOKEN")
	}
}

func TestOrderReturnURL(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name, base, want string
	}{
		{name: "public https", base: "https://app.parche.co/", want: "https://app.parche.co/orders/ord-1"},
		{name: "localhost http", base: "http://localhost:8081", want: "parche://orders/ord-1"},
		{name: "app scheme", base: "parche://", want: "parche://orders/ord-1"},
		{name: "empty", base: "", want: "parche://orders/ord-1"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := orderReturnURL(tc.base, "ord-1")
			if got != tc.want {
				t.Fatalf("got %s want %s", got, tc.want)
			}
		})
	}
}
