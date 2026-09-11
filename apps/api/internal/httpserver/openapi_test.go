package httpserver

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestOpenAPIContractFile(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("caller")
	}
	path := filepath.Join(filepath.Dir(file), "..", "..", "openapi.yaml")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	doc := string(raw)
	for _, needle := range []string{
		"openapi: 3",
		"/health",
		"/ready",
		"/v1/auth/login",
		"/v1/auth/register",
		"/v1/auth/refresh",
		"/v1/auth/logout",
		"/v1/auth/password/forgot",
		"/v1/auth/password/reset",
		"/v1/me",
		"/v1/me/avatar",
		"/v1/me/email/change",
		"/v1/me/email/confirm",
		"/v1/users/{id}",
		"/v1/me/profiles/artist",
		"/v1/me/sessions",
		"/v1/tenants",
		"/v1/venues",
		"/v1/events/{id}/assets",
		"/v1/events/{id}/audio",
		"/v1/events/{id}/tracks",
		"/v1/events/{id}/tracks/{trackId}/master",
		"/v1/events/{id}/submit",
		"/v1/events/{id}/cancel",
		"/v1/events/{id}/members",
		"/v1/events/{id}/artists",
		"/v1/events/{id}/ticket-types",
		"/v1/artists/{id}",
		"/v1/artists/{id}/events",
		"/v1/artists/{id}/assets",
		"/v1/artists/{id}/follow",
		"/v1/me/following",
		"/v1/events/{id}/transfer-ownership",
		"/v1/invites/{token}/accept",
		"/v1/me/memberships",
		"min_lat",
		"geojson",
		"user_pin",
		"/v1/uploads",
		"/v1/events/{eventId}/check-in",
		"VALIDATION_ERROR",
		"UNAUTHORIZED",
		"FORBIDDEN",
		"NOT_FOUND",
		"GONE",
		"RATE_LIMITED",
		"Retry-After",
		"X-Request-Id",
	} {
		if !strings.Contains(doc, needle) {
			t.Errorf("openapi.yaml missing %q", needle)
		}
	}
}
