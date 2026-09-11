package httpserver

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/events"
	"github.com/parche-app/backend/internal/geo"
)

type createEventBody struct {
	TenantID    string        `json:"tenant_id"`
	Title       string        `json:"title"`
	Description string        `json:"description"`
	StartsAt    time.Time     `json:"starts_at"`
	EndsAt      time.Time     `json:"ends_at"`
	VenueID     string        `json:"venue_id"`
	Pin         *eventPinBody `json:"pin"`
	Genres      []string      `json:"genres"`
	AgePolicy   string        `json:"age_policy"`
}

type eventPinBody struct {
	Name        string          `json:"name"`
	AddressText string          `json:"address_text"`
	Lat         *float64        `json:"lat"`
	Lng         *float64        `json:"lng"`
	GeoJSON     json.RawMessage `json:"geojson"`
}

type patchEventBody struct {
	Title       *string       `json:"title"`
	Description *string       `json:"description"`
	StartsAt    *time.Time    `json:"starts_at"`
	EndsAt      *time.Time    `json:"ends_at"`
	VenueID     *string       `json:"venue_id"`
	Pin         *eventPinBody `json:"pin"`
	Genres      *[]string     `json:"genres"`
	AgePolicy   *string       `json:"age_policy"`
}

func registerEventRoutes(mux *http.ServeMux, routes Routes) {
	access := routes.Access
	if access == nil {
		access = RejectAccess{}
	}
	h := eventHandler{svc: routes.Catalog, access: access}
	mux.HandleFunc("GET /v1/events", h.listEvents)
	mux.HandleFunc("POST /v1/events", h.createEvent)
	mux.HandleFunc("GET /v1/events/{id}", h.getEvent)
	mux.HandleFunc("PATCH /v1/events/{id}", h.patchEvent)
	mux.HandleFunc("POST /v1/events/{id}/submit", h.submitEvent)
	mux.HandleFunc("POST /v1/events/{id}/cancel", h.cancelEvent)
	mux.HandleFunc("GET /v1/events/{id}/members", h.listMembers)
	mux.HandleFunc("POST /v1/events/{id}/members", h.inviteMember)
	mux.HandleFunc("PATCH /v1/events/{id}/members/{userId}", h.patchMember)
	mux.HandleFunc("DELETE /v1/events/{id}/members/{userId}", h.revokeMember)
	mux.HandleFunc("POST /v1/events/{id}/transfer-ownership", h.transferOwnership)
	mux.HandleFunc("POST /v1/invites/{token}/accept", h.acceptInvite)
	mux.HandleFunc("GET /v1/me/memberships", h.listMemberships)
	mux.HandleFunc("GET /v1/tenants/{id}/events", h.listTenantEvents)
	mux.HandleFunc("GET /v1/events/{id}/ticket-types", h.listTicketTypes)
	mux.HandleFunc("PUT /v1/events/{id}/ticket-types", h.putTicketTypes)
	mux.HandleFunc("GET /v1/me/tickets", h.listMyTickets)
	mux.HandleFunc("POST /v1/tickets/{id}/transfer", h.transferTicket)
	mux.HandleFunc("POST /v1/tickets/claims/{token}/accept", h.acceptTicketClaim)
	mux.HandleFunc("POST /v1/events/{eventId}/check-in", h.checkIn)
	mux.HandleFunc("GET /v1/events/{eventId}/door/live", h.doorLive)
	mux.HandleFunc("GET /v1/events/{id}/metrics", h.eventMetrics)
	mux.HandleFunc("GET /v1/events/{id}/metrics/orders", h.eventMetricsOrders)
	mux.HandleFunc("GET /v1/events/{id}/metrics/export", h.eventMetricsExport)
	mux.HandleFunc("GET /v1/tenants/{id}/metrics", h.tenantMetrics)
}

type eventHandler struct {
	svc    *events.Service
	access Access
}

func (h eventHandler) createEvent(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req createEventBody
	if !decodeJSON(w, r, &req) {
		return
	}
	pin, ok := parsePin(w, r, req.Pin)
	if !ok {
		return
	}
	ev, err := h.svc.Create(r.Context(), p.UserID, events.CreateInput{
		TenantID:    req.TenantID,
		Title:       req.Title,
		Description: req.Description,
		StartsAt:    req.StartsAt,
		EndsAt:      req.EndsAt,
		VenueID:     req.VenueID,
		Pin:         pin,
		Genres:      req.Genres,
		AgePolicy:   req.AgePolicy,
	})
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusCreated, publicEventAbs(r, ev))
}

func (h eventHandler) getEvent(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.NotFound, "", nil)
		return
	}
	userID, ok := h.optionalUser(w, r)
	if !ok {
		return
	}
	ev, err := h.svc.Get(r.Context(), userID, r.PathValue("id"))
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, publicEventAbs(r, ev))
}

func (h eventHandler) patchEvent(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req patchEventBody
	if !decodeJSON(w, r, &req) {
		return
	}
	pin, ok := parsePin(w, r, req.Pin)
	if !ok {
		return
	}
	ev, err := h.svc.Patch(r.Context(), p.UserID, r.PathValue("id"), events.PatchInput{
		Title:       req.Title,
		Description: req.Description,
		StartsAt:    req.StartsAt,
		EndsAt:      req.EndsAt,
		VenueID:     req.VenueID,
		Pin:         pin,
		Genres:      req.Genres,
		AgePolicy:   req.AgePolicy,
	})
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, publicEventAbs(r, ev))
}

func (h eventHandler) submitEvent(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	if err := h.svc.Submit(r.Context(), p.UserID, r.PathValue("id")); err != nil {
		writeEventErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h eventHandler) cancelEvent(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	if err := h.svc.Cancel(r.Context(), p.UserID, r.PathValue("id")); err != nil {
		writeEventErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h eventHandler) listTenantEvents(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	page, details := ParsePage(r)
	if len(details) > 0 {
		apierr.Write(w, r, apierr.Validation, "", details)
		return
	}
	items, err := h.svc.ListTenant(r.Context(), p.UserID, r.PathValue("id"), events.ListFilter{
		Cursor: page.Cursor,
		Limit:  page.Limit,
	})
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	pub := make([]map[string]any, 0, len(items))
	for _, e := range items {
		pub = append(pub, publicEventAbs(r, e))
	}
	apierr.WriteJSON(w, http.StatusOK, ListEnvelope[map[string]any]{Items: pub, NextCursor: events.NextCursor(items, page.Limit)})
}

func (h eventHandler) listEvents(w http.ResponseWriter, r *http.Request) {
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
		writeEventErr(w, r, err)
		return
	}
	search, err := events.ParseSearch(r.URL.Query())
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	if h.svc == nil {
		apierr.WriteJSON(w, http.StatusOK, ListEnvelope[events.PublicItem]{Items: []events.PublicItem{}, NextCursor: nil})
		return
	}
	miss := func() ([]byte, error) {
		items, err := h.svc.ListPublic(r.Context(), events.ListFilter{
			BBox:     bbox,
			Cursor:   page.Cursor,
			Limit:    page.Limit,
			Q:        search.Q,
			From:     search.From,
			To:       search.To,
			Genres:   search.Genres,
			ArtistID: search.ArtistID,
		})
		if err != nil {
			return nil, err
		}
		pub := make([]events.PublicItem, 0, len(items))
		for _, e := range items {
			pub = append(pub, events.ToPublic(e))
		}
		return json.Marshal(ListEnvelope[events.PublicItem]{Items: pub, NextCursor: events.NextCursor(items, page.Limit)})
	}
	body, err := h.svc.CachedPublicJSON(r.Context(), r.URL.RawQuery, miss)
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
	if len(body) > 0 && body[len(body)-1] != '\n' {
		_, _ = w.Write([]byte("\n"))
	}
}

func (h eventHandler) optionalUser(w http.ResponseWriter, r *http.Request) (string, bool) {
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

func parsePin(w http.ResponseWriter, r *http.Request, pin *eventPinBody) (*events.PinInput, bool) {
	if pin == nil {
		return nil, true
	}
	if pin.Lat == nil || pin.Lng == nil {
		apierr.Write(w, r, apierr.Validation, "", []apierr.Detail{
			{Field: "lat", Issue: "required"},
			{Field: "lng", Issue: "required"},
		})
		return nil, false
	}
	return &events.PinInput{
		Name:        pin.Name,
		AddressText: pin.AddressText,
		Lat:         *pin.Lat,
		Lng:         *pin.Lng,
		GeoJSON:     pin.GeoJSON,
	}, true
}

func writeEventErr(w http.ResponseWriter, r *http.Request, err error) {
	var inv auth.Invalid
	if errors.As(err, &inv) {
		for _, f := range inv.Fields {
			if f.Name == "sales_window" {
				details := make([]apierr.Detail, 0, len(inv.Fields))
				for _, x := range inv.Fields {
					details = append(details, apierr.Detail{Field: x.Name, Issue: x.Issue})
				}
				apierr.Write(w, r, apierr.Validation, "La ventana de venta está cerrada", details)
				return
			}
		}
	}
	writeAuthErr(w, r, err)
}

func publicEvent(e events.Event) map[string]any {
	genres := e.Genres
	if genres == nil {
		genres = []string{}
	}
	gallery := e.Gallery
	if gallery == nil {
		gallery = []events.Image{}
	}
	tracks := e.Tracks
	if tracks == nil {
		tracks = []events.Track{}
	}
	lineup := e.Lineup
	if lineup == nil {
		lineup = []events.LineupSlot{}
	}
	out := map[string]any{
		"id":           e.ID,
		"tenant_id":    e.TenantID,
		"title":        e.Title,
		"slug":         e.Slug,
		"description":  e.Description,
		"starts_at":    e.StartsAt,
		"ends_at":      e.EndsAt,
		"venue_id":     e.VenueID,
		"status":       e.Status,
		"genres":       genres,
		"created_by":   e.CreatedBy,
		"created_at":   e.CreatedAt,
		"updated_at":   e.UpdatedAt,
		"lat":          e.Lat,
		"lng":          e.Lng,
		"address_text": e.AddressText,
		"venue_name":   e.VenueName,
		"gallery":      gallery,
		"tracks":       tracks,
		"lineup":       lineup,
	}
	if e.AgePolicy != "" {
		out["age_policy"] = e.AgePolicy
	}
	if e.FlyerAssetID != "" {
		out["flyer_asset_id"] = e.FlyerAssetID
	}
	if e.Flyer != nil {
		out["flyer"] = e.Flyer
	}
	return out
}

func publicEventAbs(r *http.Request, e events.Event) map[string]any {
	out := publicEvent(e)
	tracks, _ := out["tracks"].([]events.Track)
	for i := range tracks {
		tracks[i].PreviewURL = absoluteUploadURL(r, tracks[i].PreviewURL)
	}
	out["tracks"] = tracks
	return out
}
