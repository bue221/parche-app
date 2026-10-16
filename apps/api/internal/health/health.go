package health

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/parche-app/backend/internal/apierr"
)

// Checker is a named dependency ping used by /ready.
type Checker interface {
	Name() string
	Ping(ctx context.Context) error
}

type statusBody struct {
	Status string `json:"status"`
}

// Health returns 200 if the process is alive. It does not touch dependencies.
func Health() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, statusBody{Status: "ok"})
	}
}

// Ready returns 200 when every checker pings, otherwise 503 NOT_READY.
// Internal causes are logged; the client only sees a short Spanish message.
func Ready(log *slog.Logger, checkers ...Checker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqID := apierr.RequestIDFrom(r)
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()

		for _, c := range checkers {
			if err := c.Ping(ctx); err != nil {
				log.Error("readiness check failed",
					"request_id", reqID,
					"checker", c.Name(),
					"err", err,
				)
				apierr.Write(w, r, apierr.NotReady, "", nil)
				return
			}
		}
		writeJSON(w, http.StatusOK, statusBody{Status: "ready"})
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		return
	}
}

// ErrNotReady is used by tests.
var ErrNotReady = errors.New("not ready")
