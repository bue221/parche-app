package httpserver

import (
	"net/http"
	"time"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/artists"
	"github.com/parche-app/backend/internal/events"
	"github.com/parche-app/backend/internal/media"
)

type createArtistBody struct {
	Name     string        `json:"name"`
	Bio      string        `json:"bio"`
	Links    artists.Links `json:"links"`
	TenantID string        `json:"tenant_id"`
}

type patchArtistBody struct {
	Name  *string        `json:"name"`
	Bio   *string        `json:"bio"`
	Links *artists.Links `json:"links"`
}

type lineupBody struct {
	ArtistID     string     `json:"artist_id"`
	BillingOrder int        `json:"billing_order"`
	StartsAt     *time.Time `json:"starts_at"`
}

func registerArtistRoutes(mux *http.ServeMux, routes Routes) {
	if routes.Artists == nil {
		return
	}
	access := routes.Access
	if access == nil {
		access = RejectAccess{}
	}
	h := artistHandler{svc: routes.Artists, events: routes.Events, media: routes.Media, access: access}
	mux.HandleFunc("POST /v1/artists", h.create)
	mux.HandleFunc("GET /v1/artists/{id}", h.get)
	mux.HandleFunc("PATCH /v1/artists/{id}", h.patch)
	mux.HandleFunc("GET /v1/artists/{id}/events", h.listEvents)
	mux.HandleFunc("POST /v1/artists/{id}/assets", h.confirmAsset)
	mux.HandleFunc("POST /v1/events/{id}/artists", h.addLineup)
	mux.HandleFunc("DELETE /v1/events/{id}/artists/{artistId}", h.removeLineup)
}

type artistHandler struct {
	svc    *artists.Service
	events EventWrite
	media  *media.Service
	access Access
}

func (h artistHandler) create(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req createArtistBody
	if !decodeJSON(w, r, &req) {
		return
	}
	a, err := h.svc.Create(r.Context(), p.UserID, artists.CreateInput{
		Name:     req.Name,
		Bio:      req.Bio,
		Links:    req.Links,
		TenantID: req.TenantID,
	})
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusCreated, publicArtist(r, a))
}

func (h artistHandler) get(w http.ResponseWriter, r *http.Request) {
	a, err := h.svc.Get(r.Context(), r.PathValue("id"))
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, publicArtist(r, a))
}

func (h artistHandler) patch(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req patchArtistBody
	if !decodeJSON(w, r, &req) {
		return
	}
	a, err := h.svc.Patch(r.Context(), p.UserID, r.PathValue("id"), artists.PatchInput{
		Name:  req.Name,
		Bio:   req.Bio,
		Links: req.Links,
	})
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, publicArtist(r, a))
}

func (h artistHandler) listEvents(w http.ResponseWriter, r *http.Request) {
	page, details := ParsePage(r)
	if len(details) > 0 {
		apierr.Write(w, r, apierr.Validation, "", details)
		return
	}
	items, err := h.svc.ListEvents(r.Context(), r.PathValue("id"), artists.EventFilter{
		When:   r.URL.Query().Get("when"),
		Cursor: page.Cursor,
		Limit:  page.Limit,
	})
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	pub := make([]events.PublicItem, 0, len(items))
	for _, e := range items {
		item := events.ToPublic(e)
		if item.Flyer != nil {
			cp := *item.Flyer
			cp.PublicURL = absoluteUploadURL(r, cp.PublicURL)
			cp.ThumbURL = absoluteUploadURL(r, cp.ThumbURL)
			item.Flyer = &cp
		}
		pub = append(pub, item)
	}
	apierr.WriteJSON(w, http.StatusOK, ListEnvelope[events.PublicItem]{Items: pub, NextCursor: events.NextCursor(items, page.Limit)})
}

func (h artistHandler) confirmAsset(w http.ResponseWriter, r *http.Request) {
	if h.media == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req confirmAssetBody
	if !decodeJSON(w, r, &req) {
		return
	}
	artistID := r.PathValue("id")
	tenantID, err := h.svc.Authorize(r.Context(), p.UserID, artistID)
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	view, err := h.media.ConfirmArtist(r.Context(), media.ConfirmInput{
		UserID:   p.UserID,
		TenantID: tenantID,
		ArtistID: artistID,
		Key:      req.Key,
		Kind:     req.Kind,
	})
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	view.PublicURL = absoluteUploadURL(r, view.PublicURL)
	view.ThumbURL = absoluteUploadURL(r, view.ThumbURL)
	apierr.WriteJSON(w, http.StatusCreated, view)
}

func (h artistHandler) addLineup(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req lineupBody
	if !decodeJSON(w, r, &req) {
		return
	}
	if _, err := h.events.Authorize(r.Context(), p.UserID, r.PathValue("id")); err != nil {
		writeEventErr(w, r, err)
		return
	}
	if err := h.svc.AddLineup(r.Context(), r.PathValue("id"), artists.LineupInput{
		ArtistID:     req.ArtistID,
		BillingOrder: req.BillingOrder,
		StartsAt:     req.StartsAt,
	}); err != nil {
		writeEventErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h artistHandler) removeLineup(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	if _, err := h.events.Authorize(r.Context(), p.UserID, r.PathValue("id")); err != nil {
		writeEventErr(w, r, err)
		return
	}
	if err := h.svc.RemoveLineup(r.Context(), r.PathValue("id"), r.PathValue("artistId")); err != nil {
		writeEventErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func publicArtist(r *http.Request, a artists.Artist) map[string]any {
	upcoming := a.Upcoming
	if upcoming == nil {
		upcoming = []events.PublicItem{}
	}
	out := map[string]any{
		"id":         a.ID,
		"name":       a.Name,
		"bio":        a.Bio,
		"links":      a.Links,
		"created_at": a.CreatedAt,
		"updated_at": a.UpdatedAt,
		"upcoming":   upcoming,
	}
	if a.UserID != "" {
		out["user_id"] = a.UserID
	}
	if a.TenantID != "" {
		out["tenant_id"] = a.TenantID
	}
	if a.AvatarAssetID != "" {
		out["avatar_asset_id"] = a.AvatarAssetID
	}
	if a.Avatar != nil {
		img := *a.Avatar
		img.PublicURL = absoluteUploadURL(r, img.PublicURL)
		img.ThumbURL = absoluteUploadURL(r, img.ThumbURL)
		out["avatar"] = img
	}
	return out
}
