package httpserver

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/media"
)

type patchMeBody struct {
	DisplayName *string `json:"display_name"`
	Bio         *string `json:"bio"`
	Phone       *string `json:"phone"`
}

type changeEmailBody struct {
	Email string `json:"email"`
}

type confirmEmailBody struct {
	Token string `json:"token"`
}

type confirmAvatarBody struct {
	Key  string `json:"key"`
	Kind string `json:"kind"`
}

func (h authHandler) patchMe(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req patchMeBody
	if !decodeJSON(w, r, &req) {
		return
	}
	me, err := h.svc.PatchMe(r.Context(), p.UserID, auth.PatchMeInput{
		DisplayName: req.DisplayName,
		Bio:         req.Bio,
		Phone:       req.Phone,
	})
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, h.withAvatarURL(r, me))
}

func (h authHandler) changeEmail(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req changeEmailBody
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.svc.ChangeEmail(r.Context(), p.UserID, req.Email); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h authHandler) confirmEmail(w http.ResponseWriter, r *http.Request) {
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req confirmEmailBody
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := h.svc.ConfirmEmail(r.Context(), p.UserID, req.Token); err != nil {
		writeAuthErr(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h authHandler) confirmAvatar(w http.ResponseWriter, r *http.Request) {
	if h.media == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req confirmAvatarBody
	if !decodeJSON(w, r, &req) {
		return
	}
	view, err := h.media.ConfirmUser(r.Context(), media.ConfirmInput{
		UserID: p.UserID,
		Key:    req.Key,
		Kind:   req.Kind,
	})
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	view.PublicURL = absoluteUploadURL(r, view.PublicURL)
	view.ThumbURL = absoluteUploadURL(r, view.ThumbURL)
	apierr.WriteJSON(w, http.StatusCreated, view)
}

func (h authHandler) publicUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeAuthErr(w, r, auth.ErrNotFound)
		return
	}
	prof, err := h.svc.PublicProfile(r.Context(), id)
	if err != nil {
		writeAuthErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, h.withPublicAvatarURL(r, prof))
}

func (h authHandler) withAvatarURL(r *http.Request, me auth.Me) auth.Me {
	me.AvatarURL = h.avatarURL(r, me.AvatarAssetID)
	return me
}

func (h authHandler) withPublicAvatarURL(r *http.Request, p auth.PublicProfile) auth.PublicProfile {
	p.AvatarURL = h.avatarURL(r, p.AvatarAssetID)
	return p
}

func (h authHandler) avatarURL(r *http.Request, assetID string) string {
	if assetID == "" || h.media == nil {
		return ""
	}
	img, err := h.media.Image(r.Context(), assetID)
	if err != nil || img == nil {
		return ""
	}
	return absoluteUploadURL(r, img.PublicURL)
}
