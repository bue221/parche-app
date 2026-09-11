package events

import (
	"context"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/parche-app/backend/internal/auth"
)

const (
	TicketDraft    = "draft"
	TicketOnSale   = "on_sale"
	TicketPaused   = "paused"
	TicketSoldOut  = "sold_out"
	TicketArchived = "archived"

	maxTicketName  = 80
	maxTicketTypes = 32
)

// TicketType is a priced inventory row on an event. Checkout (F16) mutates counts.
type TicketType struct {
	ID            string     `json:"id"`
	EventID       string     `json:"event_id"`
	Name          string     `json:"name"`
	PriceCents    int        `json:"price_cents"`
	Currency      string     `json:"currency"`
	Capacity      int        `json:"capacity"`
	SoldCount     int        `json:"sold_count"`
	ReservedCount int        `json:"reserved_count"`
	SalesStartsAt *time.Time `json:"sales_starts_at,omitempty"`
	SalesEndsAt   *time.Time `json:"sales_ends_at,omitempty"`
	Status        string     `json:"status"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// TicketTypeInput is one row of PUT /v1/events/{id}/ticket-types. Counts and currency are server-owned.
type TicketTypeInput struct {
	ID            string     `json:"id"`
	Name          string     `json:"name"`
	PriceCents    int        `json:"price_cents"`
	Capacity      int        `json:"capacity"`
	SalesStartsAt *time.Time `json:"sales_starts_at"`
	SalesEndsAt   *time.Time `json:"sales_ends_at"`
	Status        string     `json:"status"`
}

// PutTicketTypes upserts the catalog. Types with sold>0 that are omitted become archived, not deleted.
func (s *Service) PutTicketTypes(ctx context.Context, userID, eventID string, items []TicketTypeInput) ([]TicketType, error) {
	e, err := s.requirePerm(ctx, userID, eventID, PermTicketsManage)
	if err != nil {
		return nil, err
	}
	if e.Status == StatusCancelled || e.Status == StatusArchived {
		return nil, auth.ErrConflict
	}
	if len(items) > maxTicketTypes {
		return nil, auth.Invalid{Fields: []auth.Field{{Name: "items", Issue: "length"}}}
	}
	existing, err := s.Store.ListTicketTypes(ctx, eventID)
	if err != nil {
		return nil, err
	}
	byID := make(map[string]TicketType, len(existing))
	for _, t := range existing {
		byID[t.ID] = t
	}
	tenant, err := s.Tenancy.TenantByID(ctx, e.TenantID)
	if err != nil {
		return nil, err
	}
	currency := strings.ToUpper(strings.TrimSpace(tenant.Currency))
	if currency == "" {
		currency = "COP"
	}
	now := s.now()
	seen := make(map[string]struct{}, len(items))
	upsert := make([]TicketType, 0, len(items))
	var fields []auth.Field
	capacityConflict := false
	for i, in := range items {
		prefix := itemField(i)
		row, ferrs, capErr := s.buildTicketType(in, byID, eventID, currency, now, prefix)
		if capErr {
			capacityConflict = true
			continue
		}
		if len(ferrs) > 0 {
			fields = append(fields, ferrs...)
			continue
		}
		if _, dup := seen[row.ID]; dup {
			fields = append(fields, auth.Field{Name: prefix + "id", Issue: "duplicate"})
			continue
		}
		seen[row.ID] = struct{}{}
		upsert = append(upsert, row)
	}
	if len(fields) > 0 {
		return nil, auth.Invalid{Fields: fields}
	}
	if capacityConflict {
		return nil, auth.ErrConflict
	}
	var archiveIDs, deleteIDs []string
	for _, cur := range existing {
		if _, keep := seen[cur.ID]; keep {
			continue
		}
		if cur.SoldCount > 0 || cur.ReservedCount > 0 {
			archiveIDs = append(archiveIDs, cur.ID)
			continue
		}
		deleteIDs = append(deleteIDs, cur.ID)
	}
	if err := s.Store.PutTicketTypes(ctx, eventID, upsert, archiveIDs, deleteIDs); err != nil {
		return nil, err
	}
	return s.Store.ListTicketTypes(ctx, eventID)
}

// ListTicketTypes is GET /v1/events/{id}/ticket-types. Public published events see on_sale and sold_out only.
func (s *Service) ListTicketTypes(ctx context.Context, userID, eventID string) ([]TicketType, error) {
	e, err := s.Store.ByID(ctx, eventID)
	if err != nil {
		return nil, err
	}
	member := false
	if strings.TrimSpace(userID) != "" {
		if _, err := s.memberRole(ctx, eventID, userID); err == nil {
			member = true
		}
	}
	if !member {
		switch e.Status {
		case StatusPublished:
		case StatusCancelled:
			return []TicketType{}, nil
		default:
			return nil, auth.ErrNotFound
		}
	}
	items, err := s.Store.ListTicketTypes(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if member {
		return items, nil
	}
	out := make([]TicketType, 0, len(items))
	for _, t := range items {
		if t.Status == TicketOnSale || t.Status == TicketSoldOut {
			out = append(out, t)
		}
	}
	return out, nil
}

func (s *Service) buildTicketType(in TicketTypeInput, byID map[string]TicketType, eventID, currency string, now time.Time, prefix string) (TicketType, []auth.Field, bool) {
	var fields []auth.Field
	name := strings.TrimSpace(in.Name)
	if name == "" || utf8.RuneCountInString(name) > maxTicketName {
		fields = append(fields, auth.Field{Name: prefix + "name", Issue: "invalid"})
	}
	if in.PriceCents < 0 {
		fields = append(fields, auth.Field{Name: prefix + "price_cents", Issue: "negative"})
	}
	if in.Capacity < 1 {
		fields = append(fields, auth.Field{Name: prefix + "capacity", Issue: "min"})
	}
	status := strings.TrimSpace(in.Status)
	if status == "" {
		status = TicketDraft
	}
	if !validTicketStatus(status) {
		fields = append(fields, auth.Field{Name: prefix + "status", Issue: "invalid"})
	}
	starts, ends := in.SalesStartsAt, in.SalesEndsAt
	if starts != nil {
		t := starts.UTC()
		starts = &t
	}
	if ends != nil {
		t := ends.UTC()
		ends = &t
	}
	if starts != nil && ends != nil && !ends.After(*starts) {
		fields = append(fields, auth.Field{Name: prefix + "sales_ends_at", Issue: "order"})
	}
	id := strings.TrimSpace(in.ID)
	row := TicketType{
		ID:            id,
		EventID:       eventID,
		Name:          name,
		PriceCents:    in.PriceCents,
		Currency:      currency,
		Capacity:      in.Capacity,
		SalesStartsAt: starts,
		SalesEndsAt:   ends,
		Status:        status,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if id == "" {
		nid, err := newID()
		if err != nil {
			fields = append(fields, auth.Field{Name: prefix + "id", Issue: "invalid"})
			return TicketType{}, fields, false
		}
		row.ID = nid
		return row, fields, false
	}
	cur, ok := byID[id]
	if !ok {
		fields = append(fields, auth.Field{Name: prefix + "id", Issue: "unknown"})
		return TicketType{}, fields, false
	}
	committed := cur.SoldCount + cur.ReservedCount
	if in.Capacity >= 1 && in.Capacity < committed {
		return TicketType{}, fields, true
	}
	row.SoldCount = cur.SoldCount
	row.ReservedCount = cur.ReservedCount
	row.Currency = cur.Currency
	row.CreatedAt = cur.CreatedAt
	return row, fields, false
}

func validTicketStatus(status string) bool {
	switch status {
	case TicketDraft, TicketOnSale, TicketPaused, TicketSoldOut, TicketArchived:
		return true
	default:
		return false
	}
}

func itemField(i int) string {
	return "items." + strconv.Itoa(i) + "."
}
