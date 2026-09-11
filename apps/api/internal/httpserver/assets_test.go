package httpserver

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/events"
)

func TestEventImageMediaHTTP(t *testing.T) {
	mux, catalog := testEventStack(t)
	now := time.Now().UTC().Add(24 * time.Hour)
	ends := now.Add(4 * time.Hour)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"p@example.com","password":"correct-horse","display_name":"Pez","profile":"promoter"}`)))
	var promoter sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &promoter)

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var me auth.Me
	_ = json.Unmarshal(rr.Body.Bytes(), &me)
	tid := me.Tenants[0].ID

	body := `{"tenant_id":"` + tid + `","title":"Norte","starts_at":"` + now.Format(time.RFC3339) + `","ends_at":"` + ends.Format(time.RFC3339) + `","pin":{"name":"Video Norte","lat":4.75,"lng":-74.05}}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("create=%d %s", rr.Code, rr.Body.String())
	}
	var created map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &created)
	id, _ := created["id"].(string)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/assets", strings.NewReader(`{"key":"`+tid+`/`+id+`/flyer/nope.webp","kind":"audio"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/assets", strings.NewReader(`{"key":"`+tid+`/`+id+`/flyer/nope.webp","kind":"flyer"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	png := tinyPNG(t)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"flyer","content_type":"image/png","byte_size":`+strconv.Itoa(len(png))+`,"event_id":"`+id+`"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	req.Host = "api.parche.test"
	mux.ServeHTTP(rr, req)
	var up uploadResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &up)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/assets", strings.NewReader(`{"key":"`+up.Key+`","kind":"flyer"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusNotFound, apierr.NotFound)

	putReq, err := http.NewRequest(http.MethodPut, up.Upload.URL, bytes.NewReader(png))
	if err != nil {
		t.Fatal(err)
	}
	putReq.Header.Set("Content-Type", "image/png")
	mux.ServeHTTP(httptest.NewRecorder(), putReq)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/assets", strings.NewReader(`{"key":"`+up.Key+`","kind":"flyer"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("confirm=%d %s", rr.Code, rr.Body.String())
	}
	var flyer events.Image
	if err := json.Unmarshal(rr.Body.Bytes(), &flyer); err != nil {
		t.Fatal(err)
	}
	if flyer.PublicURL == "" || flyer.Kind != "flyer" || flyer.ThumbURL == "" {
		t.Fatalf("flyer=%+v", flyer)
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/events/"+id, nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"public_url"`) {
		t.Fatalf("detail flyer=%d %s", rr.Code, rr.Body.String())
	}

	gal := tinyPNG(t)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"gallery","content_type":"image/png","byte_size":`+strconv.Itoa(len(gal))+`,"event_id":"`+id+`"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	req.Host = "api.parche.test"
	mux.ServeHTTP(rr, req)
	var galUp uploadResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &galUp)
	putReq, _ = http.NewRequest(http.MethodPut, galUp.Upload.URL, bytes.NewReader(gal))
	putReq.Header.Set("Content-Type", "image/png")
	mux.ServeHTTP(httptest.NewRecorder(), putReq)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/assets", strings.NewReader(`{"key":"`+galUp.Key+`","kind":"gallery"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("gallery confirm=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/submit", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("submit=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodDelete, "/v1/events/"+id+"/assets/"+flyer.ID, nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusConflict, apierr.Conflict)

	if _, err := catalog.Publish(t.Context(), id); err != nil {
		t.Fatal(err)
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events/"+id, nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"kind":"flyer"`) {
		t.Fatalf("public flyer=%d %s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"gallery"`) {
		t.Fatal("expected gallery")
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events", nil))
	if !strings.Contains(rr.Body.String(), `"public_url"`) {
		t.Fatalf("list flyer=%s", rr.Body.String())
	}

	// Prefix for another tenant/event is forbidden even with an intent for this event.
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/assets", strings.NewReader(`{"key":"00000000-0000-4000-8000-000000000099/`+id+`/flyer/x.webp","kind":"flyer"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)
}

func TestEventMediaFailedImageBlocksSubmit(t *testing.T) {
	mux, _ := testEventStack(t)
	now := time.Now().UTC().Add(24 * time.Hour)
	ends := now.Add(4 * time.Hour)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"q@example.com","password":"correct-horse","display_name":"Q","profile":"promoter"}`)))
	var promoter sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &promoter)

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var me auth.Me
	_ = json.Unmarshal(rr.Body.Bytes(), &me)

	body := `{"tenant_id":"` + me.Tenants[0].ID + `","title":"Bad","starts_at":"` + now.Format(time.RFC3339) + `","ends_at":"` + ends.Format(time.RFC3339) + `","pin":{"name":"Video","lat":4.75,"lng":-74.05}}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var created map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &created)
	id, _ := created["id"].(string)

	garbage := []byte("not-an-image")
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"flyer","content_type":"image/jpeg","byte_size":`+strconv.Itoa(len(garbage))+`,"event_id":"`+id+`"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	req.Host = "api.parche.test"
	mux.ServeHTTP(rr, req)
	var up uploadResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &up)
	putReq, _ := http.NewRequest(http.MethodPut, up.Upload.URL, bytes.NewReader(garbage))
	putReq.Header.Set("Content-Type", "image/jpeg")
	mux.ServeHTTP(httptest.NewRecorder(), putReq)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/assets", strings.NewReader(`{"key":"`+up.Key+`","kind":"flyer"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("confirm garbage=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/submit", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)
}
