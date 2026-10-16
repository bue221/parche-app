package events

import (
	"context"
	"time"

	"github.com/parche-app/backend/internal/auth"
)

func (s *PG) MarkTicketUsed(ctx context.Context, ticketID string, now time.Time) error {
	tag, err := s.q.Exec(ctx, `
		UPDATE tickets SET status = $2, updated_at = $3
		WHERE id = $1 AND status IN ($2, $4)`,
		ticketID, TicketUsed, now.UTC(), TicketValid)
	if err != nil {
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

func (s *PG) InsertScanLog(ctx context.Context, row TicketScanLog) error {
	_, err := s.q.Exec(ctx, `
		INSERT INTO ticket_scan_logs (id, ticket_id, event_id, scanner_user_id, result, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		row.ID, row.TicketID, row.EventID, row.ScannerUserID, row.Result, row.CreatedAt.UTC())
	return err
}

func (s *PG) DoorInventory(ctx context.Context, eventID string) (sold, capacity, used int, err error) {
	err = s.q.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(sold_count), 0),
			COALESCE(SUM(capacity), 0)
		FROM ticket_types
		WHERE event_id = $1 AND status <> $2`, eventID, TicketDraft).Scan(&sold, &capacity)
	if err != nil {
		return 0, 0, 0, err
	}
	err = s.q.QueryRow(ctx, `
		SELECT COUNT(*) FROM tickets WHERE event_id = $1 AND status = $2`,
		eventID, TicketUsed).Scan(&used)
	return sold, capacity, used, err
}

func (s *PG) ListRecentScanLogs(ctx context.Context, eventID string, limit int) ([]TicketScanLog, error) {
	if limit <= 0 {
		limit = doorRecentMax
	}
	rows, err := s.q.Query(ctx, `
		SELECT id, ticket_id, event_id, scanner_user_id, result, created_at
		FROM ticket_scan_logs
		WHERE event_id = $1
		ORDER BY created_at DESC, id DESC
		LIMIT $2`, eventID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []TicketScanLog
	for rows.Next() {
		var row TicketScanLog
		if err := rows.Scan(&row.ID, &row.TicketID, &row.EventID, &row.ScannerUserID, &row.Result, &row.CreatedAt); err != nil {
			return nil, err
		}
		row.CreatedAt = row.CreatedAt.UTC()
		out = append(out, row)
	}
	if out == nil {
		out = []TicketScanLog{}
	}
	return out, rows.Err()
}
