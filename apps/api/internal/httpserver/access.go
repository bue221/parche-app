package httpserver

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
)

var (
	errUnauthorized = errors.New("unauthorized")
	errForbidden    = errors.New("forbidden")
)

// Principal is the authenticated caller, taken from the access JWT.
type Principal struct {
	UserID string
}

// Access authenticates product requests via the access JWT.
type Access interface {
	Authenticate(*http.Request) (Principal, error)
}

// peeker extracts a principal from a JWT without a user-status lookup (access logs).
type peeker interface {
	Peek(*http.Request) (Principal, error)
}

// EventWrite authorizes event media uploads. F08/F11 replace DenyEventWrite.
type EventWrite interface {
	Authorize(ctx context.Context, userID, eventID string) (tenantID string, err error)
}

// RejectAccess always fails. Tests use it when a route must stay unauthenticated.
type RejectAccess struct{}

func (RejectAccess) Authenticate(r *http.Request) (Principal, error) {
	if bearerToken(r) == "" {
		return Principal{}, errUnauthorized
	}
	return Principal{}, errUnauthorized
}

// JWTAccess verifies HS256 access tokens issued by auth.Tokens.
type JWTAccess struct {
	Tokens *auth.Tokens
	Lookup func(ctx context.Context, userID string) (auth.AccessIdentity, error)
}

func (j JWTAccess) Peek(r *http.Request) (Principal, error) {
	raw := bearerToken(r)
	if raw == "" || j.Tokens == nil {
		return Principal{}, errUnauthorized
	}
	claims, err := j.Tokens.ParseAccess(raw)
	if err != nil {
		return Principal{}, errUnauthorized
	}
	return Principal{UserID: claims.Subject}, nil
}

func (j JWTAccess) Authenticate(r *http.Request) (Principal, error) {
	raw := bearerToken(r)
	if raw == "" || j.Tokens == nil {
		return Principal{}, errUnauthorized
	}
	claims, err := j.Tokens.ParseAccess(raw)
	if err != nil {
		return Principal{}, errUnauthorized
	}
	p := Principal{UserID: claims.Subject}
	if j.Lookup == nil {
		return p, nil
	}
	ident, err := j.Lookup(r.Context(), p.UserID)
	if err != nil {
		if errors.Is(err, auth.ErrNotFound) {
			return Principal{}, errUnauthorized
		}
		return Principal{}, err
	}
	if ident.Status != auth.StatusActive {
		return Principal{}, errForbidden
	}
	if ident.Epoch != claims.Epoch {
		return Principal{}, errUnauthorized
	}
	return p, nil
}

func writeAccessError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, errForbidden), errors.Is(err, auth.ErrForbidden):
		apierr.Write(w, r, apierr.Forbidden, "", nil)
	case errors.Is(err, errUnauthorized), errors.Is(err, auth.ErrUnauthorized):
		apierr.Write(w, r, apierr.Unauthorized, "", nil)
	default:
		apierr.Write(w, r, apierr.Internal, "", nil)
	}
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
