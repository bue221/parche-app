package payments

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"strconv"
	"strings"
	"time"

	mpconfig "github.com/mercadopago/sdk-go/pkg/config"
	"github.com/mercadopago/sdk-go/pkg/payment"
	"github.com/mercadopago/sdk-go/pkg/preference"
)

const statementDescriptor = "PARCHE"

// CheckoutItem is one preference line. UnitPrice is already COP pesos in Parche.
type CheckoutItem struct {
	ID          string
	Title       string
	Description string
	Quantity    int
	UnitPrice   float64
	Currency    string
}

// PreferenceAPI creates Checkout Pro preferences with the seller access token.
type PreferenceAPI func(ctx context.Context, sellerAccessToken string, req preference.Request) (*preference.Response, error)

// PaymentAPI loads a payment with the given access token.
type PaymentAPI func(ctx context.Context, accessToken string, id int) (*payment.Response, error)

// MercadoPago is Checkout Pro + Split Payments 1:1. Money lands on the promoter.
type MercadoPago struct {
	CreatePref      PreferenceAPI
	GetPay          PaymentAPI
	PlatformToken   string
	NotificationURL string
	BackURLBase     string
	Marketplace     string
}

func (MercadoPago) Name() string { return "mercadopago" }

func sdkCreatePreference(ctx context.Context, sellerAccessToken string, req preference.Request) (*preference.Response, error) {
	cfg, err := mpconfig.New(sellerAccessToken)
	if err != nil {
		return nil, err
	}
	return preference.NewClient(cfg).Create(ctx, req)
}

func sdkGetPayment(ctx context.Context, accessToken string, id int) (*payment.Response, error) {
	cfg, err := mpconfig.New(accessToken)
	if err != nil {
		return nil, err
	}
	return payment.NewClient(cfg).Get(ctx, id)
}

func (m MercadoPago) createPref() PreferenceAPI {
	if m.CreatePref != nil {
		return m.CreatePref
	}
	return sdkCreatePreference
}

func (m MercadoPago) getPay() PaymentAPI {
	if m.GetPay != nil {
		return m.GetPay
	}
	return sdkGetPayment
}

func (m MercadoPago) CreateCheckout(ctx context.Context, req CheckoutRequest) (Session, error) {
	token := strings.TrimSpace(req.SellerAccessToken)
	seller := token != ""
	if token == "" {
		token = strings.TrimSpace(m.PlatformToken)
	}
	if token == "" {
		return Session{}, ErrNotConnected
	}
	items, err := preferenceItems(req)
	if err != nil {
		return Session{}, err
	}
	split := SplitFee(checkoutAmount(req))
	currency := "COP"
	if len(items) > 0 && strings.TrimSpace(items[0].CurrencyID) != "" {
		currency = items[0].CurrencyID
	}
	if split.Fee > 0 {
		items = append(items, preference.ItemRequest{
			ID:          "parche-fee",
			Title:       "Comisión Parche",
			Description: "10% + IVA 19% sobre la comisión",
			Quantity:    1,
			UnitPrice:   float64(split.Fee),
			CurrencyID:  currency,
		})
	}
	fee := 0.0
	marketplace := ""
	if seller {
		fee = float64(split.Fee)
		marketplace = strings.TrimSpace(m.Marketplace)
	}
	pref := preference.Request{
		Items:               items,
		ExternalReference:   strings.TrimSpace(req.OrderID),
		MarketplaceFee:      fee,
		Marketplace:         marketplace,
		StatementDescriptor: statementDescriptor,
		BinaryMode:          true,
		PaymentMethods:      cardOnlyMethods(),
	}
	if notify := publicHTTPS(m.NotificationURL); notify != "" {
		pref.NotificationURL = notify
	}
	if exp, err := time.Parse(time.RFC3339, strings.TrimSpace(req.ExpiresAt)); err == nil {
		t := exp.UTC()
		pref.ExpirationDateTo = &t
		pref.Expires = true
	}
	// Never send Payer.email: Checkout Pro treats that as the buyer session even
	// when Chrome/Safari look logged out. A Parche user email on a TEST preference
	// makes sandbox reject Colombia test cards.
	if target := orderReturnURL(m.BackURLBase, req.OrderID); target != "" {
		pref.BackURLs = &preference.BackURLsRequest{
			Success: target,
			Pending: target,
			Failure: target,
		}
		if publicHTTPS(target) != "" {
			pref.AutoReturn = "approved"
		}
	}
	res, err := m.createPref()(ctx, token, pref)
	if err != nil {
		slog.Error("mercadopago preference", "err", err)
		return Session{}, fmt.Errorf("%w", ErrCheckout)
	}
	if res == nil || strings.TrimSpace(res.InitPoint) == "" {
		return Session{}, fmt.Errorf("%w", ErrCheckout)
	}
	return Session{URL: strings.TrimSpace(res.InitPoint), ProviderRef: strings.TrimSpace(res.ID)}, nil
}

func cardOnlyMethods() *preference.PaymentMethodsRequest {
	// Colombia Checkout Pro forbids excluding account_money ("Dinero en cuenta").
	// A rejected preference never returns init_point, so the app never opens MP.
	return &preference.PaymentMethodsRequest{
		ExcludedPaymentTypes: []preference.ExcludedPaymentTypeRequest{
			{ID: "ticket"},
			{ID: "atm"},
			{ID: "bank_transfer"},
		},
		ExcludedPaymentMethods: []preference.ExcludedPaymentMethodRequest{
			{ID: "pse"},
			{ID: "efecty"},
		},
		DefaultPaymentMethodID: "master",
		Installments:           1,
		DefaultInstallments:    1,
	}
}

func publicHTTPS(raw string) string {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || u == nil {
		return ""
	}
	if !strings.EqualFold(u.Scheme, "https") {
		return ""
	}
	host := strings.ToLower(u.Hostname())
	if host == "" || host == "localhost" || host == "127.0.0.1" || strings.HasSuffix(host, ".local") {
		return ""
	}
	return strings.TrimRight(raw, "/")
}

// orderReturnURL is where Mercado Pago sends the buyer after checkout.
// Public HTTPS stays; localhost HTTP is replaced by the app scheme so the sheet can close.
func orderReturnURL(base, orderID string) string {
	id := strings.TrimSpace(orderID)
	if id == "" {
		return ""
	}
	if https := publicHTTPS(base); https != "" {
		return https + "/orders/" + id
	}
	return "parche://orders/" + id
}

func checkoutAmount(req CheckoutRequest) int {
	if req.AmountCents > 0 {
		return req.AmountCents
	}
	sum := 0
	for _, it := range req.Items {
		sum += int(it.UnitPrice) * it.Quantity
	}
	return sum
}

func preferenceItems(req CheckoutRequest) ([]preference.ItemRequest, error) {
	if len(req.Items) > 0 {
		out := make([]preference.ItemRequest, 0, len(req.Items))
		for _, it := range req.Items {
			if it.Quantity < 1 {
				return nil, fmt.Errorf("item quantity is required")
			}
			title := strings.TrimSpace(it.Title)
			if title == "" {
				title = "Tiquete"
			}
			cur := strings.ToUpper(strings.TrimSpace(it.Currency))
			if cur == "" {
				cur = strings.ToUpper(strings.TrimSpace(req.Currency))
			}
			if cur == "" {
				cur = "COP"
			}
			out = append(out, preference.ItemRequest{
				ID:          it.ID,
				Title:       title,
				Description: strings.TrimSpace(it.Description),
				Quantity:    it.Quantity,
				UnitPrice:   it.UnitPrice,
				CurrencyID:  cur,
			})
		}
		return out, nil
	}
	id := strings.TrimSpace(req.OrderID)
	if id == "" {
		return nil, fmt.Errorf("order id is required")
	}
	cur := strings.ToUpper(strings.TrimSpace(req.Currency))
	if cur == "" {
		cur = "COP"
	}
	return []preference.ItemRequest{{
		ID:         id,
		Title:      "Tiquete Parche",
		Quantity:   1,
		UnitPrice:  float64(req.AmountCents),
		CurrencyID: cur,
	}}, nil
}

func (m MercadoPago) Payment(ctx context.Context, id string) (*payment.Response, error) {
	n, err := strconv.Atoi(strings.TrimSpace(id))
	if err != nil || n <= 0 {
		return nil, fmt.Errorf("invalid payment id")
	}
	return m.getPay()(ctx, m.PlatformToken, n)
}
