package apierr

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestStatusMapping(t *testing.T) {
	cases := map[string]int{
		Validation:   http.StatusBadRequest,
		Unauthorized: http.StatusUnauthorized,
		Forbidden:    http.StatusForbidden,
		NotFound:     http.StatusNotFound,
		Conflict:     http.StatusConflict,
		Gone:         http.StatusGone,
		RateLimited:  http.StatusTooManyRequests,
		NotReady:     http.StatusServiceUnavailable,
		Internal:     http.StatusInternalServerError,
	}
	for code, want := range cases {
		if got := Status(code); got != want {
			t.Errorf("%s: status %d want %d", code, got, want)
		}
	}
}

func TestWrite401403404Envelope(t *testing.T) {
	cases := []struct {
		code string
		http int
	}{
		{Unauthorized, http.StatusUnauthorized},
		{Forbidden, http.StatusForbidden},
		{NotFound, http.StatusNotFound},
	}
	for _, tc := range cases {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/v1/x", nil)
		req.Header.Set("X-Request-Id", "req-auth")
		Write(rr, req, tc.code, DefaultMessage(tc.code), []Detail{{Field: "secret", Issue: "leak"}})
		if rr.Code != tc.http {
			t.Fatalf("%s status=%d", tc.code, rr.Code)
		}
		if ct := rr.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
			t.Fatalf("content-type=%q", ct)
		}
		var body Body
		if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		if body.Code != tc.code || body.RequestID != "req-auth" || body.Message == "" {
			t.Fatalf("body=%+v", body)
		}
		if body.Details != nil {
			t.Fatalf("%s must omit details, got %+v", tc.code, body.Details)
		}
	}
}

func TestWriteValidationIncludesDetails(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/events", nil)
	Write(rr, req, Validation, "La fecha de fin debe ser posterior al inicio", []Detail{
		{Field: "ends_at", Issue: "order"},
	})
	var body Body
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Code != Validation || len(body.Details) != 1 || body.Details[0].Field != "ends_at" {
		t.Fatalf("body=%+v", body)
	}
}

func TestWriteInternalHasNoStack(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/x", nil)
	Write(rr, req, Internal, "SELECT * FROM users panic:\nstack", nil)
	raw := rr.Body.String()
	if strings.Contains(raw, "SELECT") || strings.Contains(strings.ToLower(raw), "panic") {
		t.Fatalf("leaked internals: %s", raw)
	}
	var body Body
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Message != DefaultMessage(Internal) && strings.Contains(body.Message, "SELECT") {
		t.Fatal("internal message must stay generic")
	}
}

func TestWriteRateLimitedRetryAfter(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", nil)
	WriteRateLimited(rr, req, 15*time.Minute)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("status=%d", rr.Code)
	}
	if rr.Header().Get("Retry-After") != "900" {
		t.Fatalf("Retry-After=%q", rr.Header().Get("Retry-After"))
	}
	var body Body
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Code != RateLimited {
		t.Fatalf("code=%q", body.Code)
	}
}

func TestWriteInternalAlwaysGenericMessage(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/x", nil)
	Write(rr, req, Internal, DefaultMessage(Internal), nil)
	var body Body
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Message != "Error interno" {
		t.Fatalf("message=%q", body.Message)
	}
}
