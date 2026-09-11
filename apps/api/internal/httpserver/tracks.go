package httpserver

import (
	"net/http"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/media"
)

type putTracksBody struct {
	Tracks []media.TrackInput `json:"tracks"`
}

func registerTrackRoutes(mux *http.ServeMux, routes Routes) {
	if routes.Media == nil || routes.Catalog == nil {
		return
	}
	access := routes.Access
	if access == nil {
		access = RejectAccess{}
	}
	h := trackHandler{media: routes.Media, events: routes.Catalog, access: access}
	mux.HandleFunc("POST /v1/events/{id}/audio", h.confirm)
	mux.HandleFunc("PUT /v1/events/{id}/tracks", h.replace)
	mux.HandleFunc("GET /v1/events/{id}/tracks/{trackId}/master", h.master)
}

type trackHandler struct {
	media  *media.Service
	events EventWrite
	access Access
}

func (h trackHandler) confirm(w http.ResponseWriter, r *http.Request) {
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
	view, err := h.media.ConfirmAudio(r.Context(), media.ConfirmInput{
		UserID:   p.UserID,
		TenantID: tenantID,
		EventID:  eventID,
		Key:      req.Key,
		Kind:     media.KindAudio,
	})
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusCreated, view)
}

func (h trackHandler) replace(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req putTracksBody
	if !decodeJSON(w, r, &req) {
		return
	}
	eventID := r.PathValue("id")
	if _, err := h.events.Authorize(r.Context(), p.UserID, eventID); err != nil {
		writeEventErr(w, r, err)
		return
	}
	tracks := req.Tracks
	if tracks == nil {
		tracks = []media.TrackInput{}
	}
	list, err := h.media.ReplaceTracks(r.Context(), eventID, tracks)
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	for i := range list {
		list[i].PreviewURL = absoluteUploadURL(r, list[i].PreviewURL)
	}
	apierr.WriteJSON(w, http.StatusOK, map[string]any{"tracks": list})
}

func (h trackHandler) master(w http.ResponseWriter, r *http.Request) {
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
	grant, err := h.media.MasterURL(r.Context(), eventID, r.PathValue("trackId"))
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	grant.URL = absoluteUploadURL(r, grant.URL)
	apierr.WriteJSON(w, http.StatusOK, grant)
}
