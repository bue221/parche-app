package httpserver

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/config"
	"github.com/parche-app/backend/internal/mailer"
	"github.com/parche-app/backend/internal/objectstore"
	"github.com/parche-app/backend/internal/ratelimit"
	"github.com/parche-app/backend/internal/venues"
)

func testAuthStack(t *testing.T) (http.Handler, *bytes.Buffer) {
	t.Helper()
	mux, logs, _ := testAuthStackMail(t)
	return mux, logs
}

func testAuthStackMail(t *testing.T) (http.Handler, *bytes.Buffer, *mailer.Memory) {
	t.Helper()
	store := auth.NewMemory()
	tokens := &auth.Tokens{
		AccessSecret:  []byte("0123456789abcdef0123456789abcdef"),
		RefreshPepper: []byte("refresh-pepper-32-bytes-minimum!"),
	}
	var logs bytes.Buffer
	svc, err := auth.NewService(store, tokens, auth.FastArgon2(), slog.New(slog.NewJSONHandler(&logs, nil)))
	if err != nil {
		t.Fatal(err)
	}
	inbox := &mailer.Memory{}
	svc.Mailer = inbox
	svc.AppOrigin = "http://localhost:3000"
	access := JWTAccess{Tokens: tokens, Lookup: svc.AccessIdentity}
	mux := newMux(slog.New(slog.NewJSONHandler(&logs, nil)), config.Config{CORSOrigins: []string{"http://localhost:3000"}}, ratelimit.NewMemory(), nil, nil, Routes{
		Access:  access,
		Auth:    svc,
		Venues:  venues.NewService(venues.NewMemory(), store),
		MapPins: venues.EmptyPins{},
	})
	return mux, &logs, inbox
}

func resetTokenFromMail(t *testing.T, inbox *mailer.Memory) string {
	t.Helper()
	msg, ok := inbox.Last()
	if !ok {
		t.Fatal("expected password_reset mail")
	}
	if msg.Template != mailer.TemplatePasswordReset {
		t.Fatalf("template=%s", msg.Template)
	}
	rawURL := msg.Vars["reset_url"]
	u, err := url.Parse(rawURL)
	if err != nil {
		t.Fatal(err)
	}
	tok := u.Query().Get("token")
	if tok == "" {
		t.Fatalf("reset_url=%s", rawURL)
	}
	return tok
}

func TestAuthRegisterLoginMeAndRefresh(t *testing.T) {
	mux, logs := testAuthStack(t)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"Ada@Example.com","password":"correct-horse","display_name":"Ada","profile":"attendee"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Request-Id", "rid-reg")
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("register status=%d body=%s", rr.Code, rr.Body.String())
	}
	if rr.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("auth cache")
	}
	var sess sessionBody
	if err := json.Unmarshal(rr.Body.Bytes(), &sess); err != nil {
		t.Fatal(err)
	}
	if sess.AccessToken == "" || sess.RefreshToken == "" || sess.User.Email != "ada@example.com" {
		t.Fatalf("sess=%+v", sess)
	}
	if !strings.Contains(rr.Header().Get("Set-Cookie"), "refresh=") {
		t.Fatalf("cookie=%s", rr.Header().Get("Set-Cookie"))
	}
	if sess.AccessExpiresAt.Sub(time.Now()) >= 15*time.Minute {
		t.Fatal("access must be under 15 minutes")
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/auth/login", strings.NewReader(`{"email":"missing@example.com","password":"correct-horse"}`))
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)
	var env apierr.Body
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	if env.Message != "Correo o contraseña incorrectos" {
		t.Fatalf("message=%q", env.Message)
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/auth/login", strings.NewReader(`{"email":"ada@example.com","password":"wrong-password"}`))
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	if env.Message != "Correo o contraseña incorrectos" {
		t.Fatalf("message=%q", env.Message)
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/auth/login", strings.NewReader(`{"email":"ada@example.com","password":"correct-horse"}`))
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("login status=%d body=%s", rr.Code, rr.Body.String())
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &sess); err != nil {
		t.Fatal(err)
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("me status=%d body=%s", rr.Code, rr.Body.String())
	}
	if strings.Contains(rr.Body.String(), "access_token") || strings.Contains(rr.Body.String(), "password") {
		t.Fatalf("me leaked secrets: %s", rr.Body.String())
	}

	oldRefresh := sess.RefreshToken
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/auth/refresh", strings.NewReader(`{"refresh_token":"`+oldRefresh+`"}`))
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("refresh status=%d body=%s", rr.Code, rr.Body.String())
	}
	var rotated sessionBody
	if err := json.Unmarshal(rr.Body.Bytes(), &rotated); err != nil {
		t.Fatal(err)
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/auth/refresh", strings.NewReader(`{"refresh_token":"`+oldRefresh+`"}`))
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)

	out := logs.String()
	if strings.Contains(out, "correct-horse") || strings.Contains(out, sess.AccessToken) || strings.Contains(out, oldRefresh) {
		t.Fatalf("logs leaked secrets: %s", out)
	}
	if !strings.Contains(out, "refresh_reuse") {
		t.Fatalf("expected refresh_reuse log: %s", out)
	}
}

func TestAuthRegisterConflictAndValidation(t *testing.T) {
	mux, _ := testAuthStack(t)
	body := `{"email":"dup@example.com","password":"correct-horse","display_name":"A","profile":"attendee"}`
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(body)))
	if rr.Code != http.StatusCreated {
		t.Fatalf("status=%d", rr.Code)
	}
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(body)))
	assertAPICode(t, rr, http.StatusConflict, apierr.Conflict)
	var env apierr.Body
	_ = json.Unmarshal(rr.Body.Bytes(), &env)
	if env.Message != "Ese correo ya tiene cuenta" {
		t.Fatalf("message=%q", env.Message)
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"x@example.com","password":"123","display_name":"X","profile":"attendee"}`)))
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)
}

func TestAuthLogoutAndSessions(t *testing.T) {
	mux, _ := testAuthStack(t)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"s@example.com","password":"correct-horse","display_name":"S","profile":"promoter"}`)))
	if rr.Code != http.StatusCreated {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var sess sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &sess)

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("me=%d %s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"tenants"`) {
		t.Fatalf("promoter me=%s", rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me/sessions", nil)
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	req.AddCookie(&http.Cookie{Name: refreshCookie, Value: sess.RefreshToken})
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("sessions=%d %s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"current":true`) {
		t.Fatalf("sessions=%s", rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/auth/logout", strings.NewReader(`{"refresh_token":"`+sess.RefreshToken+`"}`))
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("logout=%d", rr.Code)
	}
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/auth/logout", strings.NewReader(`{"refresh_token":"`+sess.RefreshToken+`"}`))
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("logout idempotent=%d", rr.Code)
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/auth/login", strings.NewReader(`{"email":"s@example.com","password":"correct-horse"}`))
	mux.ServeHTTP(rr, req)
	_ = json.Unmarshal(rr.Body.Bytes(), &sess)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodDelete, "/v1/me/sessions", nil)
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("logout all=%d", rr.Code)
	}
}

func TestAuthMeRequiresBearer(t *testing.T) {
	mux, _ := testAuthStack(t)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/me", nil))
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)
}

func TestUploadsAvatarWithAccessJWT(t *testing.T) {
	store := auth.NewMemory()
	tokens := &auth.Tokens{
		AccessSecret:  []byte("0123456789abcdef0123456789abcdef"),
		RefreshPepper: []byte("refresh-pepper-32-bytes-minimum!"),
	}
	svc, err := auth.NewService(store, tokens, auth.FastArgon2(), slog.New(slog.NewJSONHandler(io.Discard, nil)))
	if err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	fsStore, err := objectstore.NewFS(dir)
	if err != nil {
		t.Fatal(err)
	}
	mux := newMux(testLogger(), config.Config{}, ratelimit.NewMemory(), nil, nil, Routes{
		Store:  fsStore,
		Access: JWTAccess{Tokens: tokens, Lookup: svc.AccessIdentity},
		Events: DenyEventWrite{},
		Auth:   svc,
	})
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"av@example.com","password":"correct-horse","display_name":"Av","profile":"attendee"}`)))
	if rr.Code != http.StatusCreated {
		t.Fatalf("register=%d %s", rr.Code, rr.Body.String())
	}
	var sess sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &sess)

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"avatar","content_type":"image/png","byte_size":12}`))
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("upload=%d %s", rr.Code, rr.Body.String())
	}
}

func TestRefreshCookieRoundTrip(t *testing.T) {
	mux, _ := testAuthStack(t)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"c@example.com","password":"correct-horse","display_name":"C","profile":"attendee"}`)))
	var sess sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &sess)
	cookie := rr.Result().Cookies()
	var refresh *http.Cookie
	for _, c := range cookie {
		if c.Name == refreshCookie {
			refresh = c
		}
	}
	if refresh == nil || !refresh.HttpOnly {
		t.Fatal("expected httpOnly refresh cookie")
	}

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/refresh", nil)
	req.AddCookie(refresh)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("cookie refresh=%d %s", rr.Code, rr.Body.String())
	}
}

func TestPasswordForgotAlways204AndResetKillsSessions(t *testing.T) {
	mux, logs, inbox := testAuthStackMail(t)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"r@example.com","password":"correct-horse","display_name":"R","profile":"attendee"}`)))
	if rr.Code != http.StatusCreated {
		t.Fatalf("register=%d %s", rr.Code, rr.Body.String())
	}
	var sess sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &sess)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/password/forgot", strings.NewReader(`{"email":"missing@example.com"}`)))
	if rr.Code != http.StatusNoContent {
		t.Fatalf("missing forgot=%d %s", rr.Code, rr.Body.String())
	}
	if inbox.Len() != 0 {
		t.Fatal("must not email unknown accounts")
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/password/forgot", strings.NewReader(`{"email":"r@example.com"}`)))
	if rr.Code != http.StatusNoContent {
		t.Fatalf("forgot=%d %s", rr.Code, rr.Body.String())
	}
	tok := resetTokenFromMail(t, inbox)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/password/reset", strings.NewReader(`{"token":"`+tok+`","password":"new-correct-horse"}`)))
	if rr.Code != http.StatusNoContent {
		t.Fatalf("reset=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/refresh", strings.NewReader(`{"refresh_token":"`+sess.RefreshToken+`"}`)))
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/login", strings.NewReader(`{"email":"r@example.com","password":"correct-horse"}`)))
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/login", strings.NewReader(`{"email":"r@example.com","password":"new-correct-horse"}`)))
	if rr.Code != http.StatusOK {
		t.Fatalf("new login=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/password/reset", strings.NewReader(`{"token":"`+tok+`","password":"another-horse1"}`)))
	assertAPICode(t, rr, http.StatusGone, apierr.Gone)

	out := logs.String()
	if strings.Contains(out, tok) || strings.Contains(out, "new-correct-horse") {
		t.Fatalf("logs leaked secrets: %s", out)
	}
}

func TestPasswordResetValidationAndUnknownToken(t *testing.T) {
	mux, _, _ := testAuthStackMail(t)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/password/reset", strings.NewReader(`{"token":"x","password":"123"}`)))
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/password/reset", strings.NewReader(`{"token":"not-a-real-token","password":"correct-horse"}`)))
	assertAPICode(t, rr, http.StatusGone, apierr.Gone)
}
