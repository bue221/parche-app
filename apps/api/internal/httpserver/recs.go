package httpserver

import (
	"net/http"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/events"
	"github.com/parche-app/backend/internal/recs"
)

type recEvent struct {
	events.PublicItem
	Reason string `json:"reason"`
}

type recList struct {
	Events []recEvent `json:"events"`
}

func registerRecRoutes(mux *http.ServeMux, routes Routes) {
	if routes.Recs == nil {
		return
	}
	access := routes.Access
	if access == nil {
		access = RejectAccess{}
	}
	h := recHandler{svc: routes.Recs, catalog: routes.Catalog, access: access}
	mux.HandleFunc("GET /v1/me/recommendations", h.mine)
	mux.HandleFunc("GET /v1/events/{id}/similar", h.similar)
}

type recHandler struct {
	svc     *recs.Service
	catalog *events.Service
	access  Access
}

func (h recHandler) mine(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	items, err := h.svc.ForUser(r.Context(), p.UserID)
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, recList{Events: h.hydrate(r, p.UserID, items)})
}

func (h recHandler) similar(w http.ResponseWriter, r *http.Request) {
	userID, ok := optionalRecUser(w, r, h.access)
	if !ok {
		return
	}
	items, err := h.svc.Similar(r.Context(), r.PathValue("id"))
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, recList{Events: h.hydrate(r, userID, items)})
}

func (h recHandler) hydrate(r *http.Request, userID string, items []recs.Item) []recEvent {
	out := make([]recEvent, 0, len(items))
	if h.catalog == nil {
		return out
	}
	seen := map[string]struct{}{}
	for _, it := range items {
		if _, ok := seen[it.EventID]; ok {
			continue
		}
		seen[it.EventID] = struct{}{}
		ev, err := h.catalog.Get(r.Context(), userID, it.EventID)
		if err != nil || ev.Status != events.StatusPublished {
			continue
		}
		out = append(out, recEvent{PublicItem: events.ToPublic(ev), Reason: it.Reason})
		if len(out) >= 20 {
			break
		}
	}
	return out
}

func optionalRecUser(w http.ResponseWriter, r *http.Request, access Access) (string, bool) {
	if access == nil || r.Header.Get("Authorization") == "" {
		return "", true
	}
	p, err := access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return "", false
	}
	return p.UserID, true
}
