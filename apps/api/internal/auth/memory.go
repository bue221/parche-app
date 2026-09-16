package auth

import (
	"context"
	"sort"
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
	emailChg   map[string]EmailChangeRow
	emailChgID map[string]EmailChangeRow
	otp        map[string]OTPChallenge
	identities map[string]Identity
}

type member struct {
	TenantID  string
	UserID    string
	Role      string
	CreatedAt time.Time
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
		emailChg:   map[string]EmailChangeRow{},
		emailChgID: map[string]EmailChangeRow{},
		otp:        map[string]OTPChallenge{},
		identities: map[string]Identity{},
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
		m.members = append(m.members, member{TenantID: acc.Tenant.ID, UserID: acc.User.ID, Role: role, CreatedAt: acc.User.CreatedAt})
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

func (m *Memory) TenantForUser(ctx context.Context, userID string) (*TenantView, error) {
	list, err := m.TenantsForUser(ctx, userID)
	if err != nil || len(list) == 0 {
		return nil, err
	}
	v := list[0]
	return &v, nil
}

func (m *Memory) TenantsForUser(_ context.Context, userID string) ([]TenantView, error) {
	m.lock()
	defer m.unlock()
	var out []TenantView
	for _, mem := range m.members {
		if mem.UserID != userID {
			continue
		}
		t, ok := m.tenants[mem.TenantID]
		if !ok {
			continue
		}
		out = append(out, TenantView{ID: t.ID, Name: t.Name, Role: mem.Role})
	}
	if out == nil {
		out = []TenantView{}
	}
	return out, nil
}

func (m *Memory) InsertProfile(_ context.Context, userID, profile string) error {
	m.lock()
	defer m.unlock()
	if _, ok := m.users[userID]; !ok {
		return ErrNotFound
	}
	for _, p := range m.profiles[userID] {
		if p == profile {
			return nil
		}
	}
	m.profiles[userID] = append(m.profiles[userID], profile)
	return nil
}

func (m *Memory) CreateTenant(_ context.Context, t Tenant, ownerUserID string) error {
	m.lock()
	defer m.unlock()
	if _, ok := m.users[ownerUserID]; !ok {
		return ErrNotFound
	}
	for _, existing := range m.tenants {
		if existing.Slug == t.Slug {
			return ErrConflict
		}
	}
	m.tenants[t.ID] = t
	m.members = append(m.members, member{TenantID: t.ID, UserID: ownerUserID, Role: TenantOwner, CreatedAt: time.Now().UTC()})
	return nil
}

func (m *Memory) TenantByID(_ context.Context, id string) (Tenant, error) {
	m.lock()
	defer m.unlock()
	t, ok := m.tenants[id]
	if !ok {
		return Tenant{}, ErrNotFound
	}
	return t, nil
}

func (m *Memory) Membership(_ context.Context, tenantID, userID string) (string, error) {
	m.lock()
	defer m.unlock()
	if _, ok := m.tenants[tenantID]; !ok {
		return "", ErrNotFound
	}
	for _, mem := range m.members {
		if mem.TenantID == tenantID && mem.UserID == userID {
			return mem.Role, nil
		}
	}
	return "", ErrNotFound
}

func (m *Memory) UpdateTenant(_ context.Context, id, name, currency string) error {
	m.lock()
	defer m.unlock()
	t, ok := m.tenants[id]
	if !ok {
		return ErrNotFound
	}
	t.Name = name
	t.Currency = currency
	m.tenants[id] = t
	return nil
}

func (m *Memory) ListMembers(_ context.Context, tenantID string) ([]TenantMemberView, error) {
	m.lock()
	defer m.unlock()
	if _, ok := m.tenants[tenantID]; !ok {
		return nil, ErrNotFound
	}
	var out []TenantMemberView
	for _, mem := range m.members {
		if mem.TenantID != tenantID {
			continue
		}
		u, ok := m.users[mem.UserID]
		if !ok {
			continue
		}
		out = append(out, TenantMemberView{
			UserID:      mem.UserID,
			Email:       u.Email,
			DisplayName: u.DisplayName,
			Role:        mem.Role,
		})
	}
	if out == nil {
		out = []TenantMemberView{}
	}
	return out, nil
}

func (m *Memory) AddMember(_ context.Context, tenantID, userID, role string) error {
	m.lock()
	defer m.unlock()
	if _, ok := m.tenants[tenantID]; !ok {
		return ErrNotFound
	}
	if _, ok := m.users[userID]; !ok {
		return ErrNotFound
	}
	for _, mem := range m.members {
		if mem.TenantID == tenantID && mem.UserID == userID {
			return ErrConflict
		}
	}
	m.members = append(m.members, member{TenantID: tenantID, UserID: userID, Role: role, CreatedAt: time.Now().UTC()})
	return nil
}

func (m *Memory) OwnerCount(_ context.Context, tenantID string) (int, error) {
	m.lock()
	defer m.unlock()
	if _, ok := m.tenants[tenantID]; !ok {
		return 0, ErrNotFound
	}
	n := 0
	for _, mem := range m.members {
		if mem.TenantID == tenantID && mem.Role == TenantOwner {
			n++
		}
	}
	return n, nil
}

func (m *Memory) RemoveMember(_ context.Context, tenantID, userID string) error {
	m.lock()
	defer m.unlock()
	kept := make([]member, 0, len(m.members))
	found := false
	for _, mem := range m.members {
		if mem.TenantID == tenantID && mem.UserID == userID {
			found = true
			continue
		}
		kept = append(kept, mem)
	}
	if !found {
		return ErrNotFound
	}
	m.members = kept
	return nil
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

func (m *Memory) UpdateProfile(_ context.Context, userID, displayName, bio, phone string) error {
	m.lock()
	defer m.unlock()
	u, ok := m.users[userID]
	if !ok {
		return ErrNotFound
	}
	u.DisplayName = displayName
	u.Bio = bio
	u.Phone = phone
	m.users[userID] = u
	return nil
}

func (m *Memory) SetAvatarAsset(_ context.Context, userID, assetID string) (string, error) {
	m.lock()
	defer m.unlock()
	u, ok := m.users[userID]
	if !ok {
		return "", ErrNotFound
	}
	prev := u.AvatarAssetID
	u.AvatarAssetID = assetID
	m.users[userID] = u
	return prev, nil
}

func (m *Memory) SetEmail(_ context.Context, userID, email string) error {
	m.lock()
	defer m.unlock()
	u, ok := m.users[userID]
	if !ok {
		return ErrNotFound
	}
	if other, taken := m.emailIndex[email]; taken && other != userID {
		return ErrEmailTaken
	}
	delete(m.emailIndex, u.Email)
	u.Email = email
	m.users[userID] = u
	m.emailIndex[email] = userID
	return nil
}

func (m *Memory) InsertEmailChange(_ context.Context, row EmailChangeRow) error {
	m.lock()
	defer m.unlock()
	m.emailChg[row.TokenHash] = row
	m.emailChgID[row.ID] = row
	return nil
}

func (m *Memory) DeleteProfile(_ context.Context, userID, profile string) error {
	m.lock()
	defer m.unlock()
	cur := m.profiles[userID]
	out := make([]string, 0, len(cur))
	for _, p := range cur {
		if p != profile {
			out = append(out, p)
		}
	}
	m.profiles[userID] = out
	return nil
}

func (m *Memory) SearchUsers(_ context.Context, q string, limit int) ([]User, error) {
	m.lock()
	defer m.unlock()
	if limit < 1 {
		limit = 20
	}
	q = strings.ToLower(strings.TrimSpace(q))
	out := make([]User, 0, limit)
	for _, u := range m.users {
		if q != "" {
			if !strings.Contains(strings.ToLower(u.Email), q) && !strings.Contains(strings.ToLower(u.DisplayName), q) {
				continue
			}
		}
		out = append(out, u)
	}
	sort.Slice(out, func(i, j int) bool {
		if !out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].CreatedAt.After(out[j].CreatedAt)
		}
		return out[i].ID < out[j].ID
	})
	if len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *Memory) CountUsers(_ context.Context) (int, error) {
	m.lock()
	defer m.unlock()
	return len(m.users), nil
}

func (m *Memory) CountActiveProfiles(_ context.Context, profile string) (int, error) {
	m.lock()
	defer m.unlock()
	n := 0
	for uid, profs := range m.profiles {
		u, ok := m.users[uid]
		if !ok || u.Status != StatusActive {
			continue
		}
		for _, p := range profs {
			if p == profile {
				n++
				break
			}
		}
	}
	return n, nil
}

func (m *Memory) SetUserStatus(_ context.Context, userID, status string) error {
	m.lock()
	defer m.unlock()
	u, ok := m.users[userID]
	if !ok {
		return ErrNotFound
	}
	u.Status = status
	m.users[userID] = u
	return nil
}

func (m *Memory) BumpSessionEpoch(_ context.Context, userID string) error {
	m.lock()
	defer m.unlock()
	u, ok := m.users[userID]
	if !ok {
		return ErrNotFound
	}
	u.SessionEpoch++
	m.users[userID] = u
	return nil
}

func (m *Memory) SetEmailOptOut(_ context.Context, userID string, optedOut bool) error {
	m.lock()
	defer m.unlock()
	u, ok := m.users[userID]
	if !ok {
		return ErrNotFound
	}
	u.EmailOptOut = optedOut
	m.users[userID] = u
	return nil
}

func (m *Memory) ListMailRecipients(_ context.Context) ([]User, error) {
	m.lock()
	defer m.unlock()
	out := make([]User, 0, len(m.users))
	for _, u := range m.users {
		if u.Status != StatusActive || u.EmailOptOut || strings.TrimSpace(u.Email) == "" {
			continue
		}
		out = append(out, u)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out, nil
}

func (m *Memory) EmailChangeByHash(_ context.Context, hash string) (EmailChangeRow, error) {
	m.lock()
	defer m.unlock()
	row, ok := m.emailChg[hash]
	if !ok {
		return EmailChangeRow{}, ErrNotFound
	}
	return row, nil
}

func (m *Memory) MarkEmailChangeUsed(_ context.Context, id string, at time.Time) error {
	m.lock()
	defer m.unlock()
	row, ok := m.emailChgID[id]
	if !ok {
		return ErrNotFound
	}
	if row.UsedAt == nil {
		row.UsedAt = &at
	}
	m.emailChgID[id] = row
	m.emailChg[row.TokenHash] = row
	return nil
}

func (m *Memory) InvalidateUserEmailChanges(_ context.Context, userID string, at time.Time) error {
	m.lock()
	defer m.unlock()
	for hash, row := range m.emailChg {
		if row.UserID != userID || row.UsedAt != nil {
			continue
		}
		row.UsedAt = &at
		m.emailChg[hash] = row
		m.emailChgID[row.ID] = row
	}
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

func (m *Memory) UpsertOTP(_ context.Context, row OTPChallenge) error {
	m.lock()
	defer m.unlock()
	if m.otp == nil {
		m.otp = map[string]OTPChallenge{}
	}
	m.otp[row.Email] = row
	return nil
}

func (m *Memory) OTPByEmail(_ context.Context, email string) (OTPChallenge, error) {
	m.lock()
	defer m.unlock()
	row, ok := m.otp[email]
	if !ok {
		return OTPChallenge{}, ErrNotFound
	}
	return row, nil
}

func (m *Memory) IncrementOTPAttempts(_ context.Context, email string) error {
	m.lock()
	defer m.unlock()
	row, ok := m.otp[email]
	if !ok {
		return ErrNotFound
	}
	row.Attempts++
	m.otp[email] = row
	return nil
}

func (m *Memory) DeleteOTP(_ context.Context, email string) error {
	m.lock()
	defer m.unlock()
	delete(m.otp, email)
	return nil
}

func (m *Memory) UpsertIdentity(_ context.Context, row Identity) error {
	m.lock()
	defer m.unlock()
	if m.identities == nil {
		m.identities = map[string]Identity{}
	}
	m.identities[row.Provider+"/"+row.Subject] = row
	return nil
}

func (m *Memory) IdentityByProviderSubject(_ context.Context, provider, subject string) (Identity, error) {
	m.lock()
	defer m.unlock()
	row, ok := m.identities[provider+"/"+subject]
	if !ok {
		return Identity{}, ErrNotFound
	}
	return row, nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
