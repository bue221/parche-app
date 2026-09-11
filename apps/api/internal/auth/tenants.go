package auth

import (
	"context"
	"errors"
	"strings"
	"unicode"
)

const maxTenantName = 80

// CreateTenantInput is POST /v1/tenants.
type CreateTenantInput struct {
	Name string
}

// PatchTenantInput is PATCH /v1/tenants/{id}. Nil fields stay unchanged.
type PatchTenantInput struct {
	Name     *string
	Currency *string
}

// AddMemberInput is POST /v1/tenants/{id}/members. Exactly one of UserID or Email.
type AddMemberInput struct {
	UserID string
	Email  string
}

// AddArtistProfile is POST /v1/me/profiles/artist. Idempotent; does not create F12 artists.
func (s *Service) AddArtistProfile(ctx context.Context, userID string) error {
	if _, err := s.requireActive(ctx, userID); err != nil {
		return err
	}
	return s.Store.InsertProfile(ctx, userID, ProfileArtist)
}

// SelfAssignProfile is the self-serve profile gate. platform_admin is F27-only.
func (s *Service) SelfAssignProfile(ctx context.Context, userID, profile string) error {
	switch profile {
	case ProfileArtist:
		return s.AddArtistProfile(ctx, userID)
	case ProfilePlatformAdmin:
		return ErrForbidden
	default:
		return Invalid{Fields: []Field{{Name: "profile", Issue: "invalid"}}}
	}
}

// HasProfile reports whether the user currently has a platform profile (DB, not JWT).
func (s *Service) HasProfile(ctx context.Context, userID, profile string) (bool, error) {
	profiles, err := s.Store.Profiles(ctx, userID)
	if err != nil {
		return false, err
	}
	return hasProfile(profiles, profile), nil
}

// CanCreateEvents is true when the user belongs to at least one tenant (owner or staff).
// Attendees and artist-only accounts cannot create events (F08).
func (s *Service) CanCreateEvents(ctx context.Context, userID string) (bool, error) {
	tenants, err := s.Store.TenantsForUser(ctx, userID)
	if err != nil {
		return false, err
	}
	return len(tenants) > 0, nil
}

func (s *Service) CreateTenant(ctx context.Context, userID string, in CreateTenantInput) (Tenant, error) {
	if _, err := s.requireActive(ctx, userID); err != nil {
		return Tenant{}, err
	}
	ok, err := s.HasProfile(ctx, userID, ProfilePromoter)
	if err != nil {
		return Tenant{}, err
	}
	if !ok {
		return Tenant{}, ErrForbidden
	}
	name := normalizeDisplayName(in.Name)
	if name == "" || len([]rune(name)) > maxTenantName {
		return Tenant{}, Invalid{Fields: []Field{{Name: "name", Issue: "invalid"}}}
	}
	t, err := newTenant(name)
	if err != nil {
		return Tenant{}, err
	}
	if err := s.Store.CreateTenant(ctx, t, userID); err != nil {
		return Tenant{}, err
	}
	return t, nil
}

func (s *Service) GetTenant(ctx context.Context, userID, tenantID string) (Tenant, error) {
	if _, err := s.requireActive(ctx, userID); err != nil {
		return Tenant{}, err
	}
	if _, err := s.requireMember(ctx, tenantID, userID); err != nil {
		return Tenant{}, err
	}
	return s.Store.TenantByID(ctx, tenantID)
}

func (s *Service) PatchTenant(ctx context.Context, userID, tenantID string, in PatchTenantInput) (Tenant, error) {
	if _, err := s.requireActive(ctx, userID); err != nil {
		return Tenant{}, err
	}
	if _, err := s.requireOwner(ctx, tenantID, userID); err != nil {
		return Tenant{}, err
	}
	cur, err := s.Store.TenantByID(ctx, tenantID)
	if err != nil {
		return Tenant{}, err
	}
	name := cur.Name
	currency := cur.Currency
	var fields []Field
	if in.Name != nil {
		name = normalizeDisplayName(*in.Name)
		if name == "" || len([]rune(name)) > maxTenantName {
			fields = append(fields, Field{Name: "name", Issue: "invalid"})
		}
	}
	if in.Currency != nil {
		currency = strings.ToUpper(strings.TrimSpace(*in.Currency))
		if !validCurrency(currency) {
			fields = append(fields, Field{Name: "currency", Issue: "invalid"})
		}
	}
	if in.Name == nil && in.Currency == nil {
		fields = append(fields, Field{Name: "body", Issue: "empty"})
	}
	if len(fields) > 0 {
		return Tenant{}, Invalid{Fields: fields}
	}
	if err := s.Store.UpdateTenant(ctx, tenantID, name, currency); err != nil {
		return Tenant{}, err
	}
	cur.Name = name
	cur.Currency = currency
	return cur, nil
}

func (s *Service) ListMembers(ctx context.Context, userID, tenantID string) ([]TenantMemberView, error) {
	if _, err := s.requireActive(ctx, userID); err != nil {
		return nil, err
	}
	if _, err := s.requireOwner(ctx, tenantID, userID); err != nil {
		return nil, err
	}
	members, err := s.Store.ListMembers(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if members == nil {
		members = []TenantMemberView{}
	}
	return members, nil
}

func (s *Service) AddMember(ctx context.Context, userID, tenantID string, in AddMemberInput) (TenantMemberView, error) {
	if _, err := s.requireActive(ctx, userID); err != nil {
		return TenantMemberView{}, err
	}
	if _, err := s.requireOwner(ctx, tenantID, userID); err != nil {
		return TenantMemberView{}, err
	}
	uid := strings.TrimSpace(in.UserID)
	email := normalizeEmail(in.Email)
	if (uid == "") == (email == "") {
		return TenantMemberView{}, Invalid{Fields: []Field{{Name: "body", Issue: "user_or_email"}}}
	}
	var target User
	var err error
	if uid != "" {
		target, err = s.Store.UserByID(ctx, uid)
	} else {
		if !validEmail(email) {
			return TenantMemberView{}, Invalid{Fields: []Field{{Name: "email", Issue: "invalid"}}}
		}
		target, err = s.Store.UserByEmail(ctx, email)
	}
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return TenantMemberView{}, ErrNotFound
		}
		return TenantMemberView{}, err
	}
	if err := s.Store.AddMember(ctx, tenantID, target.ID, TenantStaff); err != nil {
		return TenantMemberView{}, err
	}
	return TenantMemberView{
		UserID:      target.ID,
		Email:       target.Email,
		DisplayName: target.DisplayName,
		Role:        TenantStaff,
	}, nil
}

func (s *Service) RemoveMember(ctx context.Context, actorID, tenantID, targetID string) error {
	if _, err := s.requireActive(ctx, actorID); err != nil {
		return err
	}
	if _, err := s.requireOwner(ctx, tenantID, actorID); err != nil {
		return err
	}
	role, err := s.Store.Membership(ctx, tenantID, targetID)
	if err != nil {
		return err
	}
	if role == TenantOwner {
		n, err := s.Store.OwnerCount(ctx, tenantID)
		if err != nil {
			return err
		}
		if n <= 1 {
			return ErrLastOwner
		}
	}
	return s.Store.RemoveMember(ctx, tenantID, targetID)
}

func (s *Service) requireMember(ctx context.Context, tenantID, userID string) (string, error) {
	if _, err := s.Store.TenantByID(ctx, tenantID); err != nil {
		return "", ErrNotFound
	}
	role, err := s.Store.Membership(ctx, tenantID, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return "", ErrNotFound
		}
		return "", err
	}
	return role, nil
}

func (s *Service) requireOwner(ctx context.Context, tenantID, userID string) (string, error) {
	role, err := s.requireMember(ctx, tenantID, userID)
	if err != nil {
		return "", err
	}
	if role != TenantOwner {
		return "", ErrForbidden
	}
	return role, nil
}

func newTenant(name string) (Tenant, error) {
	tid, err := newID()
	if err != nil {
		return Tenant{}, err
	}
	suffix := strings.ReplaceAll(tid, "-", "")
	if len(suffix) > 8 {
		suffix = suffix[:8]
	}
	return Tenant{
		ID:       tid,
		Slug:     slugify(name, suffix),
		Name:     name,
		Currency: DefaultTenantCurrency,
		Status:   StatusActive,
	}, nil
}

func hasProfile(profiles []string, want string) bool {
	for _, p := range profiles {
		if p == want {
			return true
		}
	}
	return false
}

func validCurrency(c string) bool {
	if len(c) != 3 {
		return false
	}
	for _, r := range c {
		if r < 'A' || r > 'Z' || !unicode.IsLetter(r) {
			return false
		}
	}
	return true
}
