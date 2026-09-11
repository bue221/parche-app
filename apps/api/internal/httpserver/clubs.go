package httpserver

import (
	"net/http"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/events"
	"github.com/parche-app/backend/internal/geo"
	"github.com/parche-app/backend/internal/venues"
)

const clubUpcomingLimit = 8

func registerClubRoutes(mux *http.ServeMux, routes Routes) {
	access := routes.Access
	if access == nil {
		access = RejectAccess{}
	}
	h := clubHandler{venues: routes.Venues, catalog: routes.Catalog, access: access}
	mux.HandleFunc("GET /v1/clubs", h.listClubs)
	mux.HandleFunc("POST /v1/clubs", h.createClub)
	mux.HandleFunc("GET /v1/clubs/{id}", h.getClub)
	mux.HandleFunc("PATCH /v1/clubs/{id}", h.patchClub)
}

type clubHandler struct {
	venues  *venues.Service
	catalog *events.Service
	access  Access
}

func (h clubHandler) createClub(w http.ResponseWriter, r *http.Request) {
	if h.venues == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req createVenueBody
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Lat == nil || req.Lng == nil {
		apierr.Write(w, r, apierr.Validation, "", []apierr.Detail{
			{Field: "lat", Issue: "required"},
			{Field: "lng", Issue: "required"},
		})
		return
	}
	v, err := h.venues.CreateClub(r.Context(), p.UserID, venues.CreateInput{
		TenantID:    req.TenantID,
		Name:        req.Name,
		AddressText: req.AddressText,
		Lat:         *req.Lat,
		Lng:         *req.Lng,
		GeoJSON:     req.GeoJSON,
		Source:      req.Source,
	})
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusCreated, publicClub(v, nil))
}

func (h clubHandler) getClub(w http.ResponseWriter, r *http.Request) {
	if h.venues == nil {
		apierr.Write(w, r, apierr.NotFound, "", nil)
		return
	}
	userID, ok := h.optionalUser(w, r)
	if !ok {
		return
	}
	v, err := h.venues.GetClub(r.Context(), userID, r.PathValue("id"))
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, publicClub(v, h.upcoming(r, v.ID)))
}

func (h clubHandler) patchClub(w http.ResponseWriter, r *http.Request) {
	if h.venues == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req patchVenueBody
	if !decodeJSON(w, r, &req) {
		return
	}
	v, err := h.venues.PatchClub(r.Context(), p.UserID, r.PathValue("id"), venues.PatchInput{
		Name:        req.Name,
		AddressText: req.AddressText,
		Lat:         req.Lat,
		Lng:         req.Lng,
		GeoJSON:     req.GeoJSON,
		Listed:      req.Listed,
	})
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, publicClub(v, h.upcoming(r, v.ID)))
}

func (h clubHandler) listClubs(w http.ResponseWriter, r *http.Request) {
	page, details := ParsePage(r)
	if len(details) > 0 {
		apierr.Write(w, r, apierr.Validation, "", details)
		return
	}
	bbox, err := geo.ParseBBox(
		r.URL.Query().Get("min_lat"),
		r.URL.Query().Get("min_lng"),
		r.URL.Query().Get("max_lat"),
		r.URL.Query().Get("max_lng"),
	)
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	if h.venues == nil {
		apierr.WriteJSON(w, http.StatusOK, ListEnvelope[map[string]any]{Items: []map[string]any{}, NextCursor: nil})
		return
	}
	items, err := h.venues.ListClubs(r.Context(), venues.ListFilter{
		Q:      r.URL.Query().Get("q"),
		BBox:   bbox,
		Cursor: page.Cursor,
		Limit:  page.Limit,
	})
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	pub := make([]map[string]any, 0, len(items))
	for _, v := range items {
		pub = append(pub, publicVenue(v))
	}
	var next *string
	if len(items) == page.Limit && page.Limit > 0 {
		id := items[len(items)-1].ID
		next = &id
	}
	apierr.WriteJSON(w, http.StatusOK, map[string]any{"items": pub, "next_cursor": next})
}

func (h clubHandler) upcoming(r *http.Request, venueID string) []events.PublicItem {
	if h.catalog == nil {
		return []events.PublicItem{}
	}
	items, err := h.catalog.ListPublic(r.Context(), events.ListFilter{
		VenueID: venueID,
		Limit:   clubUpcomingLimit,
	})
	if err != nil {
		return []events.PublicItem{}
	}
	out := make([]events.PublicItem, 0, len(items))
	for _, e := range items {
		out = append(out, events.ToPublic(e))
	}
	return out
}

func (h clubHandler) optionalUser(w http.ResponseWriter, r *http.Request) (string, bool) {
	if bearerToken(r) == "" {
		return "", true
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return "", false
	}
	return p.UserID, true
}

func publicClub(v venues.Venue, upcoming []events.PublicItem) map[string]any {
	out := publicVenue(v)
	if upcoming == nil {
		upcoming = []events.PublicItem{}
	}
	out["upcoming"] = upcoming
	return out
}
