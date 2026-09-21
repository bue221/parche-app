package payments

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/parche-app/backend/internal/auth"
)

const refreshSkew = 24 * time.Hour

// MemoryAccounts is the test double. Tokens stay in process memory.
type MemoryAccounts struct {
	mu        sync.Mutex
	byTenant  map[string]Account
	Refresher Refresher
}

func (m *MemoryAccounts) Get(_ context.Context, tenantID string) (Account, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	acc, ok := m.byTenant[strings.TrimSpace(tenantID)]
	if !ok {
		return Account{}, auth.ErrNotFound
	}
	return acc, nil
}

func (m *MemoryAccounts) Upsert(_ context.Context, acc Account) error {
	id := strings.TrimSpace(acc.TenantID)
	if id == "" || strings.TrimSpace(acc.AccessToken) == "" {
		return auth.Invalid{Fields: []auth.Field{{Name: "mercadopago", Issue: "invalid"}}}
	}
	acc.TenantID = id
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.byTenant == nil {
		m.byTenant = map[string]Account{}
	}
	m.byTenant[id] = acc
	return nil
}

func (m *MemoryAccounts) Delete(_ context.Context, tenantID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.byTenant, strings.TrimSpace(tenantID))
	return nil
}

func (m *MemoryAccounts) AccessToken(ctx context.Context, tenantID string) (string, error) {
	acc, err := m.Get(ctx, tenantID)
	if err != nil {
		if errors.Is(err, auth.ErrNotFound) {
			return "", ErrNotConnected
		}
		return "", err
	}
	if m.Refresher != nil && time.Until(acc.ExpiresAt) < refreshSkew {
		tok, err := m.Refresher.Refresh(ctx, acc.RefreshToken)
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
		acc.ExpiresAt = tok.ExpiresAt
		if err := m.Upsert(ctx, acc); err != nil {
			return "", err
		}
	}
	return acc.AccessToken, nil
}
