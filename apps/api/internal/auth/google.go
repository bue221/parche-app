package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

const googleProvider = "google"

// GoogleIdentity is a verified Google ID token (F29).
type GoogleIdentity struct {
	Subject       string
	Email         string
	EmailVerified bool
	Audience      string
}

// GoogleVerifier checks a Google ID token. Tests inject a fake.
type GoogleVerifier interface {
	Verify(ctx context.Context, raw string) (GoogleIdentity, error)
}

// HTTPGoogleVerifier uses Google's tokeninfo endpoint.
type HTTPGoogleVerifier struct {
	Client *http.Client
}

type tokenInfoBody struct {
	Iss           string `json:"iss"`
	Sub           string `json:"sub"`
	Aud           string `json:"aud"`
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
}

func (v HTTPGoogleVerifier) Verify(ctx context.Context, raw string) (GoogleIdentity, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return GoogleIdentity{}, ErrUnauthorized
	}
	client := v.Client
	if client == nil {
		client = http.DefaultClient
	}
	endpoint := "https://oauth2.googleapis.com/tokeninfo?id_token=" + url.QueryEscape(raw)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return GoogleIdentity{}, err
	}
	res, err := client.Do(req)
	if err != nil {
		return GoogleIdentity{}, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return GoogleIdentity{}, err
	}
	if res.StatusCode != http.StatusOK {
		return GoogleIdentity{}, ErrUnauthorized
	}
	var info tokenInfoBody
	if err := json.Unmarshal(body, &info); err != nil {
		return GoogleIdentity{}, ErrUnauthorized
	}
	iss := strings.TrimSpace(info.Iss)
	if iss != "accounts.google.com" && iss != "https://accounts.google.com" {
		return GoogleIdentity{}, ErrUnauthorized
	}
	verified := info.EmailVerified == "true" || info.EmailVerified == "1"
	if !verified || !validEmail(normalizeEmail(info.Email)) || strings.TrimSpace(info.Sub) == "" {
		return GoogleIdentity{}, ErrUnauthorized
	}
	return GoogleIdentity{
		Subject:       info.Sub,
		Email:         normalizeEmail(info.Email),
		EmailVerified: true,
		Audience:      info.Aud,
	}, nil
}

// OAuthInput is POST /v1/auth/oauth.
type OAuthInput struct {
	Provider  string
	IDToken   string
	UserAgent string
}

func (s *Service) OAuth(ctx context.Context, in OAuthInput) (Session, bool, error) {
	if strings.TrimSpace(strings.ToLower(in.Provider)) != googleProvider {
		return Session{}, false, Invalid{Fields: []Field{{Name: "provider", Issue: "invalid"}}}
	}
	if s.Google == nil || len(s.GoogleAudiences) == 0 {
		return Session{}, false, Invalid{Fields: []Field{{Name: "id_token", Issue: "invalid"}}}
	}
	ident, err := s.Google.Verify(ctx, in.IDToken)
	if err != nil {
		return Session{}, false, ErrUnauthorized
	}
	if !audienceOK(ident.Audience, s.GoogleAudiences) {
		return Session{}, false, ErrUnauthorized
	}
	if existing, err := s.Store.IdentityByProviderSubject(ctx, googleProvider, ident.Subject); err == nil {
		user, err := s.Store.UserByID(ctx, existing.UserID)
		if err != nil {
			return Session{}, false, err
		}
		if user.Status != StatusActive {
			return Session{}, false, ErrForbidden
		}
		profiles, err := s.Store.Profiles(ctx, user.ID)
		if err != nil {
			return Session{}, false, err
		}
		sess, err := s.issueSession(ctx, user, profiles, in.UserAgent, "")
		return sess, false, err
	} else if !errors.Is(err, ErrNotFound) {
		return Session{}, false, err
	}
	sess, created, err := s.ensureAttendeeSession(ctx, ident.Email, "", in.UserAgent)
	if err != nil {
		return Session{}, false, err
	}
	if err := s.Store.UpsertIdentity(ctx, Identity{
		UserID:   sess.User.ID,
		Provider: googleProvider,
		Subject:  ident.Subject,
	}); err != nil {
		return Session{}, false, err
	}
	return sess, created, nil
}

func audienceOK(got string, allowed []string) bool {
	got = strings.TrimSpace(got)
	for _, a := range allowed {
		if strings.TrimSpace(a) != "" && a == got {
			return true
		}
	}
	return false
}

func (HTTPGoogleVerifier) String() string {
	return fmt.Sprint("google-tokeninfo")
}
