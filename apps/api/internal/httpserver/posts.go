package httpserver

import (
	"net/http"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/editorial"
	"github.com/parche-app/backend/internal/media"
)

type createPostBody struct {
	Slug  string `json:"slug"`
	Title string `json:"title"`
	Body  string `json:"body_md"`
}

type patchPostBody struct {
	Slug  *string `json:"slug"`
	Title *string `json:"title"`
	Body  *string `json:"body_md"`
}

func registerPostRoutes(mux *http.ServeMux, routes Routes) {
	if routes.Posts == nil {
		return
	}
	access := routes.Access
	if access == nil {
		access = RejectAccess{}
	}
	h := postHandler{svc: routes.Posts, media: routes.Media, access: access}
	mux.HandleFunc("GET /v1/posts", h.list)
	mux.HandleFunc("GET /v1/posts/{slug}", h.get)
	if routes.Auth == nil {
		return
	}
	lookup := routes.Auth.Store.Profiles
	mux.HandleFunc("POST /v1/admin/posts", RequireProfile(access, lookup, auth.ProfilePlatformAdmin, h.create))
	mux.HandleFunc("PATCH /v1/admin/posts/{id}", RequireProfile(access, lookup, auth.ProfilePlatformAdmin, h.patch))
	mux.HandleFunc("POST /v1/admin/posts/{id}/publish", RequireProfile(access, lookup, auth.ProfilePlatformAdmin, h.publish))
	mux.HandleFunc("POST /v1/admin/posts/{id}/assets", RequireProfile(access, lookup, auth.ProfilePlatformAdmin, h.confirmCover))
}

type postHandler struct {
	svc    *editorial.Service
	media  *media.Service
	access Access
}

func (h postHandler) list(w http.ResponseWriter, r *http.Request) {
	page, details := ParsePage(r)
	if len(details) > 0 {
		apierr.Write(w, r, apierr.Validation, "", details)
		return
	}
	items, err := h.svc.ListPublished(r.Context(), editorial.ListFilter{Cursor: page.Cursor, Limit: page.Limit})
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	pub := make([]map[string]any, 0, len(items))
	for _, p := range items {
		pub = append(pub, publicPost(r, p, false))
	}
	apierr.WriteJSON(w, http.StatusOK, ListEnvelope[map[string]any]{Items: pub, NextCursor: editorial.NextCursor(items, page.Limit)})
}

func (h postHandler) get(w http.ResponseWriter, r *http.Request) {
	p, err := h.svc.GetPublished(r.Context(), r.PathValue("slug"))
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, publicPost(r, p, false))
}

func (h postHandler) create(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromRequest(r)
	var req createPostBody
	if !decodeJSON(w, r, &req) {
		return
	}
	p, err := h.svc.Create(r.Context(), userID, editorial.CreateInput{
		Slug:  req.Slug,
		Title: req.Title,
		Body:  req.Body,
	})
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusCreated, publicPost(r, p, true))
}

func (h postHandler) patch(w http.ResponseWriter, r *http.Request) {
	var req patchPostBody
	if !decodeJSON(w, r, &req) {
		return
	}
	p, err := h.svc.Patch(r.Context(), r.PathValue("id"), editorial.PatchInput{
		Slug:  req.Slug,
		Title: req.Title,
		Body:  req.Body,
	})
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, publicPost(r, p, true))
}

func (h postHandler) publish(w http.ResponseWriter, r *http.Request) {
	p, err := h.svc.Publish(r.Context(), r.PathValue("id"))
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, publicPost(r, p, true))
}

func (h postHandler) confirmCover(w http.ResponseWriter, r *http.Request) {
	if h.media == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	userID := userIDFromRequest(r)
	var req confirmAssetBody
	if !decodeJSON(w, r, &req) {
		return
	}
	postID := r.PathValue("id")
	if _, err := h.svc.GetAdmin(r.Context(), postID); err != nil {
		writeEventErr(w, r, err)
		return
	}
	view, err := h.media.ConfirmPost(r.Context(), media.ConfirmInput{
		UserID: userID,
		PostID: postID,
		Key:    req.Key,
		Kind:   req.Kind,
	})
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	view.PublicURL = absoluteUploadURL(r, view.PublicURL)
	view.ThumbURL = absoluteUploadURL(r, view.ThumbURL)
	apierr.WriteJSON(w, http.StatusCreated, view)
}

func publicPost(r *http.Request, p editorial.Post, admin bool) map[string]any {
	out := map[string]any{
		"id":         p.ID,
		"slug":       p.Slug,
		"title":      p.Title,
		"body_md":    p.BodyMD,
		"body_html":  p.BodyHTML,
		"author_id":  p.AuthorID,
		"created_at": p.CreatedAt,
		"updated_at": p.UpdatedAt,
	}
	if admin {
		out["status"] = p.Status
	}
	if p.PublishedAt != nil {
		out["published_at"] = p.PublishedAt
	}
	if p.CoverAssetID != "" {
		out["cover_asset_id"] = p.CoverAssetID
	}
	if p.Cover != nil {
		img := *p.Cover
		img.PublicURL = absoluteUploadURL(r, img.PublicURL)
		img.ThumbURL = absoluteUploadURL(r, img.ThumbURL)
		out["cover"] = img
	}
	return out
}
