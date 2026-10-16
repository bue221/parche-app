package httpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/config"
	"github.com/parche-app/backend/internal/health"
	"github.com/parche-app/backend/internal/ratelimit"
)

type pingOK struct{ name string }

func (p pingOK) Name() string               { return p.name }
func (p pingOK) Ping(context.Context) error { return nil }

type pingFail struct{ name string }

func (p pingFail) Name() string               { return p.name }
func (p pingFail) Ping(context.Context) error { return health.ErrNotReady }

func testLogger() *slog.Logger {
	return slog.New(slog.NewJSONHandler(io.Discard, nil))
}

func testMux(t *testing.T, extra func(*http.ServeMux)) http.Handler {
	t.Helper()
	cfg := config.Config{CORSOrigins: []string{"http://localhost:3000", "*"}}
	return newMux(testLogger(), cfg, ratelimit.NewMemory(), []health.Checker{
		pingOK{name: "postgres"}, pingOK{name: "redis"}, pingOK{name: "object_store"},
	}, extra, Routes{})
}

func TestMuxHealthAndReady(t *testing.T) {
	mux := testMux(t, nil)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/health", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("health status=%d", rr.Code)
	}
	if rr.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatal("expected nosniff")
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/ready", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("ready status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestMuxReadyFailsClosed(t *testing.T) {
	cfg := config.Config{}
	mux := newMux(testLogger(), cfg, nil, []health.Checker{pingOK{name: "postgres"}, pingFail{name: "redis"}}, nil, Routes{})

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/health", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("health must stay 200 when deps fail, got %d", rr.Code)
	}

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	req.Header.Set("X-Request-Id", "req-ready")
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("status=%d", rr.Code)
	}
	var body apierr.Body
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Code != apierr.NotReady {
		t.Fatalf("code=%q", body.Code)
	}
	if body.RequestID != "req-ready" {
		t.Fatalf("request_id=%q", body.RequestID)
	}
}

func TestUnknownV1UsesEnvelope(t *testing.T) {
	mux := testMux(t, nil)
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/does-not-exist", nil)
	req.Header.Set("X-Request-Id", "rid-404")
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("status=%d", rr.Code)
	}
	var body apierr.Body
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Code != apierr.NotFound || body.RequestID != "rid-404" {
		t.Fatalf("body=%+v", body)
	}
	if ct := rr.Header().Get("Content-Type"); !strings.Contains(ct, "application/json") {
		t.Fatalf("content-type=%q", ct)
	}
}

func TestV1AuthStatusCodes(t *testing.T) {
	mux := testMux(t, func(mux *http.ServeMux) {
		mux.HandleFunc("GET /v1/contract/unauthorized", func(w http.ResponseWriter, r *http.Request) {
			apierr.Write(w, r, apierr.Unauthorized, "", nil)
		})
		mux.HandleFunc("GET /v1/contract/forbidden", func(w http.ResponseWriter, r *http.Request) {
			apierr.Write(w, r, apierr.Forbidden, "", nil)
		})
	})
	cases := []struct {
		path string
		code string
		http int
	}{
		{"/v1/contract/unauthorized", apierr.Unauthorized, http.StatusUnauthorized},
		{"/v1/contract/forbidden", apierr.Forbidden, http.StatusForbidden},
		{"/v1/missing", apierr.NotFound, http.StatusNotFound},
	}
	for _, tc := range cases {
		rr := httptest.NewRecorder()
		mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, tc.path, nil))
		if rr.Code != tc.http {
			t.Fatalf("%s status=%d", tc.path, rr.Code)
		}
		var body apierr.Body
		if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		if body.Code != tc.code {
			t.Fatalf("%s code=%q", tc.path, body.Code)
		}
	}
}

func TestRequestIDGeneratedAndEchoed(t *testing.T) {
	mux := testMux(t, nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/health", nil))
	if rr.Header().Get("X-Request-Id") == "" {
		t.Fatal("expected generated X-Request-Id")
	}
}

func TestCORSAllowlistNeverStar(t *testing.T) {
	mux := testMux(t, nil)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodOptions, "/v1/events", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("preflight status=%d", rr.Code)
	}
	if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
		t.Fatalf("allow-origin=%q", got)
	}
	if rr.Header().Get("Access-Control-Allow-Origin") == "*" {
		t.Fatal("CORS must not be *")
	}
	if rr.Header().Get("Access-Control-Allow-Credentials") != "true" {
		t.Fatal("expected credentials for cookie web")
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/events", nil)
	req.Header.Set("Origin", "https://evil.example")
	mux.ServeHTTP(rr, req)
	if rr.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("disallowed origin must not receive ACAO")
	}
}

func TestPanicBecomesInternal(t *testing.T) {
	mux := testMux(t, func(mux *http.ServeMux) {
		mux.HandleFunc("GET /v1/contract/panic", func(http.ResponseWriter, *http.Request) {
			panic("boom")
		})
	})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/contract/panic", nil))
	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status=%d", rr.Code)
	}
	raw := rr.Body.String()
	if strings.Contains(raw, "boom") || strings.Contains(strings.ToLower(raw), "panic") {
		t.Fatalf("leaked panic: %s", raw)
	}
	var body apierr.Body
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Code != apierr.Internal {
		t.Fatalf("code=%q", body.Code)
	}
}

func TestAccessLogOmitsAuthorization(t *testing.T) {
	var buf bytes.Buffer
	log := slog.New(slog.NewJSONHandler(&buf, nil))
	cfg := config.Config{CORSOrigins: []string{"http://localhost:3000"}}
	mux := newMux(log, cfg, ratelimit.NewMemory(), nil, nil, Routes{})
	req := httptest.NewRequest(http.MethodGet, "/v1/secret", nil)
	req.Header.Set("Authorization", "Bearer super-secret-token")
	req.URL.RawQuery = "refresh_token=hidden"
	mux.ServeHTTP(httptest.NewRecorder(), req)
	out := buf.String()
	if strings.Contains(out, "super-secret-token") || strings.Contains(out, "hidden") {
		t.Fatalf("log leaked secrets: %s", out)
	}
	if !strings.Contains(out, `"path":"/v1/secret"`) {
		t.Fatalf("expected path without query: %s", out)
	}
}

func TestAuthRoutesNoStore(t *testing.T) {
	mux := testMux(t, func(mux *http.ServeMux) {
		mux.HandleFunc("POST /v1/auth/login", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		})
	})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/login", strings.NewReader(`{"email":"a@b.c"}`)))
	if rr.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("Cache-Control=%q", rr.Header().Get("Cache-Control"))
	}
}
