package httpserver

import (
	"net/http"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/media"
)

type confirmAssetBody struct {
	Key  string `json:"key"`
	Kind string `json:"kind"`
}

func registerAssetRoutes(mux *http.ServeMux, routes Routes) {
	if routes.Media == nil || routes.Catalog == nil {
		return
	}
	access := routes.Access
	if access == nil {
		access = RejectAccess{}
	}
	h := assetHandler{media: routes.Media, events: routes.Catalog, access: access}
	mux.HandleFunc("POST /v1/events/{id}/assets", h.create)
	mux.HandleFunc("DELETE /v1/events/{id}/assets/{assetId}", h.delete)
}

type assetHandler struct {
	media  *media.Service
	events EventWrite
	access Access
}

func (h assetHandler) create(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req confirmAssetBody
	if !decodeJSON(w, r, &req) {
		return
	}
	eventID := r.PathValue("id")
	tenantID, err := h.events.Authorize(r.Context(), p.UserID, eventID)
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	view, err := h.media.Confirm(r.Context(), media.ConfirmInput{
		UserID:   p.UserID,
		TenantID: tenantID,
		EventID:  eventID,
		Key:      req.Key,
		Kind:     req.Kind,
	})
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusCreated, view)
}

func (h assetHandler) delete(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	eventID := r.PathValue("id")
	if _, err := h.events.Authorize(r.Context(), p.UserID, eventID); err != nil {
		writeEventErr(w, r, err)
		return
	}
	if err := h.media.Delete(r.Context(), p.UserID, eventID, r.PathValue("assetId")); err != nil {
		writeEventErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
