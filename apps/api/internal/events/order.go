package events

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/broker"
	"github.com/parche-app/backend/internal/payments"
)

const (
	OrderPending = "pending"
	OrderPaid    = "paid"
	OrderFailed  = "failed"
	OrderExpired = "expired"

	TicketReserved    = "reserved"
	TicketValid       = "valid"
	TicketUsed        = "used"
	TicketTransferred = "transferred"
	TicketCancelled   = "cancelled"

	maxTicketsPerOrder = 8
	orderReserveTTL    = 15 * time.Minute
	idempotencyTTL     = 24 * time.Hour
	minIdempotencyKey  = 8
	maxIdempotencyKey  = 128
	idemCachePref      = "idem:order:"
)

// OrderItemInput is one line of POST /v1/events/{id}/orders.
type OrderItemInput struct {
	TicketTypeID string `json:"ticket_type_id"`
	Quantity     int    `json:"quantity"`
}

// Order is a checkout session. Status moves pending → paid|failed|expired.
type Order struct {
	ID             string
	UserID         string
	EventID        string
	Status         string
	AmountCents    int
	Currency       string
	ExpiresAt      time.Time
	CheckoutURL    string
	IdempotencyKey string
	RequestHash    string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// OrderItem is a priced snapshot at purchase time.
type OrderItem struct {
	ID             string `json:"id"`
	OrderID        string `json:"order_id"`
	TicketTypeID   string `json:"ticket_type_id"`
	Quantity       int    `json:"quantity"`
	UnitPriceCents int    `json:"unit_price_cents"`
}

// Ticket is one admission row. JTI is assigned when the ticket becomes valid (F17).
type Ticket struct {
	ID            string
	OrderID       string
	TicketTypeID  string
	EventID       string
	UserID        string
	Status        string
	JTI           string
	TransferCount int
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// PaymentTx is a webhook row. provider_event_id is unique so duplicates are skipped.
type PaymentTx struct {
	ID              string
	OrderID         string
	Provider        string
	ProviderEventID string
	Status          string
	PayloadHash     string
	Truncated       string
}

// CheckoutCreated is the 201 body for POST orders.
type CheckoutCreated struct {
	OrderID         string    `json:"order_id"`
	Status          string    `json:"status"`
	CheckoutURL     string    `json:"checkout_url"`
	ExpiresAt       time.Time `json:"expires_at"`
	AmountCents     int       `json:"amount_cents"`
	CommissionCents int       `json:"commission_cents"`
	IVACents        int       `json:"iva_cents"`
	FeeCents        int       `json:"fee_cents"`
	ChargeCents     int       `json:"charge_cents"`
	Currency        string    `json:"currency"`
}

// OrderView is GET /v1/orders/{id}. No PAN, no QR.
type OrderView struct {
	ID              string      `json:"id"`
	EventID         string      `json:"event_id"`
	Status          string      `json:"status"`
	AmountCents     int         `json:"amount_cents"`
	CommissionCents int         `json:"commission_cents"`
	IVACents        int         `json:"iva_cents"`
	FeeCents        int         `json:"fee_cents"`
	ChargeCents     int         `json:"charge_cents"`
	Currency        string      `json:"currency"`
	ExpiresAt       time.Time   `json:"expires_at"`
	CheckoutURL     string      `json:"checkout_url,omitempty"`
	Items           []OrderItem `json:"items"`
	Tickets         []TicketRef `json:"tickets"`
}

// TicketRef is inventory status without a QR payload.
type TicketRef struct {
	ID           string `json:"id"`
	TicketTypeID string `json:"ticket_type_id"`
	Status       string `json:"status"`
}

// CreateOrder reserves aforo, persists a pending order, and asks PaymentProvider for a URL.
func (s *Service) CreateOrder(ctx context.Context, userID, eventID, idemKey string, items []OrderItemInput) (CheckoutCreated, error) {
	key := strings.TrimSpace(idemKey)
	if utf8.RuneCountInString(key) < minIdempotencyKey || utf8.RuneCountInString(key) > maxIdempotencyKey {
		return CheckoutCreated{}, auth.Invalid{Fields: []auth.Field{{Name: "idempotency_key", Issue: "required"}}}
	}
	if err := s.requireAttendee(ctx, userID); err != nil {
		return CheckoutCreated{}, err
	}
	e, err := s.Store.ByID(ctx, eventID)
	if err != nil {
		return CheckoutCreated{}, err
	}
	if e.Status != StatusPublished {
		return CheckoutCreated{}, auth.ErrForbidden
	}
	merged, totalQty, ferrs := mergeOrderItems(items)
	if len(ferrs) > 0 {
		return CheckoutCreated{}, auth.Invalid{Fields: ferrs}
	}
	if totalQty < 1 {
		return CheckoutCreated{}, auth.Invalid{Fields: []auth.Field{{Name: "items", Issue: "required"}}}
	}
	if totalQty > maxTicketsPerOrder {
		return CheckoutCreated{}, auth.Invalid{Fields: []auth.Field{{Name: "items", Issue: "max"}}}
	}
	reqHash := hashOrderRequest(eventID, merged)
	if existing, err := s.Store.OrderByIdempotency(ctx, userID, eventID, key); err == nil {
		if existing.RequestHash != reqHash {
			return CheckoutCreated{}, auth.ErrConflict
		}
		return toCheckout(existing), nil
	} else if !errors.Is(err, auth.ErrNotFound) {
		return CheckoutCreated{}, err
	}

	now := s.now()
	if _, err := s.Store.ExpirePendingOrders(ctx, now); err != nil {
		return CheckoutCreated{}, err
	}
	catalog, err := s.Store.ListTicketTypes(ctx, eventID)
	if err != nil {
		return CheckoutCreated{}, err
	}
	byID := make(map[string]TicketType, len(catalog))
	for _, t := range catalog {
		byID[t.ID] = t
	}

	orderItems := make([]OrderItem, 0, len(merged))
	var tickets []Ticket
	amount := 0
	currency := ""
	var windowClosed bool
	for i, line := range merged {
		prefix := itemField(i)
		tt, ok := byID[line.TicketTypeID]
		if !ok || tt.EventID != eventID {
			return CheckoutCreated{}, auth.Invalid{Fields: []auth.Field{{Name: prefix + "ticket_type_id", Issue: "unknown"}}}
		}
		if tt.Status != TicketOnSale {
			return CheckoutCreated{}, auth.ErrConflict
		}
		if salesWindowClosed(tt, now) {
			windowClosed = true
			continue
		}
		if tt.ReservedCount+tt.SoldCount+line.Quantity > tt.Capacity {
			return CheckoutCreated{}, auth.ErrConflict
		}
		if currency == "" {
			currency = tt.Currency
		}
		oid, err := newID()
		if err != nil {
			return CheckoutCreated{}, err
		}
		orderItems = append(orderItems, OrderItem{
			ID: oid, TicketTypeID: tt.ID, Quantity: line.Quantity, UnitPriceCents: tt.PriceCents,
		})
		amount += tt.PriceCents * line.Quantity
		for n := 0; n < line.Quantity; n++ {
			tid, err := newID()
			if err != nil {
				return CheckoutCreated{}, err
			}
			tickets = append(tickets, Ticket{
				ID: tid, TicketTypeID: tt.ID, EventID: eventID, UserID: userID, Status: TicketReserved,
			})
		}
	}
	if windowClosed {
		return CheckoutCreated{}, auth.Invalid{Fields: []auth.Field{{Name: "sales_window", Issue: "closed"}}}
	}
	if currency == "" {
		currency = "COP"
	}
	orderID, err := newID()
	if err != nil {
		return CheckoutCreated{}, err
	}
	expires := now.Add(orderReserveTTL)
	checkoutURL := ""
	if s.Payments != nil {
		req := payments.CheckoutRequest{
			OrderID:     orderID,
			AmountCents: amount,
			Currency:    currency,
			ExpiresAt:   expires.Format(time.RFC3339),
			Items:       checkoutLines(e.Title, currency, orderItems, byID),
		}
		if s.Payments.Name() == "mercadopago" && s.Sellers != nil {
			tok, err := s.Sellers.AccessToken(ctx, e.TenantID)
			if err == nil {
				req.SellerAccessToken = tok
			} else if !errors.Is(err, payments.ErrNotConnected) {
				return CheckoutCreated{}, err
			}
		}
		sess, err := s.Payments.CreateCheckout(ctx, req)
		if err != nil {
			return CheckoutCreated{}, err
		}
		checkoutURL = sess.URL
	}
	o := Order{
		ID: orderID, UserID: userID, EventID: eventID, Status: OrderPending,
		AmountCents: amount, Currency: currency, ExpiresAt: expires,
		CheckoutURL: checkoutURL, IdempotencyKey: key, RequestHash: reqHash,
		CreatedAt: now, UpdatedAt: now,
	}
	for i := range orderItems {
		orderItems[i].OrderID = orderID
	}
	for i := range tickets {
		tickets[i].OrderID = orderID
		tickets[i].CreatedAt = now
		tickets[i].UpdatedAt = now
	}
	if err := s.Store.CreateReservedOrder(ctx, o, orderItems, tickets); err != nil {
		if errors.Is(err, auth.ErrConflict) {
			if existing, e2 := s.Store.OrderByIdempotency(ctx, userID, eventID, key); e2 == nil {
				if existing.RequestHash != reqHash {
					return CheckoutCreated{}, auth.ErrConflict
				}
				return toCheckout(existing), nil
			}
		}
		return CheckoutCreated{}, err
	}
	s.cacheIdempotency(ctx, userID, eventID, key, o)
	return toCheckout(o), nil
}

// GetOrder is GET /v1/orders/{id}: buyer or event.metrics.read. Missing orders are 404.
func (s *Service) GetOrder(ctx context.Context, userID, orderID string) (OrderView, error) {
	o, err := s.Store.OrderByID(ctx, orderID)
	if err != nil {
		return OrderView{}, err
	}
	if o.UserID != userID {
		ok, err := s.HasPermission(ctx, userID, o.EventID, PermMetricsRead)
		if err != nil {
			return OrderView{}, err
		}
		if !ok {
			return OrderView{}, auth.ErrNotFound
		}
	}
	items, err := s.Store.ListOrderItems(ctx, orderID)
	if err != nil {
		return OrderView{}, err
	}
	if items == nil {
		items = []OrderItem{}
	}
	tix, err := s.Store.ListTicketsByOrder(ctx, orderID)
	if err != nil {
		return OrderView{}, err
	}
	refs := make([]TicketRef, 0, len(tix))
	for _, t := range tix {
		refs = append(refs, TicketRef{ID: t.ID, TicketTypeID: t.TicketTypeID, Status: t.Status})
	}
	split := payments.SplitFee(o.AmountCents)
	return OrderView{
		ID: o.ID, EventID: o.EventID, Status: o.Status,
		AmountCents: split.Amount, CommissionCents: split.Commission, IVACents: split.IVA,
		FeeCents: split.Fee, ChargeCents: split.Charge, Currency: o.Currency, ExpiresAt: o.ExpiresAt,
		CheckoutURL: o.CheckoutURL, Items: items, Tickets: refs,
	}, nil
}

// ApplyWebhook records a signed payment event. Duplicate provider_event_id is a no-op.
func (s *Service) ApplyWebhook(ctx context.Context, ev payments.Event, provider, payloadHash, truncated string) error {
	tx := PaymentTx{
		OrderID: ev.OrderID, Provider: provider, ProviderEventID: ev.ProviderEventID,
		Status: ev.Status, PayloadHash: payloadHash, Truncated: truncated,
	}
	id, err := newID()
	if err != nil {
		return err
	}
	tx.ID = id
	applied, err := s.Store.ApplyPayment(ctx, ev.OrderID, tx, ev.Status == "success")
	if err != nil {
		return err
	}
	if applied {
		if o, oerr := s.Store.OrderByID(ctx, ev.OrderID); oerr == nil {
			s.invalidateEventMetrics(ctx, o.EventID)
		}
	}
	if applied && ev.Status == "success" && s.Publisher != nil {
		body, _ := json.Marshal(map[string]string{"order_id": ev.OrderID})
		_ = s.Publisher.Publish(ctx, broker.SubjectPaymentConfirmed, body)
	}
	if applied {
		s.notifyOrderMail(ctx, ev.OrderID, ev.Status)
	}
	return nil
}

// ExpirePendingOrders is the order.expire job: pending past TTL become expired and free aforo.
func (s *Service) ExpirePendingOrders(ctx context.Context) (int, error) {
	return s.Store.ExpirePendingOrders(ctx, s.now())
}

func (s *Service) requireAttendee(ctx context.Context, userID string) error {
	if s.Tenancy == nil {
		return auth.ErrForbidden
	}
	profiles, err := s.Tenancy.Profiles(ctx, userID)
	if err != nil {
		return err
	}
	for _, p := range profiles {
		if p == auth.ProfileAttendee {
			return nil
		}
	}
	return auth.ErrForbidden
}

func (s *Service) cacheIdempotency(ctx context.Context, userID, eventID, key string, o Order) {
	if s.Cache == nil {
		return
	}
	raw, err := json.Marshal(o)
	if err != nil {
		return
	}
	_ = s.Cache.Set(ctx, idemCacheKey(userID, eventID, key), string(raw), idempotencyTTL)
}

func mergeOrderItems(items []OrderItemInput) ([]OrderItemInput, int, []auth.Field) {
	type acc struct {
		id  string
		qty int
		idx int
	}
	var fields []auth.Field
	seen := map[string]*acc{}
	order := make([]*acc, 0, len(items))
	total := 0
	for i, in := range items {
		prefix := itemField(i)
		id := strings.TrimSpace(in.TicketTypeID)
		if id == "" {
			fields = append(fields, auth.Field{Name: prefix + "ticket_type_id", Issue: "required"})
			continue
		}
		if in.Quantity < 1 {
			fields = append(fields, auth.Field{Name: prefix + "quantity", Issue: "min"})
			continue
		}
		if cur, ok := seen[id]; ok {
			cur.qty += in.Quantity
			total += in.Quantity
			continue
		}
		a := &acc{id: id, qty: in.Quantity, idx: i}
		seen[id] = a
		order = append(order, a)
		total += in.Quantity
	}
	out := make([]OrderItemInput, 0, len(order))
	for _, a := range order {
		out = append(out, OrderItemInput{TicketTypeID: a.id, Quantity: a.qty})
	}
	return out, total, fields
}

func salesWindowClosed(tt TicketType, now time.Time) bool {
	if tt.SalesStartsAt != nil && now.Before(*tt.SalesStartsAt) {
		return true
	}
	if tt.SalesEndsAt != nil && !now.Before(*tt.SalesEndsAt) {
		return true
	}
	return false
}

func hashOrderRequest(eventID string, items []OrderItemInput) string {
	raw, _ := json.Marshal(struct {
		Event string           `json:"e"`
		Items []OrderItemInput `json:"i"`
	}{Event: eventID, Items: items})
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}

func toCheckout(o Order) CheckoutCreated {
	split := payments.SplitFee(o.AmountCents)
	return CheckoutCreated{
		OrderID: o.ID, Status: o.Status, CheckoutURL: o.CheckoutURL, ExpiresAt: o.ExpiresAt,
		AmountCents: split.Amount, CommissionCents: split.Commission, IVACents: split.IVA,
		FeeCents: split.Fee, ChargeCents: split.Charge, Currency: o.Currency,
	}
}

func checkoutLines(eventTitle, currency string, items []OrderItem, types map[string]TicketType) []payments.CheckoutItem {
	out := make([]payments.CheckoutItem, 0, len(items))
	for _, it := range items {
		title := strings.TrimSpace(types[it.TicketTypeID].Name)
		if title == "" {
			title = strings.TrimSpace(eventTitle)
		}
		if title == "" {
			title = "Tiquete"
		}
		out = append(out, payments.CheckoutItem{
			ID:          it.TicketTypeID,
			Title:       title,
			Description: strings.TrimSpace(eventTitle),
			Quantity:    it.Quantity,
			UnitPrice:   float64(it.UnitPriceCents),
			Currency:    currency,
		})
	}
	return out
}

func idemCacheKey(userID, eventID, key string) string {
	return idemCachePref + userID + ":" + eventID + ":" + key
}
