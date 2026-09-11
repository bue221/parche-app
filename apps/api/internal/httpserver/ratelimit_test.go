package httpserver

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/config"
	"github.com/parche-app/backend/internal/ratelimit"
)

func TestRateLimitLogin(t *testing.T) {
	limiter := ratelimit.NewMemory()
	mux := newMux(testLogger(), configCORS(), limiter, nil, func(mux *http.ServeMux) {
		mux.HandleFunc("POST /v1/auth/login", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		})
	}, Routes{})
	body := `{"email":"user@example.com","password":"x"}`
	for i := 0; i < 10; i++ {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", strings.NewReader(body))
		req.RemoteAddr = "203.0.113.10:1234"
		mux.ServeHTTP(rr, req)
		if rr.Code != http.StatusNoContent {
			t.Fatalf("hit %d status=%d body=%s", i+1, rr.Code, rr.Body.String())
		}
	}
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", strings.NewReader(body))
	req.RemoteAddr = "203.0.113.10:1234"
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("status=%d", rr.Code)
	}
	if rr.Header().Get("Retry-After") == "" {
		t.Fatal("expected Retry-After")
	}
	var env apierr.Body
	if err := jsonDecode(rr, &env); err != nil {
		t.Fatal(err)
	}
	if env.Code != apierr.RateLimited {
		t.Fatalf("code=%q", env.Code)
	}
}

func TestRateLimitCheckIn(t *testing.T) {
	limiter := ratelimit.NewMemory()
	mux := newMux(testLogger(), configCORS(), limiter, nil, func(mux *http.ServeMux) {
		mux.HandleFunc("POST /v1/events/{eventId}/check-in", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		})
	}, Routes{})
	for i := 0; i < 30; i++ {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/v1/events/11111111-1111-1111-1111-111111111111/check-in", nil)
		req = req.WithContext(WithUserID(req.Context(), "staff-1"))
		mux.ServeHTTP(rr, req)
		if rr.Code != http.StatusNoContent {
			t.Fatalf("hit %d status=%d", i+1, rr.Code)
		}
	}
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/events/11111111-1111-1111-1111-111111111111/check-in", nil)
	req = req.WithContext(WithUserID(req.Context(), "staff-1"))
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("status=%d", rr.Code)
	}
}

func TestRateLimitPublicList(t *testing.T) {
	limiter := ratelimit.NewMemory()
	mux := newMux(testLogger(), configCORS(), limiter, nil, func(mux *http.ServeMux) {
		mux.HandleFunc("GET /v1/events", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		})
	}, Routes{})
	for i := 0; i < 60; i++ {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/v1/events", nil)
		req.RemoteAddr = "198.51.100.2:9"
		mux.ServeHTTP(rr, req)
		if rr.Code != http.StatusNoContent {
			t.Fatalf("hit %d status=%d", i+1, rr.Code)
		}
	}
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/events", nil)
	req.RemoteAddr = "198.51.100.2:9"
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("status=%d", rr.Code)
	}
}

func configCORS() config.Config {
	return config.Config{CORSOrigins: []string{"http://localhost:3000"}}
}
