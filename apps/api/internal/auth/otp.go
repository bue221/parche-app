package auth

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/parche-app/backend/internal/mailer"
)

const (
	OTPTTL         = 10 * time.Minute
	OTPMaxAttempts = 5
	OTPResendAfter = 45 * time.Second
	OTPProvider    = "otp"
)

// OTPChallenge is a hashed email login code. CodeHash is never the mail value.
type OTPChallenge struct {
	Email     string
	CodeHash  string
	ExpiresAt time.Time
	Attempts  int
	CreatedAt time.Time
}

// Identity links an OAuth subject to a user (F29).
type Identity struct {
	UserID   string
	Provider string
	Subject  string
}

// OTPRequestInput is POST /v1/auth/otp/request.
type OTPRequestInput struct {
	Email string
}

// OTPVerifyInput is POST /v1/auth/otp/verify.
type OTPVerifyInput struct {
	Email     string
	Code      string
	UserAgent string
}

func (s *Service) RequestOTP(ctx context.Context, in OTPRequestInput) error {
	email := normalizeEmail(in.Email)
	if !validEmail(email) {
		return nil
	}
	now := s.now()
	if cur, err := s.Store.OTPByEmail(ctx, email); err == nil {
		if now.Sub(cur.CreatedAt) < OTPResendAfter && cur.ExpiresAt.After(now) {
			return nil
		}
	}
	code, err := s.otpCode()
	if err != nil {
		return err
	}
	row := OTPChallenge{
		Email:     email,
		CodeHash:  s.hashOTP(email, code),
		ExpiresAt: now.Add(OTPTTL),
		CreatedAt: now,
	}
	if err := s.Store.UpsertOTP(ctx, row); err != nil {
		return err
	}
	if s.Mailer == nil {
		return nil
	}
	_ = s.Mailer.Send(ctx, mailer.Message{
		To:             email,
		Template:       mailer.TemplateAuthOTP,
		Vars:           map[string]string{"code": code},
		IdempotencyKey: "otp:" + email + ":" + row.CreatedAt.UTC().Format(time.RFC3339Nano),
	})
	return nil
}

func (s *Service) VerifyOTP(ctx context.Context, in OTPVerifyInput) (Session, bool, error) {
	email := normalizeEmail(in.Email)
	code := strings.TrimSpace(in.Code)
	if !validEmail(email) || len(code) != 6 {
		return Session{}, false, ErrUnauthorized
	}
	row, err := s.Store.OTPByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return Session{}, false, ErrUnauthorized
		}
		return Session{}, false, err
	}
	now := s.now()
	if !row.ExpiresAt.After(now) || row.Attempts >= OTPMaxAttempts {
		_ = s.Store.DeleteOTP(ctx, email)
		return Session{}, false, ErrUnauthorized
	}
	if s.hashOTP(email, code) != row.CodeHash {
		_ = s.Store.IncrementOTPAttempts(ctx, email)
		return Session{}, false, ErrUnauthorized
	}
	_ = s.Store.DeleteOTP(ctx, email)
	sess, created, err := s.ensureAttendeeSession(ctx, email, "", in.UserAgent)
	return sess, created, err
}

func (s *Service) ensureAttendeeSession(ctx context.Context, email, displayName, userAgent string) (Session, bool, error) {
	user, err := s.Store.UserByEmail(ctx, email)
	if err == nil {
		if user.Status != StatusActive {
			return Session{}, false, ErrForbidden
		}
		profiles, err := s.Store.Profiles(ctx, user.ID)
		if err != nil {
			return Session{}, false, err
		}
		sess, err := s.issueSession(ctx, user, profiles, userAgent, "")
		return sess, false, err
	}
	if !errors.Is(err, ErrNotFound) {
		return Session{}, false, err
	}
	if displayName == "" {
		displayName = displayNameFromEmail(email)
	}
	uid, err := newID()
	if err != nil {
		return Session{}, false, err
	}
	now := s.now()
	acc := Account{
		User: User{
			ID:          uid,
			Email:       email,
			DisplayName: displayName,
			Status:      StatusActive,
			CreatedAt:   now,
		},
		Profiles: []string{ProfileAttendee},
	}
	if err := s.Store.CreateAccount(ctx, acc); err != nil {
		if errors.Is(err, ErrEmailTaken) {
			return s.ensureAttendeeSession(ctx, email, displayName, userAgent)
		}
		return Session{}, false, err
	}
	sess, err := s.issueSession(ctx, acc.User, acc.Profiles, userAgent, "")
	return sess, true, err
}

func (s *Service) hashOTP(email, code string) string {
	return s.Tokens.hashRefresh(email + ":" + code)
}

func (s *Service) otpCode() (string, error) {
	if s.OTPCode != nil {
		return s.OTPCode()
	}
	var n uint32
	buf := make([]byte, 4)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("otp: %w", err)
	}
	n = binary.BigEndian.Uint32(buf) % 1_000_000
	return fmt.Sprintf("%06d", n), nil
}

func displayNameFromEmail(email string) string {
	local, _, _ := strings.Cut(email, "@")
	local = strings.TrimSpace(local)
	if local == "" {
		return "Asistente"
	}
	if utf8.RuneCountInString(local) > maxDisplayName {
		local = string([]rune(local)[:maxDisplayName])
	}
	return local
}

