package httpserver

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
)

const refreshCookie = "refresh"

type sessionBody struct {
	AccessToken      string          `json:"access_token"`
	AccessExpiresAt  time.Time       `json:"access_expires_at"`
	RefreshToken     string          `json:"refresh_token"`
	RefreshExpiresAt time.Time       `json:"refresh_expires_at"`
	User             auth.PublicUser `json:"user"`
}

type registerBody struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"display_name"`
	Profile     string `json:"profile"`
}

type loginBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type forgotBody struct {
	Email string `json:"email"`
}

type resetBody struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

type refreshBody struct {
	RefreshToken string `json:"refresh_token"`
}

func registerAuthRoutes(mux *http.ServeMux, routes Routes) {
	if routes.Auth == nil {
		return
	}
	access := routes.Access
	if access == nil {
		access = RejectAccess{}
	}
	h := authHandler{svc: routes.Auth, access: access}
	mux.HandleFunc("POST /v1/auth/register", h.register)
	mux.HandleFunc("POST /v1/auth/login", h.login)
	mux.HandleFunc("POST /v1/auth/refresh", h.refresh)
	mux.HandleFunc("POST /v1/auth/logout", h.logout)
	mux.HandleFunc("POST /v1/auth/password/forgot", h.forgot)
	mux.HandleFunc("POST /v1/auth/password/reset", h.reset)
	mux.HandleFunc("GET /v1/me", h.me)
	mux.HandleFunc("POST /v1/me/profiles/artist", h.addArtist)
	mux.HandleFunc("GET /v1/me/sessions", h.sessions)
	mux.HandleFunc("DELETE /v1/me/sessions", h.logoutAll)
	mux.HandleFunc("POST /v1/tenants", h.createTenant)
	mux.HandleFunc("GET /v1/tenants/{id}", h.getTenant)
	mux.HandleFunc("PATCH /v1/tenants/{id}", h.patchTenant)
	mux.HandleFunc("GET /v1/tenants/{id}/members", h.listMembers)
	mux.HandleFunc("POST /v1/tenants/{id}/members", h.addMember)
	mux.HandleFunc("DELETE /v1/tenants/{id}/members/{userId}", h.removeMember)
}

type authHandler struct {
	svc    *auth.Service
	access Access
}

func (h authHandler) register(w http.ResponseWriter, r *http.Request) {
	var req registerBody
	if !decodeJSON(w, r, &req) {
		return
	}
	sess, err := h.svc.Register(r.Context(), auth.RegisterInput{
		Email:       req.Email,
		Password:    req.Password,
		DisplayName: req.DisplayName,
		Profile:     req.Profile,
		UserAgent:   r.UserAgent(),
	})
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	h.writeSession(w, r, http.StatusCreated, sess)
}

func (h authHandler) login(w http.ResponseWriter, r *http.Request) {
	var req loginBody
	if !decodeJSON(w, r, &req) {
		return
	}
	sess, err := h.svc.Login(r.Context(), auth.LoginInput{
		Email:     req.Email,
		Password:  req.Password,
		UserAgent: r.UserAgent(),
	})
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	h.writeSession(w, r, http.StatusOK, sess)
}

func (h authHandler) refresh(w http.ResponseWriter, r *http.Request) {
	raw := readRefresh(r)
	sess, err := h.svc.Refresh(r.Context(), raw, r.UserAgent())
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	h.writeSession(w, r, http.StatusOK, sess)
}

func (h authHandler) logout(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Logout(r.Context(), readRefresh(r)); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	clearRefreshCookie(w, r)
	w.WriteHeader(http.StatusNoContent)
}

func (h authHandler) forgot(w http.ResponseWriter, r *http.Request) {
	var req forgotBody
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.svc.Forgot(r.Context(), req.Email); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h authHandler) reset(w http.ResponseWriter, r *http.Request) {
	var req resetBody
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.svc.Reset(r.Context(), auth.ResetInput{Token: req.Token, Password: req.Password}); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	clearRefreshCookie(w, r)
	w.WriteHeader(http.StatusNoContent)
}

func (h authHandler) me(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	me, err := h.svc.Me(r.Context(), p.UserID)
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, me)
}

func (h authHandler) sessions(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	items, err := h.svc.Sessions(r.Context(), p.UserID, cookieRefresh(r))
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	if items == nil {
		items = []auth.SessionListItem{}
	}
	apierr.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h authHandler) logoutAll(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	if err := h.svc.LogoutAll(r.Context(), p.UserID); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	clearRefreshCookie(w, r)
	w.WriteHeader(http.StatusNoContent)
}

func (h authHandler) writeSession(w http.ResponseWriter, r *http.Request, status int, sess auth.Session) {
	setRefreshCookie(w, r, sess.RefreshToken, sess.RefreshExpiresAt)
	apierr.WriteJSON(w, status, sessionBody{
		AccessToken:      sess.AccessToken,
		AccessExpiresAt:  sess.AccessExpiresAt,
		RefreshToken:     sess.RefreshToken,
		RefreshExpiresAt: sess.RefreshExpiresAt,
		User:             sess.User,
	})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dest any) bool {
	dec := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dest); err != nil {
		apierr.Write(w, r, apierr.Validation, "", []apierr.Detail{{Field: "body", Issue: "json"}})
		return false
	}
	return true
}

func readRefresh(r *http.Request) string {
	var body refreshBody
	if r.Body != nil {
		raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		_ = r.Body.Close()
		r.Body = io.NopCloser(strings.NewReader(string(raw)))
		if err == nil && len(raw) > 0 {
			_ = json.Unmarshal(raw, &body)
		}
	}
	if tok := strings.TrimSpace(body.RefreshToken); tok != "" {
		return tok
	}
	return cookieRefresh(r)
}

func cookieRefresh(r *http.Request) string {
	c, err := r.Cookie(refreshCookie)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(c.Value)
}

func setRefreshCookie(w http.ResponseWriter, r *http.Request, raw string, exp time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookie,
		Value:    raw,
		Path:     "/",
		Expires:  exp,
		MaxAge:   int(time.Until(exp).Seconds()),
		HttpOnly: true,
		Secure:   isHTTPS(r),
		SameSite: http.SameSiteLaxMode,
	})
}

func clearRefreshCookie(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookie,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   isHTTPS(r),
		SameSite: http.SameSiteLaxMode,
	})
}

func isHTTPS(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}
	return strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}

func writeAuthErr(w http.ResponseWriter, r *http.Request, err error) {
	var inv auth.Invalid
	if errors.As(err, &inv) {
		details := make([]apierr.Detail, 0, len(inv.Fields))
		msg := ""
		for _, f := range inv.Fields {
			details = append(details, apierr.Detail{Field: f.Name, Issue: f.Issue})
			if f.Name == "ends_at" && f.Issue == "order" {
				msg = "La fecha de fin debe ser posterior al inicio"
			}
		}
		apierr.Write(w, r, apierr.Validation, msg, details)
		return
	}
	switch {
	case errors.Is(err, auth.ErrEmailTaken):
		apierr.Write(w, r, apierr.Conflict, "Ese correo ya tiene cuenta", nil)
	case errors.Is(err, auth.ErrLastOwner):
		apierr.Write(w, r, apierr.Conflict, "El colectivo debe tener al menos un owner", nil)
	case errors.Is(err, auth.ErrConflict):
		apierr.Write(w, r, apierr.Conflict, "", nil)
	case errors.Is(err, auth.ErrNotFound):
		apierr.Write(w, r, apierr.NotFound, "", nil)
	case errors.Is(err, auth.ErrGone):
		apierr.Write(w, r, apierr.Gone, "", nil)
	case errors.Is(err, auth.ErrForbidden):
		apierr.Write(w, r, apierr.Forbidden, "", nil)
	case errors.Is(err, auth.ErrUnauthorized):
		msg := apierr.DefaultMessage(apierr.Unauthorized)
		if isLoginOrRefresh(r.URL.Path) {
			msg = "Correo o contraseña incorrectos"
		}
		if r.URL.Path == "/v1/auth/refresh" {
			msg = apierr.DefaultMessage(apierr.Unauthorized)
		}
		apierr.Write(w, r, apierr.Unauthorized, msg, nil)
	default:
		apierr.Write(w, r, apierr.Internal, "", nil)
	}
}

func isLoginOrRefresh(path string) bool {
	return path == "/v1/auth/login"
}
