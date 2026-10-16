package mailer

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PG is the Postgres email_messages outbox.
type PG struct {
	q querier
}

type querier interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

func NewPG(pool *pgxpool.Pool) *PG {
	return &PG{q: pool}
}

func (s *PG) Enqueue(ctx context.Context, rec Record) (bool, error) {
	var toUser any
	if strings.TrimSpace(rec.ToUserID) != "" {
		toUser = rec.ToUserID
	}
	tag, err := s.q.Exec(ctx, `
		INSERT INTO email_messages (id, template, to_user_id, status, provider_id, idempotency_key, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
		ON CONFLICT (idempotency_key) DO NOTHING`,
		rec.ID, rec.Template, toUser, StatusQueued, rec.ProviderID, rec.IdempotencyKey, time.Now().UTC())
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

func (s *PG) ByIdempotency(ctx context.Context, key string) (Record, error) {
	var rec Record
	var toUser *string
	err := s.q.QueryRow(ctx, `
		SELECT id, template, to_user_id, status, provider_id, idempotency_key, created_at
		FROM email_messages WHERE idempotency_key = $1`, key).Scan(
		&rec.ID, &rec.Template, &toUser, &rec.Status, &rec.ProviderID, &rec.IdempotencyKey, &rec.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Record{}, errors.New("email message not found")
	}
	if err != nil {
		return Record{}, err
	}
	if toUser != nil {
		rec.ToUserID = *toUser
	}
	rec.CreatedAt = rec.CreatedAt.UTC()
	return rec, nil
}

func (s *PG) MarkSent(ctx context.Context, key, providerID string) error {
	return s.mark(ctx, key, StatusSent, providerID)
}

func (s *PG) MarkFailed(ctx context.Context, key, providerID string) error {
	return s.mark(ctx, key, StatusFailed, providerID)
}

func (s *PG) mark(ctx context.Context, key, status, providerID string) error {
	tag, err := s.q.Exec(ctx, `
		UPDATE email_messages
		SET status = $2, provider_id = $3, updated_at = $4
		WHERE idempotency_key = $1`, key, status, providerID, time.Now().UTC())
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("email message not found")
	}
	return nil
}
