package httpserver

import (
	"errors"
	"net/http"
	"net/url"
	"strings"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/payments"
)

func registerMercadoPagoRoutes(mux *http.ServeMux, routes Routes) {
	h := mpHandler{
		auth:     routes.Auth,
		access:   routes.Access,
		oauth:    routes.MPOAuth,
		accounts: routes.MPAccounts,
		pay:      routes.Payments,
		origin:   strings.TrimRight(strings.TrimSpace(routes.AppOrigin), "/"),
	}
	if h.access == nil {
		h.access = RejectAccess{}
	}
	mux.HandleFunc("GET /v1/tenants/{id}/mercadopago", h.status)
	mux.HandleFunc("POST /v1/tenants/{id}/mercadopago/connect", h.connect)
	mux.HandleFunc("DELETE /v1/tenants/{id}/mercadopago", h.disconnect)
	mux.HandleFunc("GET /v1/payments/mercadopago/oauth/callback", h.callback)
}

type mpHandler struct {
	auth     *auth.Service
	access   Access
	oauth    *payments.OAuth
	accounts payments.Accounts
	pay      payments.Provider
	origin   string
}

func (h mpHandler) status(w http.ResponseWriter, r *http.Request) {
	if h.auth == nil || h.accounts == nil {
		apierr.Write(w, r, apierr.NotFound, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	tenantID := r.PathValue("id")
	if err := h.auth.RequireTenantOwner(r.Context(), tenantID, p.UserID); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	out := map[string]any{
		"connected":          false,
		"oauth_enabled":      h.oauth != nil && h.oauth.Enabled(),
		"platform_ready":     h.pay != nil && h.pay.Name() == "mercadopago",
		"payout_required":    false,
		"commission_percent": payments.CommissionPercent,
		"iva_percent":        payments.IVAPercent,
	}
	if h.oauth != nil && !h.oauth.Enabled() && strings.TrimSpace(h.oauth.ClientID) != "" && strings.TrimSpace(h.oauth.ClientSecret) == "" {
		out["oauth_needs"] = "client_secret"
	}
	acc, err := h.accounts.Get(r.Context(), tenantID)
	if err != nil {
		if errors.Is(err, auth.ErrNotFound) {
			out["payout_required"] = out["oauth_enabled"]
			apierr.WriteJSON(w, http.StatusOK, out)
			return
		}
		writeAuthErr(w, r, err)
		return
	}
	out["connected"] = true
	out["mp_user_id"] = acc.MPUserID
	apierr.WriteJSON(w, http.StatusOK, out)
}

func (h mpHandler) connect(w http.ResponseWriter, r *http.Request) {
	if h.auth == nil || h.oauth == nil || !h.oauth.Enabled() {
		apierr.Write(w, r, apierr.NotFound, "OAuth de Mercado Pago (no Auth0): falta MP_CLIENT_SECRET en el API. Está en Tus integraciones → tu app → Editar datos.", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	tenantID := r.PathValue("id")
	if err := h.auth.RequireTenantOwner(r.Context(), tenantID, p.UserID); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	state := h.oauth.SignState(tenantID, p.UserID)
	authURL, err := h.oauth.AuthorizationURL(state)
	if err != nil || authURL == "" {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, map[string]string{"authorization_url": authURL})
}

func (h mpHandler) disconnect(w http.ResponseWriter, r *http.Request) {
	if h.auth == nil || h.accounts == nil {
		apierr.Write(w, r, apierr.NotFound, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	tenantID := r.PathValue("id")
	if err := h.auth.RequireTenantOwner(r.Context(), tenantID, p.UserID); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	if err := h.accounts.Delete(r.Context(), tenantID); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h mpHandler) callback(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	if msg := strings.TrimSpace(q.Get("error")); msg != "" {
		h.redirectMP(w, r, "", "denied")
		return
	}
	if h.oauth == nil || h.accounts == nil || h.auth == nil || !h.oauth.Enabled() {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	tenantID, userID, err := h.oauth.ParseState(q.Get("state"))
	if err != nil {
		h.redirectMP(w, r, "", "invalid_state")
		return
	}
	if err := h.auth.RequireTenantOwner(r.Context(), tenantID, userID); err != nil {
		h.redirectMP(w, r, tenantID, "forbidden")
		return
	}
	tok, err := h.oauth.Exchange(r.Context(), q.Get("code"))
	if err != nil {
		h.redirectMP(w, r, tenantID, "oauth_failed")
		return
	}
	if err := h.accounts.Upsert(r.Context(), payments.Account{
		TenantID:     tenantID,
		MPUserID:     tok.UserID,
		AccessToken:  tok.AccessToken,
		RefreshToken: tok.RefreshToken,
		PublicKey:    tok.PublicKey,
		ExpiresAt:    tok.ExpiresAt,
	}); err != nil {
		h.redirectMP(w, r, tenantID, "save_failed")
		return
	}
	h.redirectMP(w, r, tenantID, "connected")
}

func (h mpHandler) redirectMP(w http.ResponseWriter, r *http.Request, _ string, result string) {
	http.Redirect(w, r, cobrosReturn(h.origin, result), http.StatusFound)
}

func cobrosReturn(origin, result string) string {
	q := url.Values{}
	q.Set("mp", result)
	u, err := url.Parse(strings.TrimSpace(origin))
	if err == nil && u != nil && strings.EqualFold(u.Scheme, "https") {
		host := strings.ToLower(u.Hostname())
		if host != "" && host != "localhost" && host != "127.0.0.1" && !strings.HasSuffix(host, ".local") {
			u.Path = "/parche/cobros"
			u.RawQuery = q.Encode()
			return u.String()
		}
	}
	return "parche://parche/cobros?" + q.Encode()
}
