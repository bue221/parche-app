package events

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/parche-app/backend/internal/auth"
)

const (
	tenantMetricsDefaultDays = 30
	tenantMetricsMaxDays     = 366
)

// TenantMetrics is GET /v1/tenants/{id}/metrics. Owner-only box-office across events.
type TenantMetrics struct {
	From            time.Time            `json:"from"`
	To              time.Time            `json:"to"`
	GrossCents      int                  `json:"gross_cents"`
	OrdersPaid      int                  `json:"orders_paid"`
	TicketsSold     int                  `json:"tickets_sold"`
	EventsPublished int                  `json:"events_published"`
	ByEvent         []TenantEventMetrics `json:"by_event"`
}

// TenantEventMetrics is one event in the tenant window. Gross/sold match F20.
type TenantEventMetrics struct {
	EventID    string `json:"event_id"`
	Title      string `json:"title"`
	GrossCents int    `json:"gross_cents"`
	Sold       int    `json:"sold"`
}

// TenantEventMetricRow is the store projection before HTTP shaping.
type TenantEventMetricRow struct {
	EventID    string
	Title      string
	Status     string
	GrossCents int
	Sold       int
}

func (s *Service) TenantMetrics(ctx context.Context, userID, tenantID, fromRaw, toRaw string) (TenantMetrics, error) {
	from, to, err := parseTenantMetricsWindow(s.now(), fromRaw, toRaw)
	if err != nil {
		return TenantMetrics{}, err
	}
	if err := s.requireTenantOwner(ctx, tenantID, userID); err != nil {
		return TenantMetrics{}, err
	}
	rows, paid, err := s.Store.TenantMetricsWindow(ctx, tenantID, from, to)
	if err != nil {
		return TenantMetrics{}, err
	}
	byEvent := make([]TenantEventMetrics, 0, len(rows))
	gross, sold, published := 0, 0, 0
	for _, row := range rows {
		gross += row.GrossCents
		sold += row.Sold
		if row.Status == StatusPublished {
			published++
		}
		byEvent = append(byEvent, TenantEventMetrics{
			EventID: row.EventID, Title: row.Title, GrossCents: row.GrossCents, Sold: row.Sold,
		})
	}
	return TenantMetrics{
		From: from, To: to, GrossCents: gross, OrdersPaid: paid,
		TicketsSold: sold, EventsPublished: published, ByEvent: byEvent,
	}, nil
}

func (s *Service) requireTenantOwner(ctx context.Context, tenantID, userID string) error {
	if s.Tenancy == nil {
		return auth.ErrForbidden
	}
	if strings.TrimSpace(tenantID) == "" || strings.TrimSpace(userID) == "" {
		return auth.ErrNotFound
	}
	if _, err := s.Tenancy.TenantByID(ctx, tenantID); err != nil {
		if errors.Is(err, auth.ErrNotFound) {
			return auth.ErrNotFound
		}
		return err
	}
	if s.isPlatformAdmin(ctx, userID) {
		return nil
	}
	role, err := s.Tenancy.Membership(ctx, tenantID, userID)
	if err != nil {
		if errors.Is(err, auth.ErrNotFound) {
			return auth.ErrNotFound
		}
		return err
	}
	if role != auth.TenantOwner {
		return auth.ErrForbidden
	}
	return nil
}

func (s *Service) isPlatformAdmin(ctx context.Context, userID string) bool {
	if s.Tenancy == nil || strings.TrimSpace(userID) == "" {
		return false
	}
	profs, err := s.Tenancy.Profiles(ctx, userID)
	if err != nil {
		return false
	}
	for _, p := range profs {
		if p == auth.ProfilePlatformAdmin {
			return true
		}
	}
	return false
}

func parseTenantMetricsWindow(now time.Time, fromRaw, toRaw string) (time.Time, time.Time, error) {
	now = now.UTC()
	fromRaw, toRaw = strings.TrimSpace(fromRaw), strings.TrimSpace(toRaw)
	if fromRaw == "" && toRaw == "" {
		return now.AddDate(0, 0, -tenantMetricsDefaultDays), now, nil
	}
	var fields []auth.Field
	if fromRaw == "" {
		fields = append(fields, auth.Field{Name: "from", Issue: "required"})
	}
	if toRaw == "" {
		fields = append(fields, auth.Field{Name: "to", Issue: "required"})
	}
	if len(fields) > 0 {
		return time.Time{}, time.Time{}, auth.Invalid{Fields: fields}
	}
	from, err := parseMetricsInstant(fromRaw)
	if err != nil {
		return time.Time{}, time.Time{}, auth.Invalid{Fields: []auth.Field{{Name: "from", Issue: "invalid"}}}
	}
	to, err := parseMetricsInstant(toRaw)
	if err != nil {
		return time.Time{}, time.Time{}, auth.Invalid{Fields: []auth.Field{{Name: "to", Issue: "invalid"}}}
	}
	if !to.After(from) {
		return time.Time{}, time.Time{}, auth.Invalid{Fields: []auth.Field{{Name: "to", Issue: "order"}}}
	}
	if to.Sub(from) > time.Duration(tenantMetricsMaxDays)*24*time.Hour {
		return time.Time{}, time.Time{}, auth.Invalid{Fields: []auth.Field{{Name: "to", Issue: "range"}}}
	}
	return from, to, nil
}

func parseMetricsInstant(raw string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return t.UTC(), nil
	}
	if t, err := time.Parse(time.RFC3339Nano, raw); err == nil {
		return t.UTC(), nil
	}
	if t, err := time.Parse("2006-01-02", raw); err == nil {
		return t.UTC(), nil
	}
	return time.Time{}, auth.ErrValidation
}

func eventOverlapsWindow(startsAt, endsAt, from, to time.Time) bool {
	return !startsAt.After(to) && !endsAt.Before(from)
}
