package events

import (
	"context"
	"sort"
	"time"

	"github.com/parche-app/backend/internal/auth"
)

func (m *Memory) CreateReservedOrder(_ context.Context, o Order, items []OrderItem, tickets []Ticket) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.orders[o.ID]; ok {
		return auth.ErrConflict
	}
	for _, cur := range m.orders {
		if cur.UserID == o.UserID && cur.EventID == o.EventID && cur.IdempotencyKey == o.IdempotencyKey {
			return auth.ErrConflict
		}
	}
	need := map[string]int{}
	for _, it := range items {
		need[it.TicketTypeID] += it.Quantity
	}
	for id, qty := range need {
		tt, ok := m.tickets[id]
		if !ok || tt.EventID != o.EventID {
			return auth.ErrNotFound
		}
		if tt.ReservedCount+tt.SoldCount+qty > tt.Capacity {
			return auth.ErrConflict
		}
	}
	for id, qty := range need {
		tt := m.tickets[id]
		tt.ReservedCount += qty
		tt.UpdatedAt = o.CreatedAt
		m.tickets[id] = tt
	}
	m.orders[o.ID] = o
	cp := make([]OrderItem, len(items))
	copy(cp, items)
	m.oitems[o.ID] = cp
	for _, t := range tickets {
		m.tix[t.ID] = t
	}
	return nil
}

func (m *Memory) OrderByID(_ context.Context, id string) (Order, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	o, ok := m.orders[id]
	if !ok {
		return Order{}, auth.ErrNotFound
	}
	return o, nil
}

func (m *Memory) OrderByIdempotency(_ context.Context, userID, eventID, key string) (Order, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, o := range m.orders {
		if o.UserID == userID && o.EventID == eventID && o.IdempotencyKey == key {
			return o, nil
		}
	}
	return Order{}, auth.ErrNotFound
}

func (m *Memory) ListOrderItems(_ context.Context, orderID string) ([]OrderItem, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	items := m.oitems[orderID]
	if items == nil {
		return []OrderItem{}, nil
	}
	out := make([]OrderItem, len(items))
	copy(out, items)
	return out, nil
}

func (m *Memory) ListTicketsByOrder(_ context.Context, orderID string) ([]Ticket, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []Ticket
	for _, t := range m.tix {
		if t.OrderID == orderID {
			out = append(out, t)
		}
	}
	if out == nil {
		out = []Ticket{}
	}
	return out, nil
}

func (m *Memory) ApplyPayment(_ context.Context, orderID string, tx PaymentTx, success bool) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, dup := m.payments[tx.ProviderEventID]; dup {
		return false, nil
	}
	o, ok := m.orders[orderID]
	if !ok {
		return false, auth.ErrNotFound
	}
	m.payments[tx.ProviderEventID] = tx
	if o.Status != OrderPending {
		return false, nil
	}
	now := time.Now().UTC()
	if success {
		o.Status = OrderPaid
		m.shiftTicketsLocked(orderID, TicketReserved, TicketValid, now)
		m.moveReservedToSoldLocked(orderID, now)
	} else {
		o.Status = OrderFailed
		m.shiftTicketsLocked(orderID, TicketReserved, TicketCancelled, now)
		m.releaseReservedLocked(orderID, now)
	}
	o.UpdatedAt = now
	m.orders[orderID] = o
	return true, nil
}

func (m *Memory) ExpirePendingOrders(_ context.Context, now time.Time) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	n := 0
	for id, o := range m.orders {
		if o.Status != OrderPending || o.ExpiresAt.After(now) {
			continue
		}
		m.shiftTicketsLocked(id, TicketReserved, TicketCancelled, now)
		m.releaseReservedLocked(id, now)
		o.Status = OrderExpired
		o.UpdatedAt = now
		m.orders[id] = o
		n++
	}
	return n, nil
}

func (m *Memory) shiftTicketsLocked(orderID, from, to string, now time.Time) {
	for id, t := range m.tix {
		if t.OrderID == orderID && t.Status == from {
			t.Status = to
			t.UpdatedAt = now
			if to == TicketValid && t.JTI == "" {
				if jti, err := newID(); err == nil {
					t.JTI = jti
				}
			}
			m.tix[id] = t
		}
	}
}

func (m *Memory) ListTicketsByUser(_ context.Context, userID string) ([]Ticket, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []Ticket
	for _, t := range m.tix {
		if t.UserID == userID {
			out = append(out, t)
		}
	}
	if out == nil {
		out = []Ticket{}
	}
	sort.Slice(out, func(i, j int) bool {
		if !out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].CreatedAt.After(out[j].CreatedAt)
		}
		return out[i].ID < out[j].ID
	})
	return out, nil
}

func (m *Memory) SetTicketJTI(_ context.Context, ticketID, jti string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	t, ok := m.tix[ticketID]
	if !ok {
		return auth.ErrNotFound
	}
	if t.JTI != "" {
		return nil
	}
	t.JTI = jti
	m.tix[ticketID] = t
	return nil
}

func (m *Memory) qtyByTypeLocked(orderID string) map[string]int {
	out := map[string]int{}
	for _, it := range m.oitems[orderID] {
		out[it.TicketTypeID] += it.Quantity
	}
	return out
}

func (m *Memory) releaseReservedLocked(orderID string, now time.Time) {
	for id, qty := range m.qtyByTypeLocked(orderID) {
		tt, ok := m.tickets[id]
		if !ok {
			continue
		}
		tt.ReservedCount -= qty
		if tt.ReservedCount < 0 {
			tt.ReservedCount = 0
		}
		tt.UpdatedAt = now
		m.tickets[id] = tt
	}
}

func (m *Memory) moveReservedToSoldLocked(orderID string, now time.Time) {
	for id, qty := range m.qtyByTypeLocked(orderID) {
		tt, ok := m.tickets[id]
		if !ok {
			continue
		}
		tt.ReservedCount -= qty
		if tt.ReservedCount < 0 {
			tt.ReservedCount = 0
		}
		tt.SoldCount += qty
		tt.UpdatedAt = now
		m.tickets[id] = tt
	}
}
