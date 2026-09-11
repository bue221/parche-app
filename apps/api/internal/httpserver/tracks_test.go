package httpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/media"
)

func TestEventAudioTracksHTTP(t *testing.T) {
	mux, catalog := testEventStack(t)
	now := time.Now().UTC().Add(24 * time.Hour)
	ends := now.Add(4 * time.Hour)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"audio@example.com","password":"correct-horse","display_name":"A","profile":"promoter"}`)))
	var promoter sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &promoter)

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var me auth.Me
	_ = json.Unmarshal(rr.Body.Bytes(), &me)
	tid := me.Tenants[0].ID

	body := `{"tenant_id":"` + tid + `","title":"Sets","starts_at":"` + now.Format(time.RFC3339) + `","ends_at":"` + ends.Format(time.RFC3339) + `","pin":{"name":"Video Norte","lat":4.75,"lng":-74.05}}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var created map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &created)
	id, _ := created["id"].(string)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/assets", strings.NewReader(`{"key":"`+tid+`/`+id+`/audio/nope.wav","kind":"audio"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	a1 := confirmEventAudio(t, mux, promoter.AccessToken, id)
	a2 := confirmEventAudio(t, mux, promoter.AccessToken, id)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/v1/events/"+id+"/tracks", strings.NewReader(`{"tracks":[{"asset_id":"`+a2.ID+`","title":"Second","position":1},{"asset_id":"`+a1.ID+`","title":"First","position":0}]}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("put tracks=%d %s", rr.Code, rr.Body.String())
	}
	if strings.Contains(rr.Body.String(), `"master_url"`) || strings.Contains(rr.Body.String(), `"public_url"`) {
		t.Fatalf("tracks must not expose master/public urls: %s", rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/events/"+id, nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	req.Host = "api.parche.test"
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("detail=%d %s", rr.Code, rr.Body.String())
	}
	raw := rr.Body.String()
	if strings.Contains(raw, `"master_url"`) {
		t.Fatal("public detail leaked master_url")
	}
	if !strings.Contains(raw, `"title":"First"`) || !strings.Contains(raw, `"title":"Second"`) {
		t.Fatalf("titles missing: %s", raw)
	}
	firstPos := strings.Index(raw, `"title":"First"`)
	secondPos := strings.Index(raw, `"title":"Second"`)
	if firstPos < 0 || secondPos < 0 || firstPos > secondPos {
		t.Fatalf("PUT order not stable by position: %s", raw)
	}
	if !strings.Contains(raw, `"preview_url"`) || !strings.Contains(raw, "/v1/uploads/direct") {
		t.Fatalf("expected signed preview: %s", raw)
	}
	if strings.Contains(raw, "/media/") && strings.Contains(raw, "/audio/") {
		t.Fatalf("master must not use public media URL: %s", raw)
	}

	var detail map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &detail)
	tracks, _ := detail["tracks"].([]any)
	if len(tracks) != 2 {
		t.Fatalf("tracks=%d", len(tracks))
	}
	first, _ := tracks[0].(map[string]any)
	trackID, _ := first["id"].(string)
	dur, _ := first["duration_ms"].(float64)
	if dur > 45000 {
		t.Fatalf("preview duration_ms=%v", dur)
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events/"+id+"/tracks/"+trackID+"/master", nil))
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)

	eleven := `{"tracks":[`
	for i := 0; i < 11; i++ {
		if i > 0 {
			eleven += ","
		}
		eleven += `{"asset_id":"00000000-0000-4000-8000-0000000000` + strconv.Itoa(10+i) + `","title":"x","position":` + strconv.Itoa(i) + `}`
	}
	eleven += `]}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/v1/events/"+id+"/tracks", strings.NewReader(eleven))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	bodyB := `{"tenant_id":"` + tid + `","title":"Other","starts_at":"` + now.Format(time.RFC3339) + `","ends_at":"` + ends.Format(time.RFC3339) + `","pin":{"name":"Video Norte","lat":4.76,"lng":-74.05}}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(bodyB))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var createdB map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &createdB)
	idB, _ := createdB["id"].(string)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/v1/events/"+idB+"/tracks", strings.NewReader(`{"tracks":[{"asset_id":"`+a1.ID+`","title":"Stolen","position":0}]}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	attachFlyer(t, mux, promoter.AccessToken, id)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/submit", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("submit=%d %s", rr.Code, rr.Body.String())
	}
	if _, err := catalog.Publish(t.Context(), id); err != nil {
		t.Fatal(err)
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"fan@example.com","password":"correct-horse","display_name":"Fan","profile":"attendee"}`)))
	var fan sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &fan)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/events/"+id+"/tracks/"+trackID+"/master", nil)
	req.Header.Set("Authorization", "Bearer "+fan.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/events/"+id+"/tracks/"+trackID+"/master", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	req.Host = "api.parche.test"
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("master=%d %s", rr.Code, rr.Body.String())
	}
	var grant media.MasterURL
	if err := json.Unmarshal(rr.Body.Bytes(), &grant); err != nil {
		t.Fatal(err)
	}
	if grant.URL == "" || strings.Contains(grant.URL, "/media/") {
		t.Fatalf("master url must be signed, got %q", grant.URL)
	}
	if !strings.Contains(grant.URL, "/v1/uploads/direct") {
		t.Fatalf("expected fs presign, got %q", grant.URL)
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events/"+id, nil))
	if rr.Code != http.StatusOK || strings.Contains(rr.Body.String(), `"master_url"`) {
		t.Fatalf("public detail=%d %s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"preview_url"`) {
		t.Fatal("public detail missing preview")
	}
}

func TestEventAudioTranscodeFailedOmitsPreview(t *testing.T) {
	mux, catalog := testEventStack(t)
	catalog.Media.(*media.Service).PreviewAudio = func(_ context.Context, _ []byte) (media.PreviewResult, error) {
		return media.PreviewResult{}, errForbidden
	}
	now := time.Now().UTC().Add(24 * time.Hour)
	ends := now.Add(4 * time.Hour)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"fail-audio@example.com","password":"correct-horse","display_name":"A","profile":"promoter"}`)))
	var promoter sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &promoter)

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var me auth.Me
	_ = json.Unmarshal(rr.Body.Bytes(), &me)

	body := `{"tenant_id":"` + me.Tenants[0].ID + `","title":"Failset","starts_at":"` + now.Format(time.RFC3339) + `","ends_at":"` + ends.Format(time.RFC3339) + `","pin":{"name":"Video Norte","lat":4.75,"lng":-74.05}}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var created map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &created)
	id, _ := created["id"].(string)

	a := confirmEventAudio(t, mux, promoter.AccessToken, id)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/v1/events/"+id+"/tracks", strings.NewReader(`{"tracks":[{"asset_id":"`+a.ID+`","title":"Still titled","position":0}]}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("put=%d %s", rr.Code, rr.Body.String())
	}
	if strings.Contains(rr.Body.String(), `"preview_url"`) {
		t.Fatalf("failed transcode must omit preview_url: %s", rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"title":"Still titled"`) {
		t.Fatalf("title missing: %s", rr.Body.String())
	}
}

func confirmEventAudio(t *testing.T, mux http.Handler, accessToken, eventID string) media.AudioView {
	t.Helper()
	raw := []byte("RIFF....WAVEfmt ")
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"audio","content_type":"audio/wav","byte_size":`+strconv.Itoa(len(raw))+`,"event_id":"`+eventID+`"}`))
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Host = "api.parche.test"
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("uploads audio=%d %s", rr.Code, rr.Body.String())
	}
	var up uploadResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &up); err != nil {
		t.Fatal(err)
	}
	putReq, err := http.NewRequest(http.MethodPut, up.Upload.URL, bytes.NewReader(raw))
	if err != nil {
		t.Fatal(err)
	}
	putReq.Header.Set("Content-Type", "audio/wav")
	putRR := httptest.NewRecorder()
	mux.ServeHTTP(putRR, putReq)
	if putRR.Code != http.StatusNoContent {
		t.Fatalf("put audio=%d %s", putRR.Code, putRR.Body.String())
	}
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+eventID+"/audio", strings.NewReader(`{"key":"`+up.Key+`"}`))
	req.Header.Set("Authorization", "Bearer "+accessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("confirm audio=%d %s", rr.Code, rr.Body.String())
	}
	if strings.Contains(rr.Body.String(), `"public_url"`) {
		t.Fatalf("audio confirm must not return public_url: %s", rr.Body.String())
	}
	var view media.AudioView
	if err := json.Unmarshal(rr.Body.Bytes(), &view); err != nil {
		t.Fatal(err)
	}
	if view.ID == "" || view.Kind != "audio" {
		t.Fatalf("audio view=%+v", view)
	}
	return view
}
