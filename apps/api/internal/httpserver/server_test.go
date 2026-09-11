package httpserver

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/parche-app/backend/internal/health"
)

type pingOK struct{ name string }

func (p pingOK) Name() string               { return p.name }
func (p pingOK) Ping(context.Context) error { return nil }

type pingFail struct{ name string }

func (p pingFail) Name() string               { return p.name }
func (p pingFail) Ping(context.Context) error { return health.ErrNotReady }

func TestMuxHealthAndReady(t *testing.T) {
	log := slog.New(slog.NewJSONHandler(io.Discard, nil))
	mux := NewMux(log, pingOK{name: "postgres"}, pingOK{name: "redis"}, pingOK{name: "object_store"})

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/health", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("health status=%d", rr.Code)
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/ready", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("ready status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestMuxReadyFailsClosed(t *testing.T) {
	log := slog.New(slog.NewJSONHandler(io.Discard, nil))
	mux := NewMux(log, pingOK{name: "postgres"}, pingFail{name: "redis"})

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/health", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("health must stay 200 when deps fail, got %d", rr.Code)
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/ready", nil))
	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("status=%d", rr.Code)
	}
	var body map[string]string
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["code"] != "NOT_READY" {
		t.Fatalf("code=%q", body["code"])
	}
}
