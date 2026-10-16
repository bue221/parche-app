package httpserver

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/artists"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/events"
	"github.com/parche-app/backend/internal/media"
)

const (
	refreshCookie     = "refresh"
	refreshCookiePath = "/v1/auth"
)

type sessionBody struct {
	AccessToken      string          `json:"access_token"`
	AccessExpiresAt  time.Time       `json:"access_expires_at"`
	RefreshToken     string          `json:"refresh_token,omitempty"`
	RefreshExpiresAt time.Time       `json:"refresh_expires_at"`
	User             auth.PublicUser `json:"user"`
}

type registerBody struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"display_name"`
	Phone       string `json:"phone"`
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
	h := authHandler{
		svc:     routes.Auth,
		access:  access,
		media:   routes.Media,
		artists: routes.Artists,
		events:  routes.Catalog,
		origins: routes.CORSOrigins,
	}
	mux.HandleFunc("POST /v1/auth/register", h.register)
	mux.HandleFunc("POST /v1/auth/login", h.login)
	mux.HandleFunc("POST /v1/auth/refresh", h.refresh)
	mux.HandleFunc("POST /v1/auth/logout", h.logout)
	mux.HandleFunc("POST /v1/auth/password/forgot", h.forgot)
	mux.HandleFunc("POST /v1/auth/password/reset", h.reset)
	mux.HandleFunc("POST /v1/auth/otp/request", h.requestOTP)
	mux.HandleFunc("POST /v1/auth/otp/verify", h.verifyOTP)
	mux.HandleFunc("POST /v1/auth/oauth", h.oauth)
	mux.HandleFunc("GET /v1/me", h.me)
	mux.HandleFunc("PATCH /v1/me", h.patchMe)
	mux.HandleFunc("POST /v1/me/sync", h.syncInterest)
	mux.HandleFunc("POST /v1/me/avatar", h.confirmAvatar)
	mux.HandleFunc("POST /v1/me/email/change", h.changeEmail)
	mux.HandleFunc("POST /v1/me/email/confirm", h.confirmEmail)
	mux.HandleFunc("GET /v1/users/{id}", h.publicUser)
	mux.HandleFunc("POST /v1/me/profiles/artist", h.addArtist)
	mux.HandleFunc("POST /v1/me/profiles/promoter", h.addPromoter)
	mux.HandleFunc("GET /v1/me/sessions", h.sessions)
	mux.HandleFunc("DELETE /v1/me/sessions", h.logoutAll)
	mux.HandleFunc("POST /v1/tenants", h.createTenant)
	mux.HandleFunc("GET /v1/tenants/{id}", h.getTenant)
	mux.HandleFunc("PATCH /v1/tenants/{id}", h.patchTenant)
	mux.HandleFunc("GET /v1/tenants/{id}/members", h.listMembers)
	mux.HandleFunc("POST /v1/tenants/{id}/members", h.addMember)
	mux.HandleFunc("DELETE /v1/tenants/{id}/members/{userId}", h.removeMember)
}

type otpBody struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

type oauthBody struct {
	Provider string `json:"provider"`
	IDToken  string `json:"id_token"`
}

type syncBody struct {
	ArtistIDs []string `json:"artist_ids"`
	EventIDs  []string `json:"event_ids"`
}

type authHandler struct {
	svc     *auth.Service
	access  Access
	media   *media.Service
	artists *artists.Service
	events  *events.Service
	origins []string
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
		Phone:       req.Phone,
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
	raw, ok := h.refreshCredential(w, r)
	if !ok {
		return
	}
	sess, err := h.svc.Refresh(r.Context(), raw, r.UserAgent())
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	h.writeSession(w, r, http.StatusOK, sess)
}

func (h authHandler) logout(w http.ResponseWriter, r *http.Request) {
	raw, ok := h.refreshCredential(w, r)
	if !ok {
		return
	}
	if err := h.svc.Logout(r.Context(), raw); err != nil {
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

func (h authHandler) requestOTP(w http.ResponseWriter, r *http.Request) {
	var req otpBody
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.svc.RequestOTP(r.Context(), auth.OTPRequestInput{Email: req.Email}); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h authHandler) verifyOTP(w http.ResponseWriter, r *http.Request) {
	var req otpBody
	if !decodeJSON(w, r, &req) {
		return
	}
	sess, created, err := h.svc.VerifyOTP(r.Context(), auth.OTPVerifyInput{
		Email: req.Email, Code: req.Code, UserAgent: r.UserAgent(),
	})
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	h.writeSession(w, r, status, sess)
}

func (h authHandler) oauth(w http.ResponseWriter, r *http.Request) {
	var req oauthBody
	if !decodeJSON(w, r, &req) {
		return
	}
	sess, created, err := h.svc.OAuth(r.Context(), auth.OAuthInput{
		Provider: req.Provider, IDToken: req.IDToken, UserAgent: r.UserAgent(),
	})
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	h.writeSession(w, r, status, sess)
}

func (h authHandler) syncInterest(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req syncBody
	if !decodeJSON(w, r, &req) {
		return
	}
	for _, id := range req.ArtistIDs {
		id = strings.TrimSpace(id)
		if id == "" || h.artists == nil {
			continue
		}
		_ = h.artists.Follow(r.Context(), p.UserID, id)
	}
	for _, id := range req.EventIDs {
		id = strings.TrimSpace(id)
		if id == "" || h.events == nil {
			continue
		}
		_ = h.events.SaveEvent(r.Context(), p.UserID, id)
	}
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
	apierr.WriteJSON(w, http.StatusOK, h.withAvatarURL(r, me))
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
	body := sessionBody{
		AccessToken:      sess.AccessToken,
		AccessExpiresAt:  sess.AccessExpiresAt,
		RefreshToken:     sess.RefreshToken,
		RefreshExpiresAt: sess.RefreshExpiresAt,
		User:             sess.User,
	}
	if strings.TrimSpace(r.Header.Get("Origin")) != "" {
		body.RefreshToken = ""
	}
	apierr.WriteJSON(w, status, body)
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

func (h authHandler) refreshCredential(w http.ResponseWriter, r *http.Request) (string, bool) {
	bodyTok := readRefreshBody(r)
	cookieTok := cookieRefresh(r)
	if bodyTok == "" && cookieTok != "" && !originAllowed(requestOrigin(r), h.origins) {
		writeAuthErr(w, r, auth.ErrUnauthorized)
		return "", false
	}
	if bodyTok != "" {
		return bodyTok, true
	}
	return cookieTok, true
}

func readRefreshBody(r *http.Request) string {
	var body refreshBody
	if r.Body != nil {
		raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		_ = r.Body.Close()
		r.Body = io.NopCloser(strings.NewReader(string(raw)))
		if err == nil && len(raw) > 0 {
			_ = json.Unmarshal(raw, &body)
		}
	}
	return strings.TrimSpace(body.RefreshToken)
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
		Path:     refreshCookiePath,
		Expires:  exp,
		MaxAge:   int(time.Until(exp).Seconds()),
		HttpOnly: true,
		Secure:   isHTTPS(r),
		SameSite: http.SameSiteLaxMode,
	})
}

func clearRefreshCookie(w http.ResponseWriter, r *http.Request) {
	for _, path := range []string{refreshCookiePath, "/"} {
		http.SetCookie(w, &http.Cookie{
			Name:     refreshCookie,
			Value:    "",
			Path:     path,
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   isHTTPS(r),
			SameSite: http.SameSiteLaxMode,
		})
	}
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
	case errors.Is(err, auth.ErrLastAdmin):
		apierr.Write(w, r, apierr.Conflict, "Debe quedar al menos un admin de plataforma", nil)
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
