package httpserver

import (
	"net/http"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
)

type createTenantBody struct {
	Name string `json:"name"`
}

type patchTenantBody struct {
	Name     *string `json:"name"`
	Currency *string `json:"currency"`
}

type addMemberBody struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
}

func (h authHandler) addArtist(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	if err := h.svc.AddArtistProfile(r.Context(), p.UserID); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h authHandler) createTenant(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req createTenantBody
	if !decodeJSON(w, r, &req) {
		return
	}
	t, err := h.svc.CreateTenant(r.Context(), p.UserID, auth.CreateTenantInput{Name: req.Name})
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusCreated, t)
}

func (h authHandler) getTenant(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	t, err := h.svc.GetTenant(r.Context(), p.UserID, r.PathValue("id"))
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, t)
}

func (h authHandler) patchTenant(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req patchTenantBody
	if !decodeJSON(w, r, &req) {
		return
	}
	t, err := h.svc.PatchTenant(r.Context(), p.UserID, r.PathValue("id"), auth.PatchTenantInput{
		Name:     req.Name,
		Currency: req.Currency,
	})
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, t)
}

func (h authHandler) listMembers(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	items, err := h.svc.ListMembers(r.Context(), p.UserID, r.PathValue("id"))
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h authHandler) addMember(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req addMemberBody
	if !decodeJSON(w, r, &req) {
		return
	}
	member, err := h.svc.AddMember(r.Context(), p.UserID, r.PathValue("id"), auth.AddMemberInput{
		UserID: req.UserID,
		Email:  req.Email,
	})
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusCreated, member)
}

func (h authHandler) removeMember(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	if err := h.svc.RemoveMember(r.Context(), p.UserID, r.PathValue("id"), r.PathValue("userId")); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
