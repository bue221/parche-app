package httpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/config"
	"github.com/parche-app/backend/internal/objectstore"
	"github.com/parche-app/backend/internal/ratelimit"
)

func uploadMux(t *testing.T, store objectstore.Store, access Access, events EventWrite) http.Handler {
	t.Helper()
	return newMux(testLogger(), config.Config{CORSOrigins: []string{"http://localhost:3000"}}, ratelimit.NewMemory(), nil, nil, Routes{
		Store:  store,
		Access: access,
		Events: events,
	})
}

func TestUploadsRequiresAccess(t *testing.T) {
	dir := t.TempDir()
	store, err := objectstore.NewFS(dir)
	if err != nil {
		t.Fatal(err)
	}
	mux := uploadMux(t, store, RejectAccess{}, DenyEventWrite{})

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"avatar","content_type":"image/png","byte_size":10}`)))
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status=%d", rr.Code)
	}

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"avatar","content_type":"image/png","byte_size":10}`))
	req.Header.Set("Authorization", "Bearer not-yet-jwt")
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestUploadsRejectsBadMIMEAndSize(t *testing.T) {
	dir := t.TempDir()
	store, err := objectstore.NewFS(dir)
	if err != nil {
		t.Fatal(err)
	}
	mux := uploadMux(t, store, StaticAccess{UserID: "11111111-1111-1111-1111-111111111111"}, DenyEventWrite{})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"flyer","content_type":"image/gif","byte_size":10,"event_id":"22222222-2222-2222-2222-222222222222"}`))
	req.Header.Set("Authorization", "Bearer test")
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"avatar","content_type":"image/png","byte_size":99999999}`))
	req.Header.Set("Authorization", "Bearer test")
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)
}

func TestUploadsAvatarNotUnderEvents(t *testing.T) {
	dir := t.TempDir()
	store, err := objectstore.NewFS(dir)
	if err != nil {
		t.Fatal(err)
	}
	mux := uploadMux(t, store, StaticAccess{UserID: "11111111-1111-1111-1111-111111111111"}, DenyEventWrite{})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"avatar","content_type":"image/png","byte_size":12,"event_id":"22222222-2222-2222-2222-222222222222"}`))
	req.Header.Set("Authorization", "Bearer test")
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"avatar","content_type":"image/png","byte_size":12}`))
	req.Header.Set("Authorization", "Bearer test")
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var body uploadResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if strings.Contains(body.Key, "events/") || !strings.HasPrefix(body.Key, "users/") {
		t.Fatalf("key=%s", body.Key)
	}
	if !strings.Contains(body.Key, "/avatar/") {
		t.Fatalf("key=%s", body.Key)
	}
}

func TestUploadsFlyerForbiddenWithoutEventWrite(t *testing.T) {
	dir := t.TempDir()
	store, err := objectstore.NewFS(dir)
	if err != nil {
		t.Fatal(err)
	}
	mux := uploadMux(t, store, StaticAccess{UserID: "11111111-1111-1111-1111-111111111111"}, DenyEventWrite{})
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"flyer","content_type":"image/jpeg","byte_size":100,"event_id":"22222222-2222-2222-2222-222222222222"}`))
	req.Header.Set("Authorization", "Bearer test")
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)
}

func TestPublicMediaGet(t *testing.T) {
	dir := t.TempDir()
	store, err := objectstore.NewFS(dir)
	if err != nil {
		t.Fatal(err)
	}
	key := "t/e/flyer/a.png"
	if err := store.Put(context.Background(), key, "image/png", strings.NewReader("pngdata"), 7); err != nil {
		t.Fatal(err)
	}
	mux := uploadMux(t, store, RejectAccess{}, DenyEventWrite{})

	for _, path := range []string{"/media/" + key, "/v1/media/" + key} {
		rr := httptest.NewRecorder()
		mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, path, nil))
		if rr.Code != http.StatusOK {
			t.Fatalf("%s status=%d body=%s", path, rr.Code, rr.Body.String())
		}
		if rr.Body.String() != "pngdata" {
			t.Fatalf("%s body=%q", path, rr.Body.String())
		}
		if ct := rr.Header().Get("Content-Type"); !strings.HasPrefix(ct, "image/png") {
			t.Fatalf("%s ct=%s", path, ct)
		}
	}

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/media/t/e/audio/x.mp3", nil))
	if rr.Code != http.StatusNotFound {
		t.Fatalf("audio status=%d", rr.Code)
	}
	if cc := rr.Header().Get("Cache-Control"); cc != "no-store" {
		t.Fatalf("audio cache=%q", cc)
	}

	preview := "t/e/audio/x.preview.mp3"
	if err := store.Put(context.Background(), preview, "audio/mpeg", strings.NewReader("id3"), 3); err != nil {
		t.Fatal(err)
	}
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/media/"+preview, nil))
	if rr.Code != http.StatusOK || rr.Body.String() != "id3" {
		t.Fatalf("preview status=%d body=%q", rr.Code, rr.Body.String())
	}
	if cc := rr.Header().Get("Cache-Control"); cc != "public, max-age=600" {
		t.Fatalf("preview cache=%q", cc)
	}
}

func TestUploadsFSPutAndExists(t *testing.T) {
	dir := t.TempDir()
	store, err := objectstore.NewFS(dir)
	if err != nil {
		t.Fatal(err)
	}
	mux := uploadMux(t, store, StaticAccess{UserID: "11111111-1111-1111-1111-111111111111"}, StaticEventWrite{TenantID: "33333333-3333-3333-3333-333333333333"})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"flyer","content_type":"image/webp","byte_size":5,"event_id":"22222222-2222-2222-2222-222222222222"}`))
	req.Header.Set("Authorization", "Bearer test")
	req.Host = "api.parche.test"
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var body uploadResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(body.Key, "33333333-3333-3333-3333-333333333333/22222222-2222-2222-2222-222222222222/flyer/") {
		t.Fatalf("key=%s", body.Key)
	}
	if body.Upload.Method != http.MethodPut {
		t.Fatalf("method=%s", body.Upload.Method)
	}
	if !strings.Contains(body.Upload.URL, "http://api.parche.test/v1/uploads/direct?token=") {
		t.Fatalf("url=%s", body.Upload.URL)
	}

	putReq, err := http.NewRequest(http.MethodPut, body.Upload.URL, bytes.NewReader([]byte("hello")))
	if err != nil {
		t.Fatal(err)
	}
	putReq.Header.Set("Content-Type", body.Upload.Headers["Content-Type"])
	putRR := httptest.NewRecorder()
	mux.ServeHTTP(putRR, putReq)
	if putRR.Code != http.StatusNoContent {
		t.Fatalf("put status=%d body=%s", putRR.Code, putRR.Body.String())
	}
	ok, err := store.Exists(putReq.Context(), body.Key)
	if err != nil || !ok {
		t.Fatalf("exists=%v err=%v", ok, err)
	}
}

func TestAccessLogOmitsPresignToken(t *testing.T) {
	var captured bytes.Buffer
	log := slog.New(slog.NewJSONHandler(&captured, nil))
	dir := t.TempDir()
	store, err := objectstore.NewFS(dir)
	if err != nil {
		t.Fatal(err)
	}
	mux := newMux(log, config.Config{}, ratelimit.NewMemory(), nil, nil, Routes{
		Store:  store,
		Access: StaticAccess{UserID: "u1"},
		Events: DenyEventWrite{},
	})
	req := httptest.NewRequest(http.MethodPut, "/v1/uploads/direct?token=super-secret-presign", nil)
	mux.ServeHTTP(httptest.NewRecorder(), req)
	out := captured.String()
	if strings.Contains(out, "super-secret-presign") {
		t.Fatalf("logged presign token: %s", out)
	}
	if !strings.Contains(out, `"/v1/uploads/direct"`) {
		t.Fatalf("expected path only: %s", out)
	}
}

func assertAPICode(t *testing.T, rr *httptest.ResponseRecorder, status int, code string) {
	t.Helper()
	if rr.Code != status {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var env apierr.Body
	if err := json.Unmarshal(rr.Body.Bytes(), &env); err != nil {
		t.Fatal(err)
	}
	if env.Code != code {
		t.Fatalf("code=%s", env.Code)
	}
}
