package events

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"strings"
	"time"

	"github.com/parche-app/backend/internal/auth"
)

const metricsCacheTTL = 10 * time.Second

// EventMetrics is GET /v1/events/{id}/metrics. Aggregates only; no buyer PII.
type EventMetrics struct {
	ByType        []TypeMetrics     `json:"by_type"`
	GrossCents    int               `json:"gross_cents"`
	Currency      string            `json:"currency"`
	Checkins      int               `json:"checkins"`
	SoldValidUsed TicketStatusSplit `json:"sold_valid_used"`
	NoShowRate    float64           `json:"no_show_rate"`
	ByScanner     []ScannerMetrics  `json:"by_scanner"`
	Hourly        []HourlyApproved  `json:"hourly"`
}

// TypeMetrics is sold/reserved inventory and gross for one ticket type.
type TypeMetrics struct {
	TicketTypeID string `json:"ticket_type_id"`
	Name         string `json:"name"`
	Sold         int    `json:"sold"`
	Reserved     int    `json:"reserved"`
	Capacity     int    `json:"capacity"`
	GrossCents   int    `json:"gross_cents"`
}

// TicketStatusSplit counts admission tickets. Reserved is inventory, not sold.
type TicketStatusSplit struct {
	Valid     int `json:"valid"`
	Used      int `json:"used"`
	Cancelled int `json:"cancelled"`
}

// ScannerMetrics is who covered the door. Names are staff, not buyers.
type ScannerMetrics struct {
	UserID      string `json:"user_id"`
	DisplayName string `json:"display_name"`
	Approved    int    `json:"approved"`
	Duplicate   int    `json:"duplicate"`
}

// ScannerScanCount is the store row before display names are attached.
type ScannerScanCount struct {
	UserID    string
	Approved  int
	Duplicate int
}

// HourlyApproved is approved scans truncated to the UTC hour.
type HourlyApproved struct {
	Hour     time.Time `json:"hour"`
	Approved int       `json:"approved"`
}

// MetricsOrder is one row of GET /v1/events/{id}/metrics/orders.
type MetricsOrder struct {
	ID          string    `json:"id"`
	AmountCents int       `json:"amount_cents"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	Email       string    `json:"email"`
}

// MetricsOrderRow is the store projection before email masking.
type MetricsOrderRow struct {
	ID          string
	UserID      string
	AmountCents int
	Status      string
	CreatedAt   time.Time
}

// TicketExportRow is one CSV line. QR tokens are never included.
type TicketExportRow struct {
	ID       string
	TypeName string
	Status   string
}

// EventMetrics is GET /v1/events/{id}/metrics. Cached 10s; door cannot call this.
func (s *Service) EventMetrics(ctx context.Context, userID, eventID string) (EventMetrics, error) {
	e, err := s.requirePerm(ctx, userID, eventID, PermMetricsRead)
	if err != nil {
		return EventMetrics{}, err
	}
	key := metricsCacheKey(eventID)
	if s.Cache != nil {
		if raw, ok, err := s.Cache.Get(ctx, key); err != nil {
			return EventMetrics{}, err
		} else if ok {
			var cached EventMetrics
			if json.Unmarshal([]byte(raw), &cached) == nil {
				return withEmptySlices(cached), nil
			}
		}
	}
	out, err := s.computeEventMetrics(ctx, e)
	if err != nil {
		return EventMetrics{}, err
	}
	if s.Cache != nil {
		if body, err := json.Marshal(out); err == nil {
			_ = s.Cache.Set(ctx, key, string(body), metricsCacheTTL)
		}
	}
	return out, nil
}

// ListMetricsOrders is GET /v1/events/{id}/metrics/orders. Metrics role sees a masked email.
func (s *Service) ListMetricsOrders(ctx context.Context, userID, eventID, cursor string, limit int) ([]MetricsOrder, error) {
	if _, err := s.requirePerm(ctx, userID, eventID, PermMetricsRead); err != nil {
		return nil, err
	}
	role, err := s.memberRole(ctx, eventID, userID)
	if err != nil {
		return nil, err
	}
	if limit < 1 {
		limit = 20
	}
	rows, err := s.Store.ListEventOrders(ctx, eventID, cursor, limit)
	if err != nil {
		return nil, err
	}
	fullEmail := role == RoleOwner
	out := make([]MetricsOrder, 0, len(rows))
	for _, row := range rows {
		email := ""
		if u, err := s.userByID(ctx, row.UserID); err == nil {
			email = u.Email
		}
		if !fullEmail {
			email = maskEmail(email)
		}
		out = append(out, MetricsOrder{
			ID: row.ID, AmountCents: row.AmountCents, Status: row.Status,
			CreatedAt: row.CreatedAt.UTC(), Email: email,
		})
	}
	return out, nil
}

// ExportEventTickets is GET /v1/events/{id}/metrics/export. Owner and manager only.
func (s *Service) ExportEventTickets(ctx context.Context, userID, eventID string) ([]byte, error) {
	if _, err := s.requirePerm(ctx, userID, eventID, PermMetricsRead); err != nil {
		return nil, err
	}
	role, err := s.memberRole(ctx, eventID, userID)
	if err != nil {
		return nil, err
	}
	if role != RoleOwner && role != RoleManager {
		return nil, auth.ErrForbidden
	}
	rows, err := s.Store.ListEventTicketExport(ctx, eventID)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	if err := w.Write([]string{"ticket_id", "ticket_type", "status"}); err != nil {
		return nil, err
	}
	for _, row := range rows {
		if err := w.Write([]string{row.ID, row.TypeName, row.Status}); err != nil {
			return nil, err
		}
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// InvalidateEventMetrics drops the 10s summary so webhook and scan workers stay honest.
func InvalidateEventMetrics(ctx context.Context, cache Cache, eventID string) {
	if cache == nil || strings.TrimSpace(eventID) == "" {
		return
	}
	_ = cache.Delete(ctx, metricsCacheKey(eventID))
}

func (s *Service) invalidateEventMetrics(ctx context.Context, eventID string) {
	InvalidateEventMetrics(ctx, s.Cache, eventID)
}

func (s *Service) computeEventMetrics(ctx context.Context, e Event) (EventMetrics, error) {
	types, err := s.Store.ListTicketTypes(ctx, e.ID)
	if err != nil {
		return EventMetrics{}, err
	}
	currency := "COP"
	if s.Tenancy != nil {
		if tenant, err := s.Tenancy.TenantByID(ctx, e.TenantID); err == nil && strings.TrimSpace(tenant.Currency) != "" {
			currency = strings.ToUpper(strings.TrimSpace(tenant.Currency))
		}
	}
	byType := make([]TypeMetrics, 0, len(types))
	gross := 0
	for _, tt := range types {
		if tt.Status == TicketDraft {
			continue
		}
		line := tt.SoldCount * tt.PriceCents
		gross += line
		if currency == "COP" && tt.Currency != "" {
			currency = tt.Currency
		}
		byType = append(byType, TypeMetrics{
			TicketTypeID: tt.ID, Name: tt.Name, Sold: tt.SoldCount,
			Reserved: tt.ReservedCount, Capacity: tt.Capacity, GrossCents: line,
		})
	}
	valid, used, cancelled, err := s.Store.TicketStatusCounts(ctx, e.ID)
	if err != nil {
		return EventMetrics{}, err
	}
	checkins := used
	if s.Cache != nil {
		if raw, ok, err := s.Cache.Get(ctx, doorUsedKey(e.ID)); err != nil {
			return EventMetrics{}, err
		} else if ok {
			if n, conv := atoiSafe(raw); conv {
				checkins = n
			}
		}
	}
	scanners, err := s.Store.ScannerScanCounts(ctx, e.ID)
	if err != nil {
		return EventMetrics{}, err
	}
	byScanner := make([]ScannerMetrics, 0, len(scanners))
	for _, row := range scanners {
		byScanner = append(byScanner, ScannerMetrics{
			UserID: row.UserID, DisplayName: s.displayName(ctx, row.UserID),
			Approved: row.Approved, Duplicate: row.Duplicate,
		})
	}
	hourly, err := s.Store.HourlyApproved(ctx, e.ID)
	if err != nil {
		return EventMetrics{}, err
	}
	if hourly == nil {
		hourly = []HourlyApproved{}
	}
	return withEmptySlices(EventMetrics{
		ByType: byType, GrossCents: gross, Currency: currency, Checkins: checkins,
		SoldValidUsed: TicketStatusSplit{Valid: valid, Used: used, Cancelled: cancelled},
		NoShowRate: noShowRate(s.now(), e.EndsAt, valid, used),
		ByScanner:  byScanner, Hourly: hourly,
	}), nil
}

func withEmptySlices(m EventMetrics) EventMetrics {
	if m.ByType == nil {
		m.ByType = []TypeMetrics{}
	}
	if m.ByScanner == nil {
		m.ByScanner = []ScannerMetrics{}
	}
	if m.Hourly == nil {
		m.Hourly = []HourlyApproved{}
	}
	return m
}

func noShowRate(now, endsAt time.Time, valid, used int) float64 {
	if !now.UTC().After(endsAt.UTC()) {
		return 0
	}
	sold := valid + used
	if sold == 0 {
		return 0
	}
	return float64(valid) / float64(sold)
}

func maskEmail(email string) string {
	email = strings.TrimSpace(strings.ToLower(email))
	at := strings.LastIndex(email, "@")
	if at < 1 || at == len(email)-1 {
		return email
	}
	local, domain := email[:at], email[at+1:]
	r := []rune(local)
	if len(r) == 0 {
		return "***@" + domain
	}
	return string(r[0]) + "***@" + domain
}

func NextMetricsOrderCursor(items []MetricsOrder, limit int) *string {
	if limit < 1 || len(items) < limit {
		return nil
	}
	last := items[len(items)-1]
	c := EncodeCursor(last.CreatedAt, last.ID)
	return &c
}

func metricsCacheKey(eventID string) string {
	return aclKeyPref + eventID + ":metrics"
}

func atoiSafe(raw string) (int, bool) {
	n := 0
	if raw == "" {
		return 0, false
	}
	for _, c := range raw {
		if c < '0' || c > '9' {
			return 0, false
		}
		n = n*10 + int(c-'0')
	}
	return n, true
}
