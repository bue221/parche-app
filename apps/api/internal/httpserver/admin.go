package httpserver

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/parche-app/backend/internal/admin"
	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/artists"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/events"
)

type rejectBody struct {
	Reason string `json:"reason"`
}

type adminProfileBody struct {
	Profile string `json:"profile"`
	Op      string `json:"op"`
}

type broadcastBody struct {
	Template string            `json:"template"`
	Audience string            `json:"audience"`
	ArtistID string            `json:"artist_id"`
	EventID  string            `json:"event_id"`
	Vars     map[string]string `json:"vars"`
}

type optOutBody struct {
	Token string `json:"token"`
}

func registerAdminRoutes(mux *http.ServeMux, routes Routes) {
	if routes.Auth == nil {
		return
	}
	access := routes.Access
	if access == nil {
		access = RejectAccess{}
	}
	lookup := routes.Auth.Store.Profiles
	h := adminHandler{
		auth:    routes.Auth,
		catalog: routes.Catalog,
		artists: routes.Artists,
		audit:   routes.Audit,
		access:  access,
	}
	mux.HandleFunc("GET /v1/admin/events", RequireProfile(access, lookup, auth.ProfilePlatformAdmin, h.listEvents))
	mux.HandleFunc("POST /v1/admin/events/{id}/approve", RequireProfile(access, lookup, auth.ProfilePlatformAdmin, h.approve))
	mux.HandleFunc("POST /v1/admin/events/{id}/reject", RequireProfile(access, lookup, auth.ProfilePlatformAdmin, h.reject))
	mux.HandleFunc("GET /v1/admin/users", RequireProfile(access, lookup, auth.ProfilePlatformAdmin, h.listUsers))
	mux.HandleFunc("GET /v1/admin/users/{id}", RequireProfile(access, lookup, auth.ProfilePlatformAdmin, h.getUser))
	mux.HandleFunc("POST /v1/admin/users/{id}/disable", RequireProfile(access, lookup, auth.ProfilePlatformAdmin, h.disableUser))
	mux.HandleFunc("POST /v1/admin/users/{id}/enable", RequireProfile(access, lookup, auth.ProfilePlatformAdmin, h.enableUser))
	mux.HandleFunc("POST /v1/admin/users/{id}/profiles", RequireProfile(access, lookup, auth.ProfilePlatformAdmin, h.mutateProfile))
	mux.HandleFunc("GET /v1/admin/metrics", RequireProfile(access, lookup, auth.ProfilePlatformAdmin, h.metrics))
	mux.HandleFunc("POST /v1/admin/broadcasts", RequireProfile(access, lookup, auth.ProfilePlatformAdmin, h.broadcast))
	mux.HandleFunc("POST /v1/me/email/opt-out", h.optOut)
}

type adminHandler struct {
	auth    *auth.Service
	catalog *events.Service
	artists *artists.Service
	audit   admin.Auditor
	access  Access
}

func (h adminHandler) listEvents(w http.ResponseWriter, r *http.Request) {
	if h.catalog == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, err := h.catalog.ListAdmin(r.Context(), r.URL.Query().Get("status"), r.URL.Query().Get("cursor"), limit)
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, e := range items {
		out = append(out, publicEventAbs(r, e))
	}
	apierr.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h adminHandler) approve(w http.ResponseWriter, r *http.Request) {
	if h.catalog == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	id := r.PathValue("id")
	e, err := h.catalog.Approve(r.Context(), id)
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	h.record(r, "event.approve", "event", id, nil)
	apierr.WriteJSON(w, http.StatusOK, publicEventAbs(r, e))
}

func (h adminHandler) reject(w http.ResponseWriter, r *http.Request) {
	if h.catalog == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	var req rejectBody
	if !decodeJSON(w, r, &req) {
		return
	}
	id := r.PathValue("id")
	e, err := h.catalog.Reject(r.Context(), id, req.Reason)
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	h.record(r, "event.reject", "event", id, map[string]string{"reason": req.Reason})
	apierr.WriteJSON(w, http.StatusOK, publicEventAbs(r, e))
}

func (h adminHandler) listUsers(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, err := h.auth.SearchAdminUsers(r.Context(), userIDFromRequest(r), r.URL.Query().Get("q"), limit)
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h adminHandler) getUser(w http.ResponseWriter, r *http.Request) {
	out, err := h.auth.GetAdminUser(r.Context(), userIDFromRequest(r), r.PathValue("id"))
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, out)
}

func (h adminHandler) disableUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.auth.DisableUser(r.Context(), userIDFromRequest(r), id); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	h.record(r, "user.disable", "user", id, nil)
	w.WriteHeader(http.StatusNoContent)
}

func (h adminHandler) enableUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.auth.EnableUser(r.Context(), userIDFromRequest(r), id); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	h.record(r, "user.enable", "user", id, nil)
	w.WriteHeader(http.StatusNoContent)
}

func (h adminHandler) mutateProfile(w http.ResponseWriter, r *http.Request) {
	var req adminProfileBody
	if !decodeJSON(w, r, &req) {
		return
	}
	id := r.PathValue("id")
	if err := h.auth.MutateAdminProfile(r.Context(), userIDFromRequest(r), id, auth.AdminProfileInput{
		Profile: req.Profile, Op: req.Op,
	}); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	h.record(r, "user.profile", "user", id, map[string]string{"profile": req.Profile, "op": req.Op})
	w.WriteHeader(http.StatusNoContent)
}

func (h adminHandler) metrics(w http.ResponseWriter, r *http.Request) {
	users, err := h.auth.CountUsers(r.Context())
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	published, gmv := 0, 0
	if h.catalog != nil {
		published, gmv, err = h.catalog.PlatformCounts(r.Context())
		if err != nil {
			writeEventErr(w, r, err)
			return
		}
	}
	apierr.WriteJSON(w, http.StatusOK, events.PlatformMetrics{
		Users: users, EventsPublished: published, GMVCents30d: gmv,
	})
}

func (h adminHandler) broadcast(w http.ResponseWriter, r *http.Request) {
	var req broadcastBody
	if !decodeJSON(w, r, &req) {
		return
	}
	n, err := h.auth.Broadcast(r.Context(), userIDFromRequest(r), auth.BroadcastInput{
		Template: req.Template, Audience: req.Audience, ArtistID: req.ArtistID, EventID: req.EventID, Vars: req.Vars,
	}, h.artists, h.catalog)
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	h.record(r, "broadcast", "audience", req.Audience, map[string]string{"queued": strconv.Itoa(n)})
	apierr.WriteJSON(w, http.StatusAccepted, map[string]any{"queued": n})
}

func (h adminHandler) optOut(w http.ResponseWriter, r *http.Request) {
	var req optOutBody
	if r.Body != nil {
		raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		_ = r.Body.Close()
		if err == nil && len(raw) > 0 {
			_ = json.Unmarshal(raw, &req)
		}
	}
	token := strings.TrimSpace(req.Token)
	if token == "" {
		token = strings.TrimSpace(r.URL.Query().Get("token"))
	}
	if token != "" {
		if err := h.auth.OptOutEmailToken(r.Context(), token); err != nil {
			writeAuthErr(w, r, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	if err := h.auth.OptOutEmail(r.Context(), p.UserID); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h adminHandler) record(r *http.Request, action, targetType, targetID string, payload map[string]string) {
	if h.audit == nil {
		return
	}
	_ = h.audit.Append(r.Context(), admin.Entry{
		AdminID:    userIDFromRequest(r),
		Action:     action,
		TargetType: targetType,
		TargetID:   targetID,
		Payload:    payload,
	})
}
