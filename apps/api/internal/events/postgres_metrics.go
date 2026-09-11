package events

import (
	"context"
)

func (s *PG) TicketStatusCounts(ctx context.Context, eventID string) (valid, used, cancelled int, err error) {
	err = s.q.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE status = $2),
			COUNT(*) FILTER (WHERE status = $3),
			COUNT(*) FILTER (WHERE status = $4)
		FROM tickets
		WHERE event_id = $1`,
		eventID, TicketValid, TicketUsed, TicketCancelled).Scan(&valid, &used, &cancelled)
	return valid, used, cancelled, err
}

func (s *PG) ScannerScanCounts(ctx context.Context, eventID string) ([]ScannerScanCount, error) {
	rows, err := s.q.Query(ctx, `
		SELECT scanner_user_id,
			COUNT(*) FILTER (WHERE result = $2),
			COUNT(*) FILTER (WHERE result = $3)
		FROM ticket_scan_logs
		WHERE event_id = $1
		GROUP BY scanner_user_id
		ORDER BY scanner_user_id`, eventID, ScanApproved, ScanDuplicate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ScannerScanCount
	for rows.Next() {
		var row ScannerScanCount
		if err := rows.Scan(&row.UserID, &row.Approved, &row.Duplicate); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	if out == nil {
		out = []ScannerScanCount{}
	}
	return out, rows.Err()
}

func (s *PG) HourlyApproved(ctx context.Context, eventID string) ([]HourlyApproved, error) {
	rows, err := s.q.Query(ctx, `
		SELECT (date_trunc('hour', created_at AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC', COUNT(*)
		FROM ticket_scan_logs
		WHERE event_id = $1 AND result = $2
		GROUP BY 1
		ORDER BY 1`, eventID, ScanApproved)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []HourlyApproved
	for rows.Next() {
		var row HourlyApproved
		if err := rows.Scan(&row.Hour, &row.Approved); err != nil {
			return nil, err
		}
		row.Hour = row.Hour.UTC()
		out = append(out, row)
	}
	if out == nil {
		out = []HourlyApproved{}
	}
	return out, rows.Err()
}

func (s *PG) ListEventOrders(ctx context.Context, eventID, cursor string, limit int) ([]MetricsOrderRow, error) {
	if limit < 1 {
		limit = 20
	}
	curTS, curID, err := DecodeCursor(cursor)
	if err != nil {
		return nil, err
	}
	q := `
		SELECT id, user_id, amount_cents, status, created_at
		FROM orders
		WHERE event_id = $1`
	args := []any{eventID}
	if cursor != "" {
		q += ` AND (created_at, id) < ($2, $3)`
		args = append(args, curTS.UTC(), curID)
		q += ` ORDER BY created_at DESC, id DESC LIMIT $4`
		args = append(args, limit)
	} else {
		q += ` ORDER BY created_at DESC, id DESC LIMIT $2`
		args = append(args, limit)
	}
	rows, err := s.q.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []MetricsOrderRow
	for rows.Next() {
		var row MetricsOrderRow
		if err := rows.Scan(&row.ID, &row.UserID, &row.AmountCents, &row.Status, &row.CreatedAt); err != nil {
			return nil, err
		}
		row.CreatedAt = row.CreatedAt.UTC()
		out = append(out, row)
	}
	if out == nil {
		out = []MetricsOrderRow{}
	}
	return out, rows.Err()
}

func (s *PG) ListEventTicketExport(ctx context.Context, eventID string) ([]TicketExportRow, error) {
	rows, err := s.q.Query(ctx, `
		SELECT t.id, tt.name, t.status
		FROM tickets t
		JOIN ticket_types tt ON tt.id = t.ticket_type_id
		WHERE t.event_id = $1
		ORDER BY t.created_at ASC, t.id ASC`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []TicketExportRow
	for rows.Next() {
		var row TicketExportRow
		if err := rows.Scan(&row.ID, &row.TypeName, &row.Status); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	if out == nil {
		out = []TicketExportRow{}
	}
	return out, rows.Err()
}
