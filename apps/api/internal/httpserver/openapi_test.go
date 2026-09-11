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
		"/v1/me",
		"/v1/me/sessions",
		"/v1/uploads",
		"/v1/events/{eventId}/check-in",
		"VALIDATION_ERROR",
		"UNAUTHORIZED",
		"FORBIDDEN",
		"NOT_FOUND",
		"RATE_LIMITED",
		"Retry-After",
		"X-Request-Id",
	} {
		if !strings.Contains(doc, needle) {
			t.Errorf("openapi.yaml missing %q", needle)
		}
	}
}
