package httpserver

import (
	"encoding/json"
	"net/http"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/geo"
	"github.com/parche-app/backend/internal/venues"
)

type createVenueBody struct {
	TenantID    string          `json:"tenant_id"`
	Name        string          `json:"name"`
	AddressText string          `json:"address_text"`
	Lat         *float64        `json:"lat"`
	Lng         *float64        `json:"lng"`
	GeoJSON     json.RawMessage `json:"geojson"`
	Source      string          `json:"source"`
	Kind        string          `json:"kind"`
}

type patchVenueBody struct {
	Name        *string          `json:"name"`
	AddressText *string          `json:"address_text"`
	Lat         *float64         `json:"lat"`
	Lng         *float64         `json:"lng"`
	GeoJSON     *json.RawMessage `json:"geojson"`
	Kind        *string          `json:"kind"`
	Listed      *bool            `json:"listed"`
}

func registerVenueRoutes(mux *http.ServeMux, routes Routes) {
	access := routes.Access
	if access == nil {
		access = RejectAccess{}
	}
	h := venueHandler{svc: routes.Venues, access: access}
	mux.HandleFunc("GET /v1/venues", h.listVenues)
	mux.HandleFunc("POST /v1/venues", h.createVenue)
	mux.HandleFunc("GET /v1/venues/{id}", h.getVenue)
	mux.HandleFunc("PATCH /v1/venues/{id}", h.patchVenue)
}

type venueHandler struct {
	svc    *venues.Service
	access Access
}

func (h venueHandler) createVenue(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
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
	v, err := h.svc.Create(r.Context(), p.UserID, venues.CreateInput{
		TenantID:    req.TenantID,
		Name:        req.Name,
		AddressText: req.AddressText,
		Lat:         *req.Lat,
		Lng:         *req.Lng,
		GeoJSON:     req.GeoJSON,
		Source:      req.Source,
		Kind:        req.Kind,
	})
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusCreated, publicVenue(v))
}

func (h venueHandler) getVenue(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.NotFound, "", nil)
		return
	}
	userID, ok := h.optionalUser(w, r)
	if !ok {
		return
	}
	v, err := h.svc.Get(r.Context(), userID, r.PathValue("id"))
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, publicVenue(v))
}

func (h venueHandler) patchVenue(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
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
	v, err := h.svc.Patch(r.Context(), p.UserID, r.PathValue("id"), venues.PatchInput{
		Name:        req.Name,
		AddressText: req.AddressText,
		Lat:         req.Lat,
		Lng:         req.Lng,
		GeoJSON:     req.GeoJSON,
		Kind:        req.Kind,
		Listed:      req.Listed,
	})
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, publicVenue(v))
}

func (h venueHandler) listVenues(w http.ResponseWriter, r *http.Request) {
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
	userID, ok := h.optionalUser(w, r)
	if !ok {
		return
	}
	if h.svc == nil {
		apierr.WriteJSON(w, http.StatusOK, ListEnvelope[map[string]any]{Items: []map[string]any{}, NextCursor: nil})
		return
	}
	items, err := h.svc.List(r.Context(), userID, venues.ListFilter{
		Q:        r.URL.Query().Get("q"),
		BBox:     bbox,
		TenantID: r.URL.Query().Get("tenant_id"),
		Cursor:   page.Cursor,
		Limit:    page.Limit,
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

func (h venueHandler) optionalUser(w http.ResponseWriter, r *http.Request) (string, bool) {
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

func publicVenue(v venues.Venue) map[string]any {
	out := map[string]any{
		"id":           v.ID,
		"tenant_id":    v.TenantID,
		"name":         v.Name,
		"address_text": v.AddressText,
		"lat":          v.Lat,
		"lng":          v.Lng,
		"source":       v.Source,
		"kind":         v.Kind,
		"listed":       v.Listed,
		"created_at":   v.CreatedAt,
	}
	if len(v.GeoJSON) > 0 {
		out["geojson"] = json.RawMessage(v.GeoJSON)
	}
	return out
}
