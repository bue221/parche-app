package events

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/parche-app/backend/internal/auth"
)

func (s *PG) TicketByID(ctx context.Context, id string) (Ticket, error) {
	return scanTicket(s.q.QueryRow(ctx, ticketSelect+` WHERE id = $1`, id))
}

func (s *PG) TransferValidTicket(ctx context.Context, ticketID, fromUserID, toUserID, newJTI string, now time.Time) (Ticket, error) {
	tag, err := s.q.Exec(ctx, `
		UPDATE tickets
		SET user_id = $3, jti = $4, transfer_count = transfer_count + 1, updated_at = $5
		WHERE id = $1 AND user_id = $2 AND status = $6 AND transfer_count < $7`,
		ticketID, fromUserID, toUserID, newJTI, now, TicketValid, maxTicketTransfers)
	if err != nil {
		if isUniqueViolation(err) {
			return Ticket{}, auth.ErrConflict
		}
		return Ticket{}, err
	}
	if tag.RowsAffected() == 0 {
		t, err := s.TicketByID(ctx, ticketID)
		if err != nil {
			return Ticket{}, err
		}
		if t.UserID != fromUserID {
			return Ticket{}, auth.ErrForbidden
		}
		return Ticket{}, auth.ErrConflict
	}
	return s.TicketByID(ctx, ticketID)
}

func (s *PG) CreateTicketClaim(ctx context.Context, in TicketClaim) error {
	if err := s.DeleteExpiredTicketClaims(ctx, in.TicketID, in.CreatedAt); err != nil {
		return err
	}
	_, err := s.q.Exec(ctx, `
		INSERT INTO ticket_claims (id, ticket_id, from_user_id, to_email, token_hash, expires_at, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		in.ID, in.TicketID, in.FromUserID, in.ToEmail, in.TokenHash, in.ExpiresAt, in.CreatedAt)
	if isUniqueViolation(err) {
		return auth.ErrConflict
	}
	return err
}

func (s *PG) TicketClaimByTokenHash(ctx context.Context, hash string) (TicketClaim, error) {
	return scanTicketClaim(s.q.QueryRow(ctx, ticketClaimSelect+` WHERE token_hash = $1`, hash))
}

func (s *PG) PendingTicketClaim(ctx context.Context, ticketID string) (TicketClaim, error) {
	return scanTicketClaim(s.q.QueryRow(ctx, ticketClaimSelect+`
		WHERE ticket_id = $1 AND accepted_at IS NULL`, ticketID))
}

func (s *PG) DeleteExpiredTicketClaims(ctx context.Context, ticketID string, now time.Time) error {
	_, err := s.q.Exec(ctx, `
		DELETE FROM ticket_claims
		WHERE ticket_id = $1 AND accepted_at IS NULL AND expires_at <= $2`, ticketID, now)
	return err
}

func (s *PG) AcceptTicketClaim(ctx context.Context, claimID, toUserID, newJTI string, now time.Time) (Ticket, error) {
	if s.pool == nil {
		return Ticket{}, fmt.Errorf("postgres pool is nil")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Ticket{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	claim, err := scanTicketClaim(tx.QueryRow(ctx, ticketClaimSelect+`
		WHERE id = $1 FOR UPDATE`, claimID))
	if err != nil {
		return Ticket{}, err
	}
	if claim.AcceptedAt != nil || !claim.ExpiresAt.After(now) {
		return Ticket{}, auth.ErrGone
	}
	tag, err := tx.Exec(ctx, `
		UPDATE ticket_claims SET accepted_at = $2
		WHERE id = $1 AND accepted_at IS NULL AND expires_at > $2`, claimID, now)
	if err != nil {
		return Ticket{}, err
	}
	if tag.RowsAffected() == 0 {
		return Ticket{}, auth.ErrGone
	}
	tag, err = tx.Exec(ctx, `
		UPDATE tickets
		SET user_id = $3, jti = $4, transfer_count = transfer_count + 1, updated_at = $5
		WHERE id = $1 AND user_id = $2 AND status = $6 AND transfer_count < $7`,
		claim.TicketID, claim.FromUserID, toUserID, newJTI, now, TicketValid, maxTicketTransfers)
	if err != nil {
		if isUniqueViolation(err) {
			return Ticket{}, auth.ErrConflict
		}
		return Ticket{}, err
	}
	if tag.RowsAffected() == 0 {
		return Ticket{}, auth.ErrConflict
	}
	moved, err := scanTicket(tx.QueryRow(ctx, ticketSelect+` WHERE id = $1`, claim.TicketID))
	if err != nil {
		return Ticket{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Ticket{}, err
	}
	return moved, nil
}

const ticketClaimSelect = `
	SELECT id, ticket_id, from_user_id, to_email, token_hash, expires_at, accepted_at, created_at
	FROM ticket_claims`

func scanTicketClaim(row rowScanner) (TicketClaim, error) {
	var c TicketClaim
	err := row.Scan(&c.ID, &c.TicketID, &c.FromUserID, &c.ToEmail, &c.TokenHash, &c.ExpiresAt, &c.AcceptedAt, &c.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return TicketClaim{}, auth.ErrNotFound
	}
	if err != nil {
		return TicketClaim{}, err
	}
	c.ExpiresAt = c.ExpiresAt.UTC()
	c.CreatedAt = c.CreatedAt.UTC()
	if c.AcceptedAt != nil {
		t := c.AcceptedAt.UTC()
		c.AcceptedAt = &t
	}
	return c, nil
}
