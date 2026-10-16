package events

import (
	"context"
	"errors"
	"net/mail"
	"net/url"
	"strings"
	"time"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/mailer"
)

const InviteTTL = 7 * 24 * time.Hour

var aclCacheTTL = 5 * time.Minute

// ListMembers is GET /v1/events/{id}/members. Door and metrics are forbidden.
func (s *Service) ListMembers(ctx context.Context, userID, eventID string) ([]MemberView, error) {
	if _, err := s.requirePerm(ctx, userID, eventID, PermMembersManage); err != nil {
		return nil, err
	}
	rows, err := s.Store.ListMembers(ctx, eventID)
	if err != nil {
		return nil, err
	}
	out := make([]MemberView, 0, len(rows))
	for _, m := range rows {
		out = append(out, MemberView{
			UserID:      m.UserID,
			DisplayName: s.displayName(ctx, m.UserID),
			Role:        m.Role,
			Status:      m.Status,
		})
	}
	return out, nil
}

// InviteMember is POST /v1/events/{id}/members. Always pending + email (F26 stub).
func (s *Service) InviteMember(ctx context.Context, actorID, eventID string, in InviteInput) (InviteCreated, error) {
	if _, err := s.requirePerm(ctx, actorID, eventID, PermMembersManage); err != nil {
		return InviteCreated{}, err
	}
	role := strings.TrimSpace(in.Role)
	if role == RoleOwner || !inviteableRole(role) {
		return InviteCreated{}, auth.Invalid{Fields: []auth.Field{{Name: "role", Issue: "invalid"}}}
	}
	uid := strings.TrimSpace(in.UserID)
	email := normalizeInviteEmail(in.Email)
	if (uid == "") == (email == "") {
		return InviteCreated{}, auth.Invalid{Fields: []auth.Field{{Name: "body", Issue: "user_or_email"}}}
	}
	invitedUserID := ""
	if uid != "" {
		u, err := s.userByID(ctx, uid)
		if err != nil {
			return InviteCreated{}, err
		}
		invitedUserID = u.ID
		email = u.Email
	} else {
		if !validInviteEmail(email) {
			return InviteCreated{}, auth.Invalid{Fields: []auth.Field{{Name: "email", Issue: "invalid"}}}
		}
		if u, err := s.userByEmail(ctx, email); err == nil {
			invitedUserID = u.ID
		} else if !errors.Is(err, auth.ErrNotFound) {
			return InviteCreated{}, err
		}
	}
	if invitedUserID != "" {
		if m, err := s.Store.Member(ctx, eventID, invitedUserID); err == nil && m.Status == MemberActive {
			return InviteCreated{}, auth.ErrConflict
		} else if err != nil && !errors.Is(err, auth.ErrNotFound) {
			return InviteCreated{}, err
		}
	}
	if _, err := s.Store.PendingInvite(ctx, eventID, email); err == nil {
		return InviteCreated{}, auth.ErrConflict
	} else if err != nil && !errors.Is(err, auth.ErrNotFound) {
		return InviteCreated{}, err
	}
	raw, err := auth.NewRefresh()
	if err != nil {
		return InviteCreated{}, err
	}
	id, err := newID()
	if err != nil {
		return InviteCreated{}, err
	}
	now := s.now()
	inv := Invite{
		ID:            id,
		EventID:       eventID,
		Email:         email,
		InvitedUserID: invitedUserID,
		Role:          role,
		TokenHash:     s.hashToken(raw),
		ExpiresAt:     now.Add(InviteTTL),
		InvitedBy:     actorID,
	}
	if err := s.Store.CreateInvite(ctx, inv); err != nil {
		if errors.Is(err, auth.ErrConflict) {
			return InviteCreated{}, auth.ErrConflict
		}
		return InviteCreated{}, err
	}
	s.sendInviteMail(ctx, inv, raw)
	return InviteCreated{ID: id, ExpiresAt: inv.ExpiresAt}, nil
}

// AcceptInvite is POST /v1/invites/{token}/accept.
func (s *Service) AcceptInvite(ctx context.Context, userID, token string) error {
	token = strings.TrimSpace(token)
	if token == "" {
		return auth.ErrGone
	}
	u, err := s.userByID(ctx, userID)
	if err != nil {
		return err
	}
	inv, err := s.Store.InviteByTokenHash(ctx, s.hashToken(token))
	if err != nil {
		if errors.Is(err, auth.ErrNotFound) {
			return auth.ErrGone
		}
		return err
	}
	now := s.now()
	if inv.AcceptedAt != nil || !inv.ExpiresAt.After(now) {
		return auth.ErrGone
	}
	emailOK := strings.EqualFold(u.Email, inv.Email)
	userOK := inv.InvitedUserID != "" && inv.InvitedUserID == u.ID
	if !emailOK && !userOK {
		return auth.ErrForbidden
	}
	if err := s.Store.AcceptInvite(ctx, inv.ID, Member{
		EventID: inv.EventID,
		UserID:  u.ID,
		Role:    inv.Role,
		Status:  MemberActive,
	}, now); err != nil {
		return err
	}
	s.invalidateACL(ctx, inv.EventID)
	return nil
}

// PatchMember is PATCH /v1/events/{id}/members/{userId}.
func (s *Service) PatchMember(ctx context.Context, actorID, eventID, targetID, role string) (MemberView, error) {
	if _, err := s.requirePerm(ctx, actorID, eventID, PermMembersManage); err != nil {
		return MemberView{}, err
	}
	role = strings.TrimSpace(role)
	if !inviteableRole(role) {
		return MemberView{}, auth.Invalid{Fields: []auth.Field{{Name: "role", Issue: "invalid"}}}
	}
	target, err := s.Store.Member(ctx, eventID, targetID)
	if err != nil {
		return MemberView{}, err
	}
	if target.Status != MemberActive {
		return MemberView{}, auth.ErrNotFound
	}
	actorRole, err := s.memberRole(ctx, eventID, actorID)
	if err != nil {
		return MemberView{}, err
	}
	if target.Role == RoleOwner {
		if actorRole != RoleOwner {
			return MemberView{}, auth.ErrForbidden
		}
		n, err := s.Store.ActiveOwnerCount(ctx, eventID)
		if err != nil {
			return MemberView{}, err
		}
		if n <= 1 {
			return MemberView{}, auth.ErrConflict
		}
	}
	target.Role = role
	if err := s.Store.UpsertMember(ctx, target); err != nil {
		return MemberView{}, err
	}
	s.invalidateACL(ctx, eventID)
	return MemberView{
		UserID:      target.UserID,
		DisplayName: s.displayName(ctx, target.UserID),
		Role:        target.Role,
		Status:      target.Status,
	}, nil
}

// RevokeMember is DELETE /v1/events/{id}/members/{userId}. Keeps the row.
func (s *Service) RevokeMember(ctx context.Context, actorID, eventID, targetID string) error {
	if _, err := s.requirePerm(ctx, actorID, eventID, PermMembersManage); err != nil {
		return err
	}
	target, err := s.Store.Member(ctx, eventID, targetID)
	if err != nil {
		return err
	}
	if target.Status == MemberRevoked {
		return nil
	}
	actorRole, err := s.memberRole(ctx, eventID, actorID)
	if err != nil {
		return err
	}
	if target.Role == RoleOwner {
		if actorRole != RoleOwner {
			return auth.ErrForbidden
		}
		n, err := s.Store.ActiveOwnerCount(ctx, eventID)
		if err != nil {
			return err
		}
		if n <= 1 {
			return auth.ErrConflict
		}
	}
	target.Status = MemberRevoked
	if err := s.Store.UpsertMember(ctx, target); err != nil {
		return err
	}
	s.invalidateACL(ctx, eventID)
	return nil
}

// TransferOwnership is POST /v1/events/{id}/transfer-ownership. Caller becomes manager.
func (s *Service) TransferOwnership(ctx context.Context, actorID, eventID, targetID string) error {
	e, err := s.Store.ByID(ctx, eventID)
	if err != nil {
		return err
	}
	actorRole, err := s.memberRole(ctx, eventID, actorID)
	if err != nil {
		if e.Status == StatusPublished || e.Status == StatusCancelled {
			return auth.ErrForbidden
		}
		return auth.ErrNotFound
	}
	if actorRole != RoleOwner {
		return auth.ErrForbidden
	}
	targetID = strings.TrimSpace(targetID)
	if targetID == "" {
		return auth.Invalid{Fields: []auth.Field{{Name: "user_id", Issue: "required"}}}
	}
	if targetID == actorID {
		return auth.ErrConflict
	}
	target, err := s.Store.Member(ctx, eventID, targetID)
	if err != nil {
		return err
	}
	if target.Status != MemberActive {
		return auth.ErrConflict
	}
	target.Role = RoleOwner
	if err := s.Store.UpsertMember(ctx, target); err != nil {
		return err
	}
	if err := s.Store.UpsertMember(ctx, Member{
		EventID: eventID,
		UserID:  actorID,
		Role:    RoleManager,
		Status:  MemberActive,
	}); err != nil {
		return err
	}
	s.invalidateACL(ctx, eventID)
	return nil
}

// ListEventMemberships is GET /v1/me and GET /v1/me/memberships (active only).
func (s *Service) ListEventMemberships(ctx context.Context, userID string) ([]auth.EventMembership, error) {
	rows, err := s.Store.ListActiveByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]auth.EventMembership, 0, len(rows))
	for _, m := range rows {
		out = append(out, auth.EventMembership{
			EventID: m.EventID,
			Role:    m.Role,
			Status:  m.Status,
		})
	}
	return out, nil
}

func (s *Service) sendInviteMail(ctx context.Context, inv Invite, rawToken string) {
	if s.Mailer == nil {
		return
	}
	origin := strings.TrimRight(s.AppOrigin, "/")
	if origin == "" {
		origin = "http://localhost:3000"
	}
	inviteURL := origin + "/invite?token=" + url.QueryEscape(rawToken)
	toUser := inv.InvitedUserID
	if err := s.Mailer.Send(ctx, mailer.Message{
		To:             inv.Email,
		ToUserID:       toUser,
		Template:       mailer.TemplateEventInvite,
		Vars:           map[string]string{"invite_url": inviteURL},
		IdempotencyKey: inv.ID,
	}); err != nil {
		// Mail is best-effort until F26; the invite row is already persisted.
		_ = err
	}
}

func (s *Service) hashToken(raw string) string {
	return auth.HashRefresh(s.Pepper, raw)
}

func (s *Service) displayName(ctx context.Context, userID string) string {
	u, err := s.userByID(ctx, userID)
	if err != nil {
		return ""
	}
	return u.DisplayName
}

func (s *Service) userByID(ctx context.Context, id string) (auth.User, error) {
	if s.Tenancy == nil {
		return auth.User{}, auth.ErrNotFound
	}
	u, err := s.Tenancy.UserByID(ctx, id)
	if err != nil {
		if errors.Is(err, auth.ErrNotFound) {
			return auth.User{}, auth.ErrNotFound
		}
		return auth.User{}, err
	}
	return u, nil
}

func (s *Service) userByEmail(ctx context.Context, email string) (auth.User, error) {
	if s.Tenancy == nil {
		return auth.User{}, auth.ErrNotFound
	}
	return s.Tenancy.UserByEmail(ctx, email)
}

func normalizeInviteEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func validInviteEmail(email string) bool {
	if email == "" || len(email) > 254 {
		return false
	}
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email {
		return false
	}
	return strings.Contains(email, ".")
}
