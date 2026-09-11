package httpserver

import (
	"net/http"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/events"
)

type putTicketTypesBody struct {
	Items []events.TicketTypeInput `json:"items"`
}

func (h eventHandler) listTicketTypes(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.NotFound, "", nil)
		return
	}
	userID, ok := h.optionalUser(w, r)
	if !ok {
		return
	}
	items, err := h.svc.ListTicketTypes(r.Context(), userID, r.PathValue("id"))
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	if items == nil {
		items = []events.TicketType{}
	}
	apierr.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h eventHandler) putTicketTypes(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req putTicketTypesBody
	if !decodeJSON(w, r, &req) {
		return
	}
	items := req.Items
	if items == nil {
		items = []events.TicketTypeInput{}
	}
	out, err := h.svc.PutTicketTypes(r.Context(), p.UserID, r.PathValue("id"), items)
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	if out == nil {
		out = []events.TicketType{}
	}
	apierr.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}
