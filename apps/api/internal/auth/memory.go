package auth

import (
	"context"
	"strings"
	"sync"
	"time"
)

// Memory is an in-process Store for tests. It is not used in production.
type Memory struct {
	mu         sync.Mutex
	inTx       bool
	users      map[string]User
	emailIndex map[string]string
	profiles   map[string][]string
	tenants    map[string]Tenant
	members    []member
	refresh    map[string]RefreshRow
	byID       map[string]RefreshRow
	resets     map[string]PasswordResetRow
	resetsByID map[string]PasswordResetRow
}

type member struct {
	TenantID string
	UserID   string
	Role     string
}

// NewMemory returns an empty session store.
func NewMemory() *Memory {
	return &Memory{
		users:      map[string]User{},
		emailIndex: map[string]string{},
		profiles:   map[string][]string{},
		tenants:    map[string]Tenant{},
		refresh:    map[string]RefreshRow{},
		byID:       map[string]RefreshRow{},
		resets:     map[string]PasswordResetRow{},
		resetsByID: map[string]PasswordResetRow{},
	}
}

func (m *Memory) lock() {
	if m.inTx {
		return
	}
	m.mu.Lock()
}

func (m *Memory) unlock() {
	if m.inTx {
		return
	}
	m.mu.Unlock()
}

func (m *Memory) InTx(_ context.Context, fn func(Store) error) error {
	if m.inTx {
		return fn(m)
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.inTx = true
	defer func() { m.inTx = false }()
	return fn(m)
}

func (m *Memory) CreateAccount(_ context.Context, acc Account) error {
	m.lock()
	defer m.unlock()
	email := acc.User.Email
	if _, ok := m.emailIndex[email]; ok {
		return ErrEmailTaken
	}
	m.users[acc.User.ID] = acc.User
	m.emailIndex[email] = acc.User.ID
	cp := append([]string{}, acc.Profiles...)
	m.profiles[acc.User.ID] = cp
	if acc.Tenant != nil {
		m.tenants[acc.Tenant.ID] = *acc.Tenant
		role := acc.Role
		if role == "" {
			role = TenantOwner
		}
		m.members = append(m.members, member{TenantID: acc.Tenant.ID, UserID: acc.User.ID, Role: role})
	}
	return nil
}

func (m *Memory) UserByEmail(_ context.Context, email string) (User, error) {
	m.lock()
	defer m.unlock()
	id, ok := m.emailIndex[email]
	if !ok {
		return User{}, ErrNotFound
	}
	return m.users[id], nil
}

func (m *Memory) UserByID(_ context.Context, id string) (User, error) {
	m.lock()
	defer m.unlock()
	u, ok := m.users[id]
	if !ok {
		return User{}, ErrNotFound
	}
	return u, nil
}

func (m *Memory) Profiles(_ context.Context, userID string) ([]string, error) {
	m.lock()
	defer m.unlock()
	p := m.profiles[userID]
	out := append([]string{}, p...)
	return out, nil
}

func (m *Memory) TenantForUser(_ context.Context, userID string) (*TenantView, error) {
	m.lock()
	defer m.unlock()
	for _, mem := range m.members {
		if mem.UserID != userID {
			continue
		}
		t, ok := m.tenants[mem.TenantID]
		if !ok {
			continue
		}
		return &TenantView{ID: t.ID, Name: t.Name, Role: mem.Role}, nil
	}
	return nil, nil
}

func (m *Memory) InsertRefresh(_ context.Context, row RefreshRow) error {
	m.lock()
	defer m.unlock()
	m.refresh[row.TokenHash] = row
	m.byID[row.ID] = row
	return nil
}

func (m *Memory) RefreshByHash(_ context.Context, hash string) (RefreshRow, error) {
	m.lock()
	defer m.unlock()
	row, ok := m.refresh[hash]
	if !ok {
		return RefreshRow{}, ErrNotFound
	}
	return row, nil
}

func (m *Memory) MarkReplaced(_ context.Context, id, newID string, at time.Time) error {
	m.lock()
	defer m.unlock()
	row, ok := m.byID[id]
	if !ok {
		return ErrNotFound
	}
	row.RevokedAt = &at
	row.ReplacedBy = &newID
	m.byID[id] = row
	m.refresh[row.TokenHash] = row
	return nil
}

func (m *Memory) RevokeFamily(_ context.Context, familyID string, at time.Time) error {
	m.lock()
	defer m.unlock()
	for hash, row := range m.refresh {
		if row.FamilyID != familyID {
			continue
		}
		if row.RevokedAt == nil {
			row.RevokedAt = &at
		}
		m.refresh[hash] = row
		m.byID[row.ID] = row
	}
	return nil
}

func (m *Memory) RevokeUser(_ context.Context, userID string, at time.Time) error {
	m.lock()
	defer m.unlock()
	for hash, row := range m.refresh {
		if row.UserID != userID {
			continue
		}
		if row.RevokedAt == nil {
			row.RevokedAt = &at
		}
		m.refresh[hash] = row
		m.byID[row.ID] = row
	}
	return nil
}

func (m *Memory) ListSessions(_ context.Context, userID string, now time.Time) ([]SessionView, error) {
	m.lock()
	defer m.unlock()
	type agg struct {
		created time.Time
		ua      string
	}
	families := map[string]agg{}
	for _, row := range m.refresh {
		if row.UserID != userID {
			continue
		}
		if row.RevokedAt != nil || !row.ExpiresAt.After(now) {
			continue
		}
		cur, ok := families[row.FamilyID]
		if !ok || row.CreatedAt.After(cur.created) {
			families[row.FamilyID] = agg{created: row.CreatedAt, ua: row.UserAgent}
		}
		if ok && row.CreatedAt.Before(cur.created) {
			a := families[row.FamilyID]
			a.created = row.CreatedAt
			families[row.FamilyID] = a
		}
	}
	// created_at of the family = earliest token; user_agent = latest active
	earliest := map[string]time.Time{}
	latestUA := map[string]string{}
	latestAt := map[string]time.Time{}
	for _, row := range m.refresh {
		if row.UserID != userID {
			continue
		}
		if _, ok := families[row.FamilyID]; !ok {
			continue
		}
		if t, ok := earliest[row.FamilyID]; !ok || row.CreatedAt.Before(t) {
			earliest[row.FamilyID] = row.CreatedAt
		}
		if row.RevokedAt == nil && row.ExpiresAt.After(now) {
			if t, ok := latestAt[row.FamilyID]; !ok || row.CreatedAt.After(t) {
				latestAt[row.FamilyID] = row.CreatedAt
				latestUA[row.FamilyID] = row.UserAgent
			}
		}
	}
	out := make([]SessionView, 0, len(families))
	for id := range families {
		out = append(out, SessionView{ID: id, CreatedAt: earliest[id], UserAgent: latestUA[id]})
	}
	return out, nil
}

func (m *Memory) InsertPasswordReset(_ context.Context, row PasswordResetRow) error {
	m.lock()
	defer m.unlock()
	m.resets[row.TokenHash] = row
	m.resetsByID[row.ID] = row
	return nil
}

func (m *Memory) PasswordResetByHash(_ context.Context, hash string) (PasswordResetRow, error) {
	m.lock()
	defer m.unlock()
	row, ok := m.resets[hash]
	if !ok {
		return PasswordResetRow{}, ErrNotFound
	}
	return row, nil
}

func (m *Memory) MarkPasswordResetUsed(_ context.Context, id string, at time.Time) error {
	m.lock()
	defer m.unlock()
	row, ok := m.resetsByID[id]
	if !ok {
		return ErrNotFound
	}
	if row.UsedAt == nil {
		row.UsedAt = &at
	}
	m.resetsByID[id] = row
	m.resets[row.TokenHash] = row
	return nil
}

func (m *Memory) InvalidateUserPasswordResets(_ context.Context, userID string, at time.Time) error {
	m.lock()
	defer m.unlock()
	for hash, row := range m.resets {
		if row.UserID != userID || row.UsedAt != nil {
			continue
		}
		row.UsedAt = &at
		m.resets[hash] = row
		m.resetsByID[row.ID] = row
	}
	return nil
}

func (m *Memory) SetPasswordAndBumpEpoch(_ context.Context, userID, passwordHash string) error {
	m.lock()
	defer m.unlock()
	u, ok := m.users[userID]
	if !ok {
		return ErrNotFound
	}
	u.PasswordHash = passwordHash
	u.SessionEpoch++
	m.users[userID] = u
	return nil
}

func (m *Memory) SetStatus(userID, status string) {
	m.lock()
	defer m.unlock()
	u, ok := m.users[userID]
	if !ok {
		return
	}
	u.Status = status
	m.users[userID] = u
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
