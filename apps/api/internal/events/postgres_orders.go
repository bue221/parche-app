package events

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/parche-app/backend/internal/auth"
)

func (s *PG) CreateReservedOrder(ctx context.Context, o Order, items []OrderItem, tickets []Ticket) error {
	if s.pool == nil {
		return errors.New("postgres pool is nil")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := expirePendingTx(ctx, tx, o.EventID, o.CreatedAt); err != nil {
		return err
	}
	need := map[string]int{}
	for _, it := range items {
		need[it.TicketTypeID] += it.Quantity
	}
	for id, qty := range need {
		tag, err := tx.Exec(ctx, `
			UPDATE ticket_types
			SET reserved_count = reserved_count + $2, updated_at = now()
			WHERE id = $1 AND event_id = $3
				AND reserved_count + sold_count + $2 <= capacity`,
			id, qty, o.EventID)
		if err != nil {
			if isCheckViolation(err) {
				return auth.ErrConflict
			}
			return err
		}
		if tag.RowsAffected() != 1 {
			return auth.ErrConflict
		}
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO orders (
			id, user_id, event_id, status, amount_cents, currency, expires_at,
			checkout_url, idempotency_key, request_hash
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		o.ID, o.UserID, o.EventID, o.Status, o.AmountCents, o.Currency, o.ExpiresAt,
		o.CheckoutURL, o.IdempotencyKey, o.RequestHash)
	if err != nil {
		if isUniqueViolation(err) {
			return auth.ErrConflict
		}
		return err
	}
	for _, it := range items {
		if _, err := tx.Exec(ctx, `
			INSERT INTO order_items (id, order_id, ticket_type_id, quantity, unit_price_cents)
			VALUES ($1,$2,$3,$4,$5)`,
			it.ID, o.ID, it.TicketTypeID, it.Quantity, it.UnitPriceCents); err != nil {
			return err
		}
	}
	for _, t := range tickets {
		if _, err := tx.Exec(ctx, `
			INSERT INTO tickets (id, order_id, ticket_type_id, event_id, user_id, status)
			VALUES ($1,$2,$3,$4,$5,$6)`,
			t.ID, o.ID, t.TicketTypeID, t.EventID, t.UserID, t.Status); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s *PG) OrderByID(ctx context.Context, id string) (Order, error) {
	return scanOrder(s.q.QueryRow(ctx, orderSelect+` WHERE id = $1`, id))
}

func (s *PG) OrderByIdempotency(ctx context.Context, userID, eventID, key string) (Order, error) {
	return scanOrder(s.q.QueryRow(ctx, orderSelect+`
		WHERE user_id = $1 AND event_id = $2 AND idempotency_key = $3`, userID, eventID, key))
}

func (s *PG) ListOrderItems(ctx context.Context, orderID string) ([]OrderItem, error) {
	rows, err := s.q.Query(ctx, `
		SELECT id, order_id, ticket_type_id, quantity, unit_price_cents
		FROM order_items WHERE order_id = $1 ORDER BY id`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []OrderItem
	for rows.Next() {
		var it OrderItem
		if err := rows.Scan(&it.ID, &it.OrderID, &it.TicketTypeID, &it.Quantity, &it.UnitPriceCents); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	if out == nil {
		out = []OrderItem{}
	}
	return out, rows.Err()
}

func (s *PG) ListTicketsByUser(ctx context.Context, userID string) ([]Ticket, error) {
	rows, err := s.q.Query(ctx, ticketSelect+` WHERE user_id = $1 ORDER BY created_at DESC, id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Ticket
	for rows.Next() {
		t, err := scanTicket(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	if out == nil {
		out = []Ticket{}
	}
	return out, rows.Err()
}

func (s *PG) SetTicketJTI(ctx context.Context, ticketID, jti string) error {
	tag, err := s.q.Exec(ctx, `
		UPDATE tickets SET jti = $2
		WHERE id = $1 AND jti IS NULL`, ticketID, jti)
	if err != nil {
		if isUniqueViolation(err) {
			return nil
		}
		return err
	}
	if tag.RowsAffected() == 0 {
		var exists bool
		if err := s.q.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM tickets WHERE id = $1)`, ticketID).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			return auth.ErrNotFound
		}
	}
	return nil
}

func assignTicketJTIsTx(ctx context.Context, tx pgx.Tx, orderID string) error {
	rows, err := tx.Query(ctx, `
		SELECT id FROM tickets WHERE order_id = $1 AND status = $2 AND jti IS NULL`,
		orderID, TicketValid)
	if err != nil {
		return err
	}
	ids, err := collectIDs(rows)
	if err != nil {
		return err
	}
	for _, id := range ids {
		jti, err := newID()
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
			UPDATE tickets SET jti = $2, updated_at = now() WHERE id = $1 AND jti IS NULL`,
			id, jti); err != nil {
			return err
		}
	}
	return nil
}

func (s *PG) ListTicketsByOrder(ctx context.Context, orderID string) ([]Ticket, error) {
	rows, err := s.q.Query(ctx, ticketSelect+` WHERE order_id = $1 ORDER BY created_at, id`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Ticket
	for rows.Next() {
		t, err := scanTicket(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	if out == nil {
		out = []Ticket{}
	}
	return out, rows.Err()
}

func (s *PG) ApplyPayment(ctx context.Context, orderID string, ptx PaymentTx, success bool) (bool, error) {
	if s.pool == nil {
		return false, errors.New("postgres pool is nil")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var exists bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM payment_transactions WHERE provider_event_id = $1)`,
		ptx.ProviderEventID).Scan(&exists); err != nil {
		return false, err
	}
	if exists {
		return false, nil
	}
	var status string
	err = tx.QueryRow(ctx, `SELECT status FROM orders WHERE id = $1 FOR UPDATE`, orderID).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, auth.ErrNotFound
	}
	if err != nil {
		return false, err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO payment_transactions (
			id, order_id, provider, provider_event_id, status, raw_payload_hash, payload_truncated
		) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		ptx.ID, orderID, ptx.Provider, ptx.ProviderEventID, ptx.Status, ptx.PayloadHash, ptx.Truncated); err != nil {
		if isUniqueViolation(err) {
			return false, nil
		}
		return false, err
	}
	if status != OrderPending {
		if err := tx.Commit(ctx); err != nil {
			return false, err
		}
		return false, nil
	}
	next := OrderFailed
	ticketTo := TicketCancelled
	if success {
		next = OrderPaid
		ticketTo = TicketValid
	}
	if _, err := tx.Exec(ctx, `UPDATE orders SET status = $2, updated_at = now() WHERE id = $1`, orderID, next); err != nil {
		return false, err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE tickets SET status = $2, updated_at = now()
		WHERE order_id = $1 AND status = $3`, orderID, ticketTo, TicketReserved); err != nil {
		return false, err
	}
	if success {
		if err := moveReservedToSoldTx(ctx, tx, orderID); err != nil {
			return false, err
		}
		if err := assignTicketJTIsTx(ctx, tx, orderID); err != nil {
			return false, err
		}
	} else if err := releaseReservedTx(ctx, tx, orderID); err != nil {
		return false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return false, err
	}
	return true, nil
}

func (s *PG) ExpirePendingOrders(ctx context.Context, now time.Time) (int, error) {
	if s.pool == nil {
		return 0, errors.New("postgres pool is nil")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	n, err := expirePendingAllTx(ctx, tx, now)
	if err != nil {
		return 0, err
	}
	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return n, nil
}

func expirePendingTx(ctx context.Context, tx pgx.Tx, eventID string, now time.Time) error {
	rows, err := tx.Query(ctx, `
		SELECT id FROM orders
		WHERE event_id = $1 AND status = $2 AND expires_at <= $3
		FOR UPDATE`, eventID, OrderPending, now)
	if err != nil {
		return err
	}
	ids, err := collectIDs(rows)
	if err != nil {
		return err
	}
	for _, id := range ids {
		if err := expireOneTx(ctx, tx, id); err != nil {
			return err
		}
	}
	return nil
}

func expirePendingAllTx(ctx context.Context, tx pgx.Tx, now time.Time) (int, error) {
	rows, err := tx.Query(ctx, `
		SELECT id FROM orders WHERE status = $1 AND expires_at <= $2 FOR UPDATE`,
		OrderPending, now)
	if err != nil {
		return 0, err
	}
	ids, err := collectIDs(rows)
	if err != nil {
		return 0, err
	}
	for _, id := range ids {
		if err := expireOneTx(ctx, tx, id); err != nil {
			return 0, err
		}
	}
	return len(ids), nil
}

func expireOneTx(ctx context.Context, tx pgx.Tx, orderID string) error {
	if _, err := tx.Exec(ctx, `UPDATE orders SET status = $2, updated_at = now() WHERE id = $1 AND status = $3`,
		orderID, OrderExpired, OrderPending); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE tickets SET status = $2, updated_at = now()
		WHERE order_id = $1 AND status = $3`, orderID, TicketCancelled, TicketReserved); err != nil {
		return err
	}
	return releaseReservedTx(ctx, tx, orderID)
}

func releaseReservedTx(ctx context.Context, tx pgx.Tx, orderID string) error {
	_, err := tx.Exec(ctx, `
		UPDATE ticket_types AS tt
		SET reserved_count = reserved_count - x.qty, updated_at = now()
		FROM (
			SELECT ticket_type_id, SUM(quantity)::int AS qty
			FROM order_items WHERE order_id = $1
			GROUP BY ticket_type_id
		) AS x
		WHERE tt.id = x.ticket_type_id AND tt.reserved_count >= x.qty`, orderID)
	return err
}

func moveReservedToSoldTx(ctx context.Context, tx pgx.Tx, orderID string) error {
	_, err := tx.Exec(ctx, `
		UPDATE ticket_types AS tt
		SET reserved_count = reserved_count - x.qty,
			sold_count = sold_count + x.qty,
			updated_at = now()
		FROM (
			SELECT ticket_type_id, SUM(quantity)::int AS qty
			FROM order_items WHERE order_id = $1
			GROUP BY ticket_type_id
		) AS x
		WHERE tt.id = x.ticket_type_id AND tt.reserved_count >= x.qty`, orderID)
	return err
}

func collectIDs(rows pgx.Rows) ([]string, error) {
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

const orderSelect = `
	SELECT id, user_id, event_id, status, amount_cents, currency, expires_at,
		checkout_url, idempotency_key, request_hash, created_at, updated_at
	FROM orders`

const ticketSelect = `
	SELECT id, order_id, ticket_type_id, event_id, user_id, status, jti, created_at, updated_at
	FROM tickets`

func scanOrder(row rowScanner) (Order, error) {
	var o Order
	err := row.Scan(
		&o.ID, &o.UserID, &o.EventID, &o.Status, &o.AmountCents, &o.Currency, &o.ExpiresAt,
		&o.CheckoutURL, &o.IdempotencyKey, &o.RequestHash, &o.CreatedAt, &o.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Order{}, auth.ErrNotFound
	}
	if err != nil {
		return Order{}, err
	}
	o.ExpiresAt = o.ExpiresAt.UTC()
	o.CreatedAt = o.CreatedAt.UTC()
	o.UpdatedAt = o.UpdatedAt.UTC()
	return o, nil
}

func scanTicket(row rowScanner) (Ticket, error) {
	var t Ticket
	var jti *string
	err := row.Scan(&t.ID, &t.OrderID, &t.TicketTypeID, &t.EventID, &t.UserID, &t.Status, &jti, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Ticket{}, auth.ErrNotFound
	}
	if err != nil {
		return Ticket{}, err
	}
	if jti != nil {
		t.JTI = *jti
	}
	t.CreatedAt = t.CreatedAt.UTC()
	t.UpdatedAt = t.UpdatedAt.UTC()
	return t, nil
}
