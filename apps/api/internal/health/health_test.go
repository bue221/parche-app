package health

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
)

type fakeChecker struct {
	name string
	err  error
}

func (f fakeChecker) Name() string               { return f.name }
func (f fakeChecker) Ping(context.Context) error { return f.err }

func TestHealthIgnoresFailedDeps(t *testing.T) {
	h := Health()
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/health", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d", rr.Code)
	}
}

func TestReadyOK(t *testing.T) {
	log := slog.New(slog.NewJSONHandler(io.Discard, nil))
	h := Ready(log, fakeChecker{name: "postgres"}, fakeChecker{name: "redis"}, fakeChecker{name: "store"})
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/ready", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestReadyNotReady(t *testing.T) {
	log := slog.New(slog.NewJSONHandler(io.Discard, nil))
	h := Ready(log, fakeChecker{name: "postgres"}, fakeChecker{name: "redis", err: ErrNotReady})
	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	req.Header.Set("X-Request-Id", "req-1")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d", rr.Code)
	}
	var body errorBody
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Code != "NOT_READY" {
		t.Fatalf("code = %q", body.Code)
	}
	if body.RequestID != "req-1" {
		t.Fatalf("request_id = %q", body.RequestID)
	}
	if body.Message == "" {
		t.Fatal("expected user-facing message")
	}
}
