package events

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/parche-app/backend/internal/auth"
)

// Memory is an in-process Store for tests.
type Memory struct {
	mu          sync.Mutex
	byID        map[string]Event
	members     map[string]Member // eventID+"/"+userID
	invites     map[string]Invite // id
	hashes      map[string]string // token_hash → id
	tickets     map[string]TicketType
	orders      map[string]Order
	oitems      map[string][]OrderItem
	tix         map[string]Ticket
	payments    map[string]PaymentTx // provider_event_id
	claims      map[string]TicketClaim
	claimHashes map[string]string // token_hash → id
	scanLogs    []TicketScanLog
	order       []string
}

func NewMemory() *Memory {
	return &Memory{
		byID:        map[string]Event{},
		members:     map[string]Member{},
		invites:     map[string]Invite{},
		hashes:      map[string]string{},
		tickets:     map[string]TicketType{},
		orders:      map[string]Order{},
		oitems:      map[string][]OrderItem{},
		tix:         map[string]Ticket{},
		payments:    map[string]PaymentTx{},
		claims:      map[string]TicketClaim{},
		claimHashes: map[string]string{},
	}
}

func (m *Memory) Create(_ context.Context, e Event, ownerUserID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, cur := range m.byID {
		if cur.TenantID == e.TenantID && cur.Slug == e.Slug {
			return auth.ErrConflict
		}
	}
	now := time.Now().UTC()
	if e.CreatedAt.IsZero() {
		e.CreatedAt = now
	}
	e.UpdatedAt = now
	e.Genres = cloneGenres(e.Genres)
	m.byID[e.ID] = e
	m.order = append(m.order, e.ID)
	m.members[e.ID+"/"+ownerUserID] = Member{
		EventID: e.ID,
		UserID:  ownerUserID,
		Role:    RoleOwner,
		Status:  MemberActive,
	}
	return nil
}

func (m *Memory) ByID(_ context.Context, id string) (Event, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	e, ok := m.byID[id]
	if !ok {
		return Event{}, auth.ErrNotFound
	}
	return cloneEvent(e), nil
}

func (m *Memory) Update(_ context.Context, e Event) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cur, ok := m.byID[e.ID]
	if !ok {
		return auth.ErrNotFound
	}
	e.CreatedAt = cur.CreatedAt
	e.CreatedBy = cur.CreatedBy
	e.TenantID = cur.TenantID
	e.Slug = cur.Slug
	e.UpdatedAt = time.Now().UTC()
	e.Genres = cloneGenres(e.Genres)
	m.byID[e.ID] = e
	return nil
}

func (m *Memory) List(_ context.Context, f ListFilter) ([]Event, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	limit := f.Limit
	if limit < 1 {
		limit = 20
	}
	curStarts, curID, err := DecodeCursor(f.Cursor)
	if err != nil {
		return nil, err
	}
	items := make([]Event, 0, len(m.order))
	horizon := publicWindowStart(f.Now)
	for _, id := range m.order {
		e := m.byID[id]
		if f.Public {
			if e.Status != StatusPublished {
				continue
			}
			if !f.Now.IsZero() && e.StartsAt.Before(horizon) {
				continue
			}
		} else if f.TenantID != "" && e.TenantID != f.TenantID {
			continue
		}
		if f.BBox != nil && !f.BBox.Contains(e.Lat, e.Lng) {
			continue
		}
		if !matchesQuery(e, f.Q) {
			continue
		}
		if !startsInWindow(e, f.From, f.To) {
			continue
		}
		if !overlapsGenres(e.Genres, f.Genres) {
			continue
		}
		if !inRestrictIDs(e.ID, f.RestrictIDs) {
			continue
		}
		if f.VenueID != "" && e.VenueID != f.VenueID {
			continue
		}
		if f.Status != "" && e.Status != f.Status {
			continue
		}
		if !afterCursor(e, curStarts, curID) {
			continue
		}
		items = append(items, cloneEvent(e))
	}
	sort.Slice(items, func(i, j int) bool {
		if !items[i].StartsAt.Equal(items[j].StartsAt) {
			return items[i].StartsAt.Before(items[j].StartsAt)
		}
		return items[i].ID < items[j].ID
	})
	if len(items) > limit {
		items = items[:limit]
	}
	return items, nil
}

func (m *Memory) Member(_ context.Context, eventID, userID string) (Member, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	mem, ok := m.members[eventID+"/"+userID]
	if !ok {
		return Member{}, auth.ErrNotFound
	}
	return mem, nil
}

func (m *Memory) ListMembers(_ context.Context, eventID string) ([]Member, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []Member
	for _, mem := range m.members {
		if mem.EventID == eventID {
			out = append(out, mem)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].UserID < out[j].UserID })
	return out, nil
}

func (m *Memory) ListActiveByUser(_ context.Context, userID string) ([]Member, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []Member
	for _, mem := range m.members {
		if mem.UserID == userID && mem.Status == MemberActive {
			out = append(out, mem)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].EventID < out[j].EventID })
	return out, nil
}

func (m *Memory) UpsertMember(_ context.Context, mem Member) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.members[mem.EventID+"/"+mem.UserID] = mem
	return nil
}

func (m *Memory) ActiveOwnerCount(_ context.Context, eventID string) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	n := 0
	for _, mem := range m.members {
		if mem.EventID == eventID && mem.Role == RoleOwner && mem.Status == MemberActive {
			n++
		}
	}
	return n, nil
}

func (m *Memory) CreateInvite(_ context.Context, in Invite) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, cur := range m.invites {
		if cur.EventID == in.EventID && cur.Email == in.Email && cur.AcceptedAt == nil {
			return auth.ErrConflict
		}
		if cur.TokenHash == in.TokenHash {
			return auth.ErrConflict
		}
	}
	m.invites[in.ID] = in
	m.hashes[in.TokenHash] = in.ID
	return nil
}

func (m *Memory) InviteByTokenHash(_ context.Context, hash string) (Invite, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	id, ok := m.hashes[hash]
	if !ok {
		return Invite{}, auth.ErrNotFound
	}
	inv, ok := m.invites[id]
	if !ok {
		return Invite{}, auth.ErrNotFound
	}
	return inv, nil
}

func (m *Memory) PendingInvite(_ context.Context, eventID, email string) (Invite, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, inv := range m.invites {
		if inv.EventID == eventID && inv.Email == email && inv.AcceptedAt == nil {
			return inv, nil
		}
	}
	return Invite{}, auth.ErrNotFound
}

func (m *Memory) AcceptInvite(_ context.Context, inviteID string, member Member, at time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	inv, ok := m.invites[inviteID]
	if !ok {
		return auth.ErrNotFound
	}
	if inv.AcceptedAt != nil {
		return auth.ErrGone
	}
	inv.AcceptedAt = &at
	m.invites[inviteID] = inv
	m.members[member.EventID+"/"+member.UserID] = member
	return nil
}

func (m *Memory) ListTicketTypes(_ context.Context, eventID string) ([]TicketType, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.listTicketTypesLocked(eventID), nil
}

func (m *Memory) PutTicketTypes(_ context.Context, eventID string, upsert []TicketType, archiveIDs, deleteIDs []string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC()
	del := map[string]struct{}{}
	for _, id := range deleteIDs {
		del[id] = struct{}{}
	}
	arc := map[string]struct{}{}
	for _, id := range archiveIDs {
		arc[id] = struct{}{}
	}
	for id, t := range m.tickets {
		if t.EventID != eventID {
			continue
		}
		if _, ok := del[id]; ok {
			if t.SoldCount > 0 || t.ReservedCount > 0 {
				return auth.ErrConflict
			}
			delete(m.tickets, id)
			continue
		}
		if _, ok := arc[id]; ok {
			t.Status = TicketArchived
			t.UpdatedAt = now
			m.tickets[id] = t
		}
	}
	for _, t := range upsert {
		if t.EventID != eventID {
			continue
		}
		if cur, ok := m.tickets[t.ID]; ok {
			if t.Capacity < cur.SoldCount+cur.ReservedCount {
				return auth.ErrConflict
			}
			t.SoldCount = cur.SoldCount
			t.ReservedCount = cur.ReservedCount
			t.CreatedAt = cur.CreatedAt
			t.Currency = cur.Currency
		} else if t.CreatedAt.IsZero() {
			t.CreatedAt = now
		}
		t.UpdatedAt = now
		m.tickets[t.ID] = t
	}
	return nil
}

// ForceTicketCounts is a test seam for the capacity invariant before F16 checkout.
func (m *Memory) ForceTicketCounts(id string, sold, reserved int) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	t, ok := m.tickets[id]
	if !ok {
		return auth.ErrNotFound
	}
	if sold+reserved > t.Capacity {
		return auth.ErrConflict
	}
	t.SoldCount = sold
	t.ReservedCount = reserved
	m.tickets[id] = t
	return nil
}

func (m *Memory) listTicketTypesLocked(eventID string) []TicketType {
	var out []TicketType
	for _, t := range m.tickets {
		if t.EventID == eventID {
			out = append(out, t)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if !out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].CreatedAt.Before(out[j].CreatedAt)
		}
		return out[i].ID < out[j].ID
	})
	if out == nil {
		return []TicketType{}
	}
	return out
}

func (m *Memory) TenantMetricsWindow(_ context.Context, tenantID string, from, to time.Time) ([]TenantEventMetricRow, int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	type keyed struct {
		row      TenantEventMetricRow
		startsAt time.Time
	}
	var keyedRows []keyed
	ids := map[string]struct{}{}
	for _, e := range m.byID {
		if e.TenantID != tenantID || !eventOverlapsWindow(e.StartsAt, e.EndsAt, from, to) {
			continue
		}
		sold, gross := 0, 0
		for _, tt := range m.tickets {
			if tt.EventID != e.ID || tt.Status == TicketDraft {
				continue
			}
			sold += tt.SoldCount
			gross += tt.SoldCount * tt.PriceCents
		}
		ids[e.ID] = struct{}{}
		keyedRows = append(keyedRows, keyed{
			row: TenantEventMetricRow{
				EventID: e.ID, Title: e.Title, Status: e.Status, GrossCents: gross, Sold: sold,
			},
			startsAt: e.StartsAt,
		})
	}
	sort.Slice(keyedRows, func(i, j int) bool {
		if !keyedRows[i].startsAt.Equal(keyedRows[j].startsAt) {
			return keyedRows[i].startsAt.Before(keyedRows[j].startsAt)
		}
		return keyedRows[i].row.EventID < keyedRows[j].row.EventID
	})
	out := make([]TenantEventMetricRow, 0, len(keyedRows))
	for _, row := range keyedRows {
		out = append(out, row.row)
	}
	paid := 0
	for _, o := range m.orders {
		if _, ok := ids[o.EventID]; ok && o.Status == OrderPaid {
			paid++
		}
	}
	return out, paid, nil
}

func (m *Memory) CountPublished(_ context.Context) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	n := 0
	for _, e := range m.byID {
		if e.Status == StatusPublished {
			n++
		}
	}
	return n, nil
}

func (m *Memory) GMVSince(_ context.Context, since time.Time) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	sum := 0
	for _, o := range m.orders {
		if o.Status == OrderPaid && !o.CreatedAt.Before(since) {
			sum += o.AmountCents
		}
	}
	return sum, nil
}

func cloneEvent(e Event) Event {
	e.Genres = cloneGenres(e.Genres)
	return e
}
