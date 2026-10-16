package payments

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/parche-app/backend/internal/auth"
)

// PGAccounts persists seller OAuth tokens encrypted at rest.
type PGAccounts struct {
	pool      *pgxpool.Pool
	key       []byte
	Refresher Refresher
}

func NewPGAccounts(pool *pgxpool.Pool, key []byte) *PGAccounts {
	return &PGAccounts{pool: pool, key: key}
}

func (s *PGAccounts) Get(ctx context.Context, tenantID string) (Account, error) {
	if s == nil || s.pool == nil {
		return Account{}, auth.ErrNotFound
	}
	var acc Account
	var accessEnc, refreshEnc []byte
	err := s.pool.QueryRow(ctx, `
		SELECT tenant_id, mp_user_id, access_token_enc, refresh_token_enc, public_key, expires_at
		FROM tenant_mp_accounts WHERE tenant_id = $1`, strings.TrimSpace(tenantID)).Scan(
		&acc.TenantID, &acc.MPUserID, &accessEnc, &refreshEnc, &acc.PublicKey, &acc.ExpiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Account{}, auth.ErrNotFound
	}
	if err != nil {
		return Account{}, err
	}
	access, err := open(s.key, accessEnc)
	if err != nil {
		return Account{}, err
	}
	refresh, err := open(s.key, refreshEnc)
	if err != nil {
		return Account{}, err
	}
	acc.AccessToken = string(access)
	acc.RefreshToken = string(refresh)
	return acc, nil
}

func (s *PGAccounts) Delete(ctx context.Context, tenantID string) error {
	if s == nil || s.pool == nil {
		return errors.New("postgres pool is nil")
	}
	_, err := s.pool.Exec(ctx, `DELETE FROM tenant_mp_accounts WHERE tenant_id = $1`, strings.TrimSpace(tenantID))
	return err
}

func (s *PGAccounts) Upsert(ctx context.Context, acc Account) error {
	if s == nil || s.pool == nil {
		return errors.New("postgres pool is nil")
	}
	acc.TenantID = strings.TrimSpace(acc.TenantID)
	if acc.TenantID == "" || strings.TrimSpace(acc.AccessToken) == "" {
		return auth.Invalid{Fields: []auth.Field{{Name: "mercadopago", Issue: "invalid"}}}
	}
	accessEnc, err := seal(s.key, []byte(acc.AccessToken))
	if err != nil {
		return err
	}
	refreshEnc, err := seal(s.key, []byte(acc.RefreshToken))
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
		INSERT INTO tenant_mp_accounts (
			tenant_id, mp_user_id, access_token_enc, refresh_token_enc, public_key, expires_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,now())
		ON CONFLICT (tenant_id) DO UPDATE SET
			mp_user_id = EXCLUDED.mp_user_id,
			access_token_enc = EXCLUDED.access_token_enc,
			refresh_token_enc = EXCLUDED.refresh_token_enc,
			public_key = EXCLUDED.public_key,
			expires_at = EXCLUDED.expires_at,
			updated_at = now()`,
		acc.TenantID, acc.MPUserID, accessEnc, refreshEnc, acc.PublicKey, acc.ExpiresAt)
	return err
}

func (s *PGAccounts) AccessToken(ctx context.Context, tenantID string) (string, error) {
	acc, err := s.Get(ctx, tenantID)
	if err != nil {
		if errors.Is(err, auth.ErrNotFound) {
			return "", ErrNotConnected
		}
		return "", err
	}
	if s.Refresher != nil && time.Until(acc.ExpiresAt) < refreshSkew {
		tok, err := s.Refresher.Refresh(ctx, acc.RefreshToken)
		if err != nil {
			return "", err
		}
		acc.AccessToken = tok.AccessToken
		if tok.RefreshToken != "" {
			acc.RefreshToken = tok.RefreshToken
		}
		if tok.PublicKey != "" {
			acc.PublicKey = tok.PublicKey
		}
		if tok.UserID != "" {
			acc.MPUserID = tok.UserID
		}
		acc.ExpiresAt = tok.ExpiresAt
		if err := s.Upsert(ctx, acc); err != nil {
			return "", err
		}
	}
	return acc.AccessToken, nil
}
