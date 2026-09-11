package httpserver

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/media"
	"github.com/parche-app/backend/internal/objectstore"
)

const presignTTL = 5 * time.Minute

type uploadRequest struct {
	Kind        string  `json:"kind"`
	ContentType string  `json:"content_type"`
	ByteSize    int64   `json:"byte_size"`
	EventID     *string `json:"event_id"`
}

type uploadResponse struct {
	Key    string              `json:"key"`
	Upload objectstore.Presign `json:"upload"`
}

func registerUploadRoutes(mux *http.ServeMux, routes Routes) {
	if routes.Store == nil {
		return
	}
	access := routes.Access
	if access == nil {
		access = RejectAccess{}
	}
	events := routes.Events
	if events == nil {
		events = DenyEventWrite{}
	}
	h := uploadHandler{store: routes.Store, access: access, events: events, media: routes.Media}
	mux.HandleFunc("POST /v1/uploads", h.create)
	mux.HandleFunc("PUT /v1/uploads/direct", h.directPut)
	mux.HandleFunc("GET /v1/uploads/direct", h.directGet)
}

type uploadHandler struct {
	store  objectstore.Store
	access Access
	events EventWrite
	media  *media.Service
}

func (h uploadHandler) create(w http.ResponseWriter, r *http.Request) {
	principal, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	r = r.WithContext(WithUserID(r.Context(), principal.UserID))

	var req uploadRequest
	dec := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		apierr.Write(w, r, apierr.Validation, "", []apierr.Detail{{Field: "body", Issue: "json"}})
		return
	}

	kind := strings.TrimSpace(req.Kind)
	contentType := strings.TrimSpace(req.ContentType)
	if err := objectstore.ValidateUpload(kind, contentType, req.ByteSize); err != nil {
		field := err.Error()
		apierr.Write(w, r, apierr.Validation, "", []apierr.Detail{{Field: field, Issue: "invalid"}})
		return
	}

	eventID := ""
	if req.EventID != nil {
		eventID = strings.TrimSpace(*req.EventID)
	}

	var key string
	switch kind {
	case objectstore.KindAvatar:
		if eventID != "" {
			apierr.Write(w, r, apierr.Validation, "", []apierr.Detail{{Field: "event_id", Issue: "must_be_omitted"}})
			return
		}
		key, err = objectstore.BuildKey(kind, "", "", principal.UserID, contentType)
	default:
		if eventID == "" {
			apierr.Write(w, r, apierr.Validation, "", []apierr.Detail{{Field: "event_id", Issue: "required"}})
			return
		}
		if _, parseErr := uuid.Parse(eventID); parseErr != nil {
			apierr.Write(w, r, apierr.Validation, "", []apierr.Detail{{Field: "event_id", Issue: "uuid"}})
			return
		}
		tenantID, authErr := h.events.Authorize(r.Context(), principal.UserID, eventID)
		if authErr != nil {
			apierr.Write(w, r, apierr.Forbidden, "", nil)
			return
		}
		key, err = objectstore.BuildKey(kind, tenantID, eventID, principal.UserID, contentType)
	}
	if err != nil {
		apierr.Write(w, r, apierr.Validation, "", []apierr.Detail{{Field: "kind", Issue: "invalid"}})
		return
	}

	grant, err := h.store.PutPresign(r.Context(), key, contentType, req.ByteSize, presignTTL)
	if err != nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	if h.media != nil {
		intent := media.Intent{
			Key:         key,
			UserID:      principal.UserID,
			Kind:        kind,
			ContentType: contentType,
			ByteSize:    req.ByteSize,
			ExpiresAt:   grant.ExpiresAt.Add(10 * time.Minute),
		}
		if kind != objectstore.KindAvatar {
			intent.EventID = eventID
		}
		if err := h.media.SaveIntent(r.Context(), intent); err != nil {
			apierr.Write(w, r, apierr.Internal, "", nil)
			return
		}
	}
	grant.URL = absoluteUploadURL(r, grant.URL)
	apierr.WriteJSON(w, http.StatusOK, uploadResponse{Key: key, Upload: grant})
}

func (h uploadHandler) directPut(w http.ResponseWriter, r *http.Request) {
	direct, ok := h.store.(objectstore.DirectStore)
	if !ok {
		apierr.Write(w, r, apierr.NotFound, "", nil)
		return
	}
	token := r.URL.Query().Get("token")
	ct := r.Header.Get("Content-Type")
	if i := strings.Index(ct, ";"); i >= 0 {
		ct = strings.TrimSpace(ct[:i])
	}
	err := direct.ConsumePut(r.Context(), token, ct, r.Body, r.ContentLength)
	if err != nil {
		writeDirectError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h uploadHandler) directGet(w http.ResponseWriter, r *http.Request) {
	direct, ok := h.store.(objectstore.DirectStore)
	if !ok {
		apierr.Write(w, r, apierr.NotFound, "", nil)
		return
	}
	body, ct, err := direct.OpenGet(r.Context(), r.URL.Query().Get("token"))
	if err != nil {
		writeDirectError(w, r, err)
		return
	}
	defer body.Close()
	if ct != "" {
		w.Header().Set("Content-Type", ct)
	}
	w.Header().Set("Content-Disposition", "inline")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, body)
}

func writeDirectError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, objectstore.ErrPresignExpired):
		apierr.Write(w, r, apierr.Gone, "", nil)
	case errors.Is(err, objectstore.ErrContentTypeMismatch):
		apierr.Write(w, r, apierr.Validation, "", []apierr.Detail{{Field: "content_type", Issue: "mismatch"}})
	case errors.Is(err, objectstore.ErrTooLarge):
		apierr.Write(w, r, apierr.Validation, "", []apierr.Detail{{Field: "byte_size", Issue: "max"}})
	case errors.Is(err, objectstore.ErrPresignToken):
		apierr.Write(w, r, apierr.NotFound, "", nil)
	default:
		apierr.Write(w, r, apierr.Internal, "", nil)
	}
}

func absoluteUploadURL(r *http.Request, raw string) string {
	if raw == "" || strings.Contains(raw, "://") {
		return raw
	}
	if !strings.HasPrefix(raw, "/") {
		return raw
	}
	proto := "http"
	if xf := r.Header.Get("X-Forwarded-Proto"); xf != "" {
		proto = xf
	} else if r.TLS != nil {
		proto = "https"
	}
	host := r.Host
	if host == "" {
		host = r.URL.Host
	}
	return proto + "://" + host + raw
}
