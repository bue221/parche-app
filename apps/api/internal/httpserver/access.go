package httpserver

import (
	"context"
	"errors"
	"net/http"
	"strings"
)

var (
	errUnauthorized = errors.New("unauthorized")
	errForbidden    = errors.New("forbidden")
)

// Principal is the authenticated caller. F04 fills this from the access JWT.
type Principal struct {
	UserID string
}

// Access authenticates product requests. F04 replaces RejectAccess with JWT verification.
type Access interface {
	Authenticate(*http.Request) (Principal, error)
}

// EventWrite authorizes event media uploads. F08/F11 replace DenyEventWrite.
type EventWrite interface {
	Authorize(ctx context.Context, userID, eventID string) (tenantID string, err error)
}

// RejectAccess requires a Bearer token and still rejects it until F04 can verify JWTs.
type RejectAccess struct{}

func (RejectAccess) Authenticate(r *http.Request) (Principal, error) {
	if bearerToken(r) == "" {
		return Principal{}, errUnauthorized
	}
	return Principal{}, errUnauthorized
}

// DenyEventWrite forbids event-scoped uploads until membership (F11) exists.
type DenyEventWrite struct{}

func (DenyEventWrite) Authorize(context.Context, string, string) (string, error) {
	return "", errForbidden
}

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return ""
	}
	return strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
}

// StaticAccess is for tests: any Bearer token maps to UserID.
type StaticAccess struct {
	UserID string
}

func (s StaticAccess) Authenticate(r *http.Request) (Principal, error) {
	if bearerToken(r) == "" {
		return Principal{}, errUnauthorized
	}
	return Principal{UserID: s.UserID}, nil
}

// StaticEventWrite is for tests: any event_id maps to TenantID.
type StaticEventWrite struct {
	TenantID string
}

func (s StaticEventWrite) Authorize(_ context.Context, _, _ string) (string, error) {
	if s.TenantID == "" {
		return "", errForbidden
	}
	return s.TenantID, nil
}
