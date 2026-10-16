package httpserver

import (
	"net/http"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/events"
)

type inviteMemberBody struct {
	Email  string `json:"email"`
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

type patchMemberBody struct {
	Role string `json:"role"`
}

type transferOwnershipBody struct {
	UserID string `json:"user_id"`
}

func (h eventHandler) listMembers(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	items, err := h.svc.ListMembers(r.Context(), p.UserID, r.PathValue("id"))
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	if items == nil {
		items = []events.MemberView{}
	}
	apierr.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h eventHandler) inviteMember(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req inviteMemberBody
	if !decodeJSON(w, r, &req) {
		return
	}
	inv, err := h.svc.InviteMember(r.Context(), p.UserID, r.PathValue("id"), events.InviteInput{
		Email:  req.Email,
		UserID: req.UserID,
		Role:   req.Role,
	})
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusCreated, inv)
}

func (h eventHandler) patchMember(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req patchMemberBody
	if !decodeJSON(w, r, &req) {
		return
	}
	got, err := h.svc.PatchMember(r.Context(), p.UserID, r.PathValue("id"), r.PathValue("userId"), req.Role)
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, got)
}

func (h eventHandler) revokeMember(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	if err := h.svc.RevokeMember(r.Context(), p.UserID, r.PathValue("id"), r.PathValue("userId")); err != nil {
		writeEventErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h eventHandler) transferOwnership(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req transferOwnershipBody
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.svc.TransferOwnership(r.Context(), p.UserID, r.PathValue("id"), req.UserID); err != nil {
		writeEventErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h eventHandler) acceptInvite(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	if err := h.svc.AcceptInvite(r.Context(), p.UserID, r.PathValue("token")); err != nil {
		writeEventErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h eventHandler) listMemberships(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	items, err := h.svc.ListEventMemberships(r.Context(), p.UserID)
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	if items == nil {
		items = []auth.EventMembership{}
	}
	apierr.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h eventHandler) listInvites(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	items, err := h.svc.ListPendingInvites(r.Context(), p.UserID)
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	if items == nil {
		items = []auth.EventMembership{}
	}
	apierr.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h eventHandler) listSavedEvents(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	list, err := h.svc.ListSavedEvents(r.Context(), p.UserID)
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	pub := make([]map[string]any, 0, len(list))
	for _, e := range list {
		pub = append(pub, publicEventAbs(r, e))
	}
	apierr.WriteJSON(w, http.StatusOK, map[string]any{"items": pub})
}

func (h eventHandler) saveEvent(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	if err := h.svc.SaveEvent(r.Context(), p.UserID, r.PathValue("id")); err != nil {
		writeEventErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h eventHandler) unsaveEvent(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	if err := h.svc.UnsaveEvent(r.Context(), p.UserID, r.PathValue("id")); err != nil {
		writeEventErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
