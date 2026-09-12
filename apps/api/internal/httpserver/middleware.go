package httpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/applog"
	"github.com/parche-app/backend/internal/config"
	"github.com/parche-app/backend/internal/ratelimit"
)

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Write(b []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	return w.ResponseWriter.Write(b)
}

func wrap(next http.Handler, log *applog.Logger, cfg config.Config, limiter ratelimit.Limiter, access Access) http.Handler {
	if limiter == nil {
		limiter = ratelimit.NewMemory()
	}
	h := next
	h = rateLimit(h, limiter)
	h = cors(h, cfg.CORSOrigins)
	h = securityHeaders(h)
	h = accessLog(h, log, access)
	h = requestID(h)
	h = recoverPanic(h, log)
	return h
}

func requestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-Id")
		if strings.TrimSpace(id) == "" {
			id = apierr.NewRequestID()
		}
		w.Header().Set("X-Request-Id", id)
		r = r.WithContext(apierr.WithRequestID(r.Context(), id))
		next.ServeHTTP(w, r)
	})
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		if strings.HasPrefix(r.URL.Path, "/v1/auth/") {
			w.Header().Set("Cache-Control", "no-store")
		}
		next.ServeHTTP(w, r)
	})
}

func recoverPanic(next http.Handler, log *applog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Error("panic", "request_id", apierr.RequestIDFrom(r), "err", rec)
				apierr.Write(w, r, apierr.Internal, "", nil)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func accessLog(next http.Handler, log *applog.Logger, access Access) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		r = bindUser(r, access)
		sw := &statusWriter{ResponseWriter: w}
		next.ServeHTTP(sw, r)
		attrs := []any{
			"request_id", apierr.RequestIDFrom(r),
			"method", r.Method,
			"path", r.URL.Path,
			"status", sw.status,
			"latency_ms", time.Since(start).Milliseconds(),
		}
		if uid := userIDFromRequest(r); uid != "" {
			attrs = append(attrs, "user_id", uid)
		}
		log.Info("request", attrs...)
	})
}

func cors(next http.Handler, origins []string) http.Handler {
	allowed := map[string]struct{}{}
	for _, o := range origins {
		o = strings.TrimSpace(o)
		if o == "" || o == "*" {
			continue
		}
		allowed[o] = struct{}{}
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if _, ok := allowed[origin]; ok {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-Id, Idempotency-Key")
			w.Header().Set("Access-Control-Expose-Headers", "X-Request-Id, Retry-After")
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

const (
	authLimit            = 10
	authWindow           = 15 * time.Minute
	passwordForgotLimit  = 5
	passwordForgotWindow = time.Hour
	checkInLimit         = 30
	checkInWindow        = time.Second
	publicListLimit      = 60
	publicListWindow     = time.Minute
	meTicketsLimit       = 60
	meTicketsWindow      = time.Minute
	adminLimit           = 30
	adminWindow          = time.Minute
	broadcastLimit       = 2
	broadcastWindow      = time.Minute
	emailOptOutLimit     = 10
	emailOptOutWindow    = time.Hour
)

func rateLimit(next http.Handler, limiter ratelimit.Limiter) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}
		key, limit, window, apply := limitSpec(r)
		if !apply {
			next.ServeHTTP(w, r)
			return
		}
		ok, retry, err := limiter.Allow(r.Context(), key, limit, window)
		if err != nil {
			// Redis blip: fail open so a limiter outage does not take the API down.
			next.ServeHTTP(w, r)
			return
		}
		if !ok {
			apierr.WriteRateLimited(w, r, retry)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func limitSpec(r *http.Request) (key string, limit int, window time.Duration, apply bool) {
	path := r.URL.Path
	ip := clientIP(r)
	switch {
	case r.Method == http.MethodPost && path == "/v1/auth/password/forgot":
		email := peekEmail(r)
		return "rl:pwforgot:" + ip + ":" + strings.ToLower(email), passwordForgotLimit, passwordForgotWindow, true
	case r.Method == http.MethodPost && isAuthHotPath(path):
		email := peekEmail(r)
		return "rl:auth:" + ip + ":" + strings.ToLower(email), authLimit, authWindow, true
	case r.Method == http.MethodPost && isCheckInPath(path):
		user := userIDFromRequest(r)
		if user == "" {
			user = ip
		}
		return "rl:checkin:" + user, checkInLimit, checkInWindow, true
	case r.Method == http.MethodGet && path == "/v1/me/tickets":
		user := userIDFromRequest(r)
		if user == "" {
			user = ip
		}
		return "rl:tickets:" + user, meTicketsLimit, meTicketsWindow, true
	case r.Method == http.MethodPost && path == "/v1/me/email/opt-out":
		user := userIDFromRequest(r)
		if user == "" {
			user = ip
		}
		return "rl:optout:" + user, emailOptOutLimit, emailOptOutWindow, true
	case r.Method == http.MethodPost && path == "/v1/admin/broadcasts":
		user := userIDFromRequest(r)
		if user == "" {
			user = ip
		}
		return "rl:broadcast:" + user, broadcastLimit, broadcastWindow, true
	case strings.HasPrefix(path, "/v1/admin/"):
		user := userIDFromRequest(r)
		if user == "" {
			user = ip
		}
		return "rl:admin:" + user, adminLimit, adminWindow, true
	case r.Method == http.MethodGet && isPublicListPath(path):
		return "rl:list:" + ip, publicListLimit, publicListWindow, true
	default:
		return "", 0, 0, false
	}
}

func isAuthHotPath(path string) bool {
	switch path {
	case "/v1/auth/login", "/v1/auth/register", "/v1/auth/refresh":
		return true
	default:
		return false
	}
}

func isCheckInPath(path string) bool {
	// POST /v1/events/{eventId}/check-in
	const prefix = "/v1/events/"
	const suffix = "/check-in"
	if !strings.HasPrefix(path, prefix) || !strings.HasSuffix(path, suffix) {
		return false
	}
	mid := strings.TrimSuffix(strings.TrimPrefix(path, prefix), suffix)
	return mid != "" && !strings.Contains(mid, "/")
}

func isPublicListPath(path string) bool {
	switch path {
	case "/v1/events", "/v1/venues", "/v1/clubs", "/v1/posts", "/v1/artists":
		return true
	default:
		return false
	}
}

type ctxUserKey int

const userIDKey ctxUserKey = 1

// WithUserID attaches the authenticated user id for check-in rate limits (F04+).
func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

func userIDFromRequest(r *http.Request) string {
	v, _ := r.Context().Value(userIDKey).(string)
	return v
}

func bindUser(r *http.Request, access Access) *http.Request {
	if access == nil {
		return r
	}
	var (
		p   Principal
		err error
	)
	if pk, ok := access.(peeker); ok {
		p, err = pk.Peek(r)
	} else {
		p, err = access.Authenticate(r)
	}
	if err != nil || p.UserID == "" {
		return r
	}
	return r.WithContext(WithUserID(r.Context(), p.UserID))
}

func peekEmail(r *http.Request) string {
	if r.Body == nil {
		return ""
	}
	raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	_ = r.Body.Close()
	r.Body = io.NopCloser(bytes.NewReader(raw))
	if err != nil || len(raw) == 0 {
		return ""
	}
	var body struct {
		Email string `json:"email"`
	}
	if json.Unmarshal(raw, &body) != nil {
		return ""
	}
	return strings.TrimSpace(body.Email)
}

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func requestOrigin(r *http.Request) string {
	if o := strings.TrimSpace(r.Header.Get("Origin")); o != "" && !strings.EqualFold(o, "null") {
		return o
	}
	ref := strings.TrimSpace(r.Header.Get("Referer"))
	if ref == "" {
		return ""
	}
	u, err := url.Parse(ref)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return ""
	}
	return u.Scheme + "://" + u.Host
}

func originAllowed(origin string, origins []string) bool {
	if origin == "" {
		return false
	}
	for _, o := range origins {
		o = strings.TrimSpace(o)
		if o == "" || o == "*" {
			continue
		}
		if o == origin {
			return true
		}
	}
	return false
}
