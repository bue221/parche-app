package apierr

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
)

// Stable product error codes. Messages are user-facing (Spanish); logs carry the cause.
const (
	Validation   = "VALIDATION_ERROR"
	Unauthorized = "UNAUTHORIZED"
	Forbidden    = "FORBIDDEN"
	NotFound     = "NOT_FOUND"
	Conflict     = "CONFLICT"
	Gone         = "GONE"
	RateLimited  = "RATE_LIMITED"
	NotReady     = "NOT_READY"
	Internal     = "INTERNAL"
)

// Detail is included only for VALIDATION_ERROR.
type Detail struct {
	Field string `json:"field"`
	Issue string `json:"issue"`
}

// Body is the single JSON error envelope for all product and health failures.
type Body struct {
	Code      string   `json:"code"`
	Message   string   `json:"message"`
	RequestID string   `json:"request_id"`
	Details   []Detail `json:"details,omitempty"`
}

type ctxKey int

const requestIDKey ctxKey = 1

// WithRequestID stores the request id for handlers and logs.
func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, requestIDKey, id)
}

// RequestID returns the id from context, or empty.
func RequestID(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey).(string)
	return id
}

// RequestIDFrom prefers context, then X-Request-Id, then a new UUID.
func RequestIDFrom(r *http.Request) string {
	if id := RequestID(r.Context()); id != "" {
		return id
	}
	if id := r.Header.Get("X-Request-Id"); id != "" {
		return id
	}
	return NewRequestID()
}

// NewRequestID returns a UUID v7 when available, otherwise v4.
func NewRequestID() string {
	id, err := uuid.NewV7()
	if err != nil {
		return uuid.NewString()
	}
	return id.String()
}

// Status maps a product code to HTTP status.
func Status(code string) int {
	switch code {
	case Validation:
		return http.StatusBadRequest
	case Unauthorized:
		return http.StatusUnauthorized
	case Forbidden:
		return http.StatusForbidden
	case NotFound:
		return http.StatusNotFound
	case Conflict:
		return http.StatusConflict
	case Gone:
		return http.StatusGone
	case RateLimited:
		return http.StatusTooManyRequests
	case NotReady:
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}

// Write sends the envelope. details must be nil except for VALIDATION_ERROR.
func Write(w http.ResponseWriter, r *http.Request, code, message string, details []Detail) {
	if code != Validation {
		details = nil
	}
	// INTERNAL never echoes caller text (stacks, SQL, table names).
	if code == Internal || message == "" {
		message = DefaultMessage(code)
	}
	writeJSON(w, Status(code), Body{
		Code:      code,
		Message:   message,
		RequestID: RequestIDFrom(r),
		Details:   details,
	})
}

// WriteRateLimited sets Retry-After in seconds and writes RATE_LIMITED.
func WriteRateLimited(w http.ResponseWriter, r *http.Request, retryAfter time.Duration) {
	sec := int(retryAfter.Round(time.Second) / time.Second)
	if sec < 1 {
		sec = 1
	}
	w.Header().Set("Retry-After", strconv.Itoa(sec))
	Write(w, r, RateLimited, DefaultMessage(RateLimited), nil)
}

// DefaultMessage is the client-safe Spanish copy. Never include SQL, stacks, or table names.
func DefaultMessage(code string) string {
	switch code {
	case Validation:
		return "La solicitud no es válida"
	case Unauthorized:
		return "No autenticado"
	case Forbidden:
		return "No tienes permiso"
	case NotFound:
		return "No encontrado"
	case Conflict:
		return "El estado actual no permite esta operación"
	case Gone:
		return "El recurso ya no está disponible"
	case RateLimited:
		return "Demasiadas solicitudes"
	case NotReady:
		return "El servicio no está listo"
	default:
		return "Error interno"
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
