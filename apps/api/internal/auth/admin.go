package auth

import (
	"context"
	"errors"
	"strings"
	"unicode/utf8"

	"github.com/parche-app/backend/internal/mailer"
)

const (
	maxUserSearch = 50
	maxDigestBody = 4000
)

// AdminUser is GET /v1/admin/users (email is visible to platform_admin only).
type AdminUser struct {
	ID          string       `json:"id"`
	Email       string       `json:"email"`
	DisplayName string       `json:"display_name"`
	Status      string       `json:"status"`
	Profiles    []string     `json:"profiles"`
	Tenants     []TenantView `json:"tenants,omitempty"`
	EmailOptOut bool         `json:"email_opt_out"`
}

// AdminProfileInput is POST /v1/admin/users/{id}/profiles.
type AdminProfileInput struct {
	Profile string
	Op      string
}

// BroadcastInput is POST /v1/admin/broadcasts.
type BroadcastInput struct {
	Template string
	Audience string
	ArtistID string
	EventID  string
	Vars     map[string]string
}

// FollowerIDs loads F13 followers for broadcast audience followers_of_artist.
type FollowerIDs interface {
	FollowerUserIDs(ctx context.Context, artistID string) ([]string, error)
}

// TicketHolders loads paid/valid ticket owners for broadcast audience event_buyers.
type TicketHolders interface {
	ListTicketHolderIDs(ctx context.Context, eventID string) ([]string, error)
}

// BootstrapPlatformAdmin grants platform_admin to an existing user (BOOTSTRAP_ADMIN_EMAIL).
func (s *Service) BootstrapPlatformAdmin(ctx context.Context, email string) error {
	email = normalizeEmail(email)
	if email == "" || !validEmail(email) {
		return Invalid{Fields: []Field{{Name: "email", Issue: "invalid"}}}
	}
	u, err := s.Store.UserByEmail(ctx, email)
	if err != nil {
		return err
	}
	return s.Store.InsertProfile(ctx, u.ID, ProfilePlatformAdmin)
}

// SearchAdminUsers is GET /v1/admin/users?q=.
func (s *Service) SearchAdminUsers(ctx context.Context, actorID, q string, limit int) ([]AdminUser, error) {
	if err := s.requirePlatformAdmin(ctx, actorID); err != nil {
		return nil, err
	}
	if limit < 1 {
		limit = 20
	}
	if limit > maxUserSearch {
		limit = maxUserSearch
	}
	users, err := s.Store.SearchUsers(ctx, q, limit)
	if err != nil {
		return nil, err
	}
	out := make([]AdminUser, 0, len(users))
	for _, u := range users {
		view, err := s.adminUser(ctx, u, false)
		if err != nil {
			return nil, err
		}
		out = append(out, view)
	}
	return out, nil
}

// GetAdminUser is GET /v1/admin/users/{id}.
func (s *Service) GetAdminUser(ctx context.Context, actorID, userID string) (AdminUser, error) {
	if err := s.requirePlatformAdmin(ctx, actorID); err != nil {
		return AdminUser{}, err
	}
	u, err := s.Store.UserByID(ctx, userID)
	if err != nil {
		return AdminUser{}, err
	}
	return s.adminUser(ctx, u, true)
}

// DisableUser sets status disabled, revokes refresh, and bumps session_epoch.
func (s *Service) DisableUser(ctx context.Context, actorID, userID string) error {
	if err := s.requirePlatformAdmin(ctx, actorID); err != nil {
		return err
	}
	if _, err := s.Store.UserByID(ctx, userID); err != nil {
		return err
	}
	if err := s.guardLastActiveAdmin(ctx, userID, true); err != nil {
		return err
	}
	if err := s.Store.SetUserStatus(ctx, userID, StatusDisabled); err != nil {
		return err
	}
	if err := s.Store.BumpSessionEpoch(ctx, userID); err != nil {
		return err
	}
	return s.Store.RevokeUser(ctx, userID, s.now())
}

// EnableUser restores an account. Access JWTs stay invalid until a new login.
func (s *Service) EnableUser(ctx context.Context, actorID, userID string) error {
	if err := s.requirePlatformAdmin(ctx, actorID); err != nil {
		return err
	}
	if _, err := s.Store.UserByID(ctx, userID); err != nil {
		return err
	}
	return s.Store.SetUserStatus(ctx, userID, StatusActive)
}

// MutateAdminProfile adds or removes promoter / platform_admin. Never self-serve.
func (s *Service) MutateAdminProfile(ctx context.Context, actorID, userID string, in AdminProfileInput) error {
	if err := s.requirePlatformAdmin(ctx, actorID); err != nil {
		return err
	}
	if _, err := s.Store.UserByID(ctx, userID); err != nil {
		return err
	}
	profile := strings.TrimSpace(in.Profile)
	op := strings.TrimSpace(in.Op)
	switch profile {
	case ProfilePlatformAdmin, ProfilePromoter:
	default:
		return Invalid{Fields: []Field{{Name: "profile", Issue: "invalid"}}}
	}
	switch op {
	case "add":
		return s.Store.InsertProfile(ctx, userID, profile)
	case "remove":
		if profile == ProfilePlatformAdmin {
			if err := s.guardLastActiveAdmin(ctx, userID, false); err != nil {
				return err
			}
		}
		return s.Store.DeleteProfile(ctx, userID, profile)
	default:
		return Invalid{Fields: []Field{{Name: "op", Issue: "invalid"}}}
	}
}

// OptOutEmail marks the account unsubscribed from broadcasts and digest.
func (s *Service) OptOutEmail(ctx context.Context, userID string) error {
	if strings.TrimSpace(userID) == "" {
		return ErrUnauthorized
	}
	if _, err := s.Store.UserByID(ctx, userID); err != nil {
		return err
	}
	return s.Store.SetEmailOptOut(ctx, userID, true)
}

// OptOutEmailToken verifies the signed mail link then unsubscribes.
func (s *Service) OptOutEmailToken(ctx context.Context, token string) error {
	if s.Tokens == nil {
		return ErrUnauthorized
	}
	userID, err := s.Tokens.ParseEmailOptOut(token)
	if err != nil {
		return err
	}
	return s.OptOutEmail(ctx, userID)
}

// EmailOptOutURL is the signed unsubscribe link included in broadcasts.
func (s *Service) EmailOptOutURL(userID string) string {
	if s.Tokens == nil {
		return ""
	}
	tok, err := s.Tokens.SignEmailOptOut(userID)
	if err != nil {
		return ""
	}
	origin := strings.TrimRight(s.AppOrigin, "/")
	if origin == "" {
		origin = "http://localhost:3000"
	}
	return origin + "/v1/me/email/opt-out?token=" + tok
}

// CountUsers is GET /v1/admin/metrics users.
func (s *Service) CountUsers(ctx context.Context) (int, error) {
	return s.Store.CountUsers(ctx)
}

// Broadcast enqueues F26 mail to a Parche-only audience, skipping email_opt_out.
func (s *Service) Broadcast(ctx context.Context, actorID string, in BroadcastInput, followers FollowerIDs, holders TicketHolders) (int, error) {
	if err := s.requirePlatformAdmin(ctx, actorID); err != nil {
		return 0, err
	}
	if s.Mailer == nil {
		return 0, nil
	}
	tpl := strings.TrimSpace(in.Template)
	if tpl == "" {
		tpl = mailer.TemplateAdminDigest
	}
	if tpl != mailer.TemplateAdminDigest || !mailer.KnownTemplate(tpl) {
		return 0, Invalid{Fields: []Field{{Name: "template", Issue: "invalid"}}}
	}
	users, err := s.broadcastAudience(ctx, in, followers, holders)
	if err != nil {
		return 0, err
	}
	sent := 0
	digest := ""
	if in.Vars != nil {
		digest = in.Vars["digest_body"]
	}
	if digest == "" {
		digest = "Novedades de Parche"
	}
	if utf8.RuneCountInString(digest) > maxDigestBody {
		return 0, Invalid{Fields: []Field{{Name: "vars.digest_body", Issue: "too_long"}}}
	}
	for _, u := range users {
		vars := map[string]string{}
		for k, v := range in.Vars {
			vars[k] = v
		}
		vars["digest_body"] = digest
		vars["opt_out_url"] = s.EmailOptOutURL(u.ID)
		_ = s.Mailer.Send(ctx, mailer.Message{
			To:             u.Email,
			ToUserID:       u.ID,
			Template:       tpl,
			Vars:           vars,
			IdempotencyKey: "broadcast:" + tpl + ":" + in.Audience + ":" + u.ID + ":" + digest,
		})
		sent++
	}
	return sent, nil
}

func (s *Service) broadcastAudience(ctx context.Context, in BroadcastInput, followers FollowerIDs, holders TicketHolders) ([]User, error) {
	switch strings.TrimSpace(in.Audience) {
	case "all_attendees":
		all, err := s.Store.ListMailRecipients(ctx)
		if err != nil {
			return nil, err
		}
		out := make([]User, 0, len(all))
		for _, u := range all {
			profs, err := s.Store.Profiles(ctx, u.ID)
			if err != nil {
				return nil, err
			}
			if hasProfile(profs, ProfileAttendee) {
				out = append(out, u)
			}
		}
		return out, nil
	case "followers_of_artist":
		if followers == nil || strings.TrimSpace(in.ArtistID) == "" {
			return nil, Invalid{Fields: []Field{{Name: "artist_id", Issue: "required"}}}
		}
		ids, err := followers.FollowerUserIDs(ctx, in.ArtistID)
		if err != nil {
			return nil, err
		}
		return s.usersForMail(ctx, ids)
	case "event_buyers":
		if holders == nil || strings.TrimSpace(in.EventID) == "" {
			return nil, Invalid{Fields: []Field{{Name: "event_id", Issue: "required"}}}
		}
		ids, err := holders.ListTicketHolderIDs(ctx, in.EventID)
		if err != nil {
			return nil, err
		}
		return s.usersForMail(ctx, ids)
	default:
		return nil, Invalid{Fields: []Field{{Name: "audience", Issue: "invalid"}}}
	}
}

func (s *Service) usersForMail(ctx context.Context, ids []string) ([]User, error) {
	seen := map[string]struct{}{}
	out := make([]User, 0, len(ids))
	for _, id := range ids {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		u, err := s.Store.UserByID(ctx, id)
		if err != nil {
		if errors.Is(err, ErrNotFound) {
			continue
		}
			return nil, err
		}
		if u.Status != StatusActive || u.EmailOptOut || strings.TrimSpace(u.Email) == "" {
			continue
		}
		out = append(out, u)
	}
	return out, nil
}

func (s *Service) adminUser(ctx context.Context, u User, withTenants bool) (AdminUser, error) {
	profs, err := s.Store.Profiles(ctx, u.ID)
	if err != nil {
		return AdminUser{}, err
	}
	if profs == nil {
		profs = []string{}
	}
	view := AdminUser{
		ID: u.ID, Email: u.Email, DisplayName: u.DisplayName, Status: u.Status,
		Profiles: profs, EmailOptOut: u.EmailOptOut,
	}
	if withTenants {
		tenants, err := s.Store.TenantsForUser(ctx, u.ID)
		if err != nil {
			return AdminUser{}, err
		}
		if tenants == nil {
			tenants = []TenantView{}
		}
		view.Tenants = tenants
	}
	return view, nil
}

func (s *Service) requirePlatformAdmin(ctx context.Context, userID string) error {
	if _, err := s.requireActive(ctx, userID); err != nil {
		return err
	}
	ok, err := s.HasProfile(ctx, userID, ProfilePlatformAdmin)
	if err != nil {
		return err
	}
	if !ok {
		return ErrForbidden
	}
	return nil
}

func (s *Service) guardLastActiveAdmin(ctx context.Context, targetID string, disabling bool) error {
	profs, err := s.Store.Profiles(ctx, targetID)
	if err != nil {
		return err
	}
	if !hasProfile(profs, ProfilePlatformAdmin) {
		return nil
	}
	n, err := s.Store.CountActiveProfiles(ctx, ProfilePlatformAdmin)
	if err != nil {
		return err
	}
	if n <= 1 {
		return ErrLastAdmin
	}
	_ = disabling
	return nil
}
