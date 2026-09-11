package auth

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"
)

// Hasher hashes passwords. Argon2 implements it.
type Hasher interface {
	Hash(password string) (string, error)
}

// Service is register/login/refresh/logout and /v1/me.
type Service struct {
	Store  Store
	Tokens *Tokens
	Hasher Hasher
	Log    *slog.Logger
	dummy  string
}

// NewService prepares a dummy password hash so missing-user login takes a similar path.
func NewService(store Store, tokens *Tokens, hasher Hasher, log *slog.Logger) (*Service, error) {
	if hasher == nil {
		hasher = DefaultArgon2()
	}
	dummy, err := hasher.Hash("parche-timing-dummy")
	if err != nil {
		return nil, err
	}
	if log == nil {
		log = slog.Default()
	}
	return &Service{Store: store, Tokens: tokens, Hasher: hasher, Log: log, dummy: dummy}, nil
}

// RegisterInput is POST /v1/auth/register.
type RegisterInput struct {
	Email       string
	Password    string
	DisplayName string
	Profile     string
	UserAgent   string
}

// LoginInput is POST /v1/auth/login.
type LoginInput struct {
	Email     string
	Password  string
	UserAgent string
}

// Session is the token pair plus public user. RefreshToken is the opaque client value.
type Session struct {
	AccessToken      string
	AccessExpiresAt  time.Time
	RefreshToken     string
	RefreshExpiresAt time.Time
	RefreshFamilyID  string
	User             PublicUser
}

// PublicUser is safe to return to clients.
type PublicUser struct {
	ID          string   `json:"id"`
	Email       string   `json:"email"`
	DisplayName string   `json:"display_name"`
	Profiles    []string `json:"profiles"`
}

// Me is GET /v1/me. Memberships stay empty until F11.
type Me struct {
	PublicUser
	Tenant      *TenantView       `json:"tenant,omitempty"`
	Memberships []EventMembership `json:"memberships"`
}

// EventMembership is a summarized event role (F11).
type EventMembership struct {
	EventID string `json:"event_id"`
	Role    string `json:"role"`
	Status  string `json:"status"`
}

// SessionListItem is GET /v1/me/sessions.
type SessionListItem struct {
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UserAgent string    `json:"user_agent"`
	Current   bool      `json:"current"`
}

func (s *Service) Register(ctx context.Context, in RegisterInput) (Session, error) {
	email := normalizeEmail(in.Email)
	display := normalizeDisplayName(in.DisplayName)
	profile, ok := parseProfile(in.Profile)
	var fields []Field
	if !validEmail(email) {
		fields = append(fields, Field{Name: "email", Issue: "invalid"})
	}
	if display == "" || len([]rune(display)) > maxDisplayName {
		fields = append(fields, Field{Name: "display_name", Issue: "invalid"})
	}
	if !ok {
		fields = append(fields, Field{Name: "profile", Issue: "invalid"})
	}
	fields = append(fields, passwordIssues(in.Password)...)
	if len(fields) > 0 {
		return Session{}, Invalid{Fields: fields}
	}

	hash, err := s.Hasher.Hash(in.Password)
	if err != nil {
		return Session{}, err
	}
	uid, err := newID()
	if err != nil {
		return Session{}, err
	}
	now := s.now()
	acc := Account{
		User: User{
			ID:           uid,
			Email:        email,
			PasswordHash: hash,
			DisplayName:  display,
			Status:       StatusActive,
			CreatedAt:    now,
		},
		Profiles: []string{ProfileAttendee},
	}
	if profile == ProfilePromoter {
		acc.Profiles = []string{ProfileAttendee, ProfilePromoter}
		tid, err := newID()
		if err != nil {
			return Session{}, err
		}
		suffix := strings.ReplaceAll(tid, "-", "")
		if len(suffix) > 8 {
			suffix = suffix[:8]
		}
		acc.Tenant = &Tenant{
			ID:       tid,
			Slug:     slugify(display, suffix),
			Name:     display,
			Currency: "COP",
			Status:   StatusActive,
		}
		acc.Role = TenantOwner
	}
	if err := s.Store.CreateAccount(ctx, acc); err != nil {
		if errors.Is(err, ErrEmailTaken) {
			s.Log.Info("register conflict", "request_outcome", "email_taken")
			return Session{}, ErrEmailTaken
		}
		return Session{}, err
	}
	return s.issueSession(ctx, acc.User, acc.Profiles, in.UserAgent, "")
}

func (s *Service) Login(ctx context.Context, in LoginInput) (Session, error) {
	email := normalizeEmail(in.Email)
	if !validEmail(email) || in.Password == "" {
		s.verifyDummy(in.Password)
		return Session{}, ErrUnauthorized
	}
	user, err := s.Store.UserByEmail(ctx, email)
	if err != nil {
		s.verifyDummy(in.Password)
		if errors.Is(err, ErrNotFound) {
			return Session{}, ErrUnauthorized
		}
		return Session{}, err
	}
	if !VerifyPassword(in.Password, user.PasswordHash) {
		return Session{}, ErrUnauthorized
	}
	if user.Status != StatusActive {
		return Session{}, ErrForbidden
	}
	profiles, err := s.Store.Profiles(ctx, user.ID)
	if err != nil {
		return Session{}, err
	}
	return s.issueSession(ctx, user, profiles, in.UserAgent, "")
}

func (s *Service) Refresh(ctx context.Context, raw, userAgent string) (Session, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return Session{}, ErrUnauthorized
	}
	hash := s.Tokens.hashRefresh(raw)
	var session Session
	err := s.Store.InTx(ctx, func(st Store) error {
		row, err := st.RefreshByHash(ctx, hash)
		if err != nil {
			if errors.Is(err, ErrNotFound) {
				return ErrUnauthorized
			}
			return err
		}
		now := s.now()
		if row.ReplacedBy != nil {
			s.Log.Info("refresh_reuse", "family_id", row.FamilyID, "user_id", row.UserID)
			if err := st.RevokeFamily(ctx, row.FamilyID, now); err != nil {
				return err
			}
			return ErrUnauthorized
		}
		if row.RevokedAt != nil || !row.ExpiresAt.After(now) {
			return ErrUnauthorized
		}
		user, err := st.UserByID(ctx, row.UserID)
		if err != nil {
			return err
		}
		if user.Status != StatusActive {
			return ErrForbidden
		}
		profiles, err := st.Profiles(ctx, user.ID)
		if err != nil {
			return err
		}
		sess, err := s.issueSessionOn(ctx, st, user, profiles, userAgent, row.FamilyID)
		if err != nil {
			return err
		}
		if err := st.MarkReplaced(ctx, row.ID, sess.refreshID, now); err != nil {
			return err
		}
		session = sess.Session
		return nil
	})
	return session, err
}

func (s *Service) Logout(ctx context.Context, raw string) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	hash := s.Tokens.hashRefresh(raw)
	row, err := s.Store.RefreshByHash(ctx, hash)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil
		}
		return err
	}
	return s.Store.RevokeFamily(ctx, row.FamilyID, s.now())
}

func (s *Service) LogoutAll(ctx context.Context, userID string) error {
	return s.Store.RevokeUser(ctx, userID, s.now())
}

func (s *Service) Me(ctx context.Context, userID string) (Me, error) {
	user, err := s.requireActive(ctx, userID)
	if err != nil {
		return Me{}, err
	}
	profiles, err := s.Store.Profiles(ctx, user.ID)
	if err != nil {
		return Me{}, err
	}
	tenant, err := s.Store.TenantForUser(ctx, user.ID)
	if err != nil {
		return Me{}, err
	}
	return Me{
		PublicUser:  toPublic(user, profiles),
		Tenant:      tenant,
		Memberships: []EventMembership{},
	}, nil
}

func (s *Service) Sessions(ctx context.Context, userID, currentRaw string) ([]SessionListItem, error) {
	if _, err := s.requireActive(ctx, userID); err != nil {
		return nil, err
	}
	now := s.now()
	rows, err := s.Store.ListSessions(ctx, userID, now)
	if err != nil {
		return nil, err
	}
	currentFamily := ""
	if strings.TrimSpace(currentRaw) != "" {
		if row, err := s.Store.RefreshByHash(ctx, s.Tokens.hashRefresh(currentRaw)); err == nil {
			currentFamily = row.FamilyID
		}
	}
	out := make([]SessionListItem, 0, len(rows))
	for _, row := range rows {
		out = append(out, SessionListItem{
			ID:        row.ID,
			CreatedAt: row.CreatedAt,
			UserAgent: row.UserAgent,
			Current:   currentFamily != "" && row.ID == currentFamily,
		})
	}
	return out, nil
}

func (s *Service) UserStatus(ctx context.Context, userID string) (string, error) {
	user, err := s.Store.UserByID(ctx, userID)
	if err != nil {
		return "", err
	}
	return user.Status, nil
}

func (s *Service) requireActive(ctx context.Context, userID string) (User, error) {
	user, err := s.Store.UserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return User{}, ErrUnauthorized
		}
		return User{}, err
	}
	if user.Status != StatusActive {
		return User{}, ErrForbidden
	}
	return user, nil
}

type sessionInternal struct {
	Session
	refreshID string
}

func (s *Service) issueSession(ctx context.Context, user User, profiles []string, userAgent, familyID string) (Session, error) {
	var sess Session
	err := s.Store.InTx(ctx, func(st Store) error {
		got, err := s.issueSessionOn(ctx, st, user, profiles, userAgent, familyID)
		if err != nil {
			return err
		}
		sess = got.Session
		return nil
	})
	return sess, err
}

func (s *Service) issueSessionOn(ctx context.Context, st Store, user User, profiles []string, userAgent, familyID string) (sessionInternal, error) {
	raw, err := NewRefresh()
	if err != nil {
		return sessionInternal{}, err
	}
	rid, err := newID()
	if err != nil {
		return sessionInternal{}, err
	}
	if familyID == "" {
		familyID, err = newID()
		if err != nil {
			return sessionInternal{}, err
		}
	}
	now := s.now()
	exp := now.Add(s.Tokens.refreshTTL())
	row := RefreshRow{
		ID:        rid,
		UserID:    user.ID,
		FamilyID:  familyID,
		TokenHash: s.Tokens.hashRefresh(raw),
		ExpiresAt: exp,
		UserAgent: userAgent,
		CreatedAt: now,
	}
	if err := st.InsertRefresh(ctx, row); err != nil {
		return sessionInternal{}, err
	}
	access, accessExp, err := s.Tokens.IssueAccess(user.ID, profiles)
	if err != nil {
		return sessionInternal{}, err
	}
	return sessionInternal{
		Session: Session{
			AccessToken:      access,
			AccessExpiresAt:  accessExp,
			RefreshToken:     raw,
			RefreshExpiresAt: exp,
			RefreshFamilyID:  familyID,
			User:             toPublic(user, profiles),
		},
		refreshID: rid,
	}, nil
}

func (s *Service) now() time.Time {
	if s.Tokens != nil {
		return s.Tokens.now()
	}
	return time.Now().UTC()
}

func (s *Service) verifyDummy(password string) {
	_ = VerifyPassword(password, s.dummy)
}

func toPublic(user User, profiles []string) PublicUser {
	if profiles == nil {
		profiles = []string{}
	}
	return PublicUser{
		ID:          user.ID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		Profiles:    profiles,
	}
}
