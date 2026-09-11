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

func TestArtistsAndLineupHTTP(t *testing.T) {
	mux, catalog := testEventStack(t)
	now := time.Now().UTC().Add(24 * time.Hour)
	ends := now.Add(4 * time.Hour)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"p@example.com","password":"correct-horse","display_name":"Pez","profile":"promoter"}`)))
	var promoter sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &promoter)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"dj@example.com","password":"correct-horse","display_name":"Norte","profile":"attendee"}`)))
	var dj sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &dj)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"fan@example.com","password":"correct-horse","display_name":"Fan","profile":"attendee"}`)))
	var fan sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &fan)

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/artists", strings.NewReader(`{"name":"Fan Act"}`))
	req.Header.Set("Authorization", "Bearer "+fan.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/me/profiles/artist", nil)
	req.Header.Set("Authorization", "Bearer "+dj.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("artist profile=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/artists", strings.NewReader(`{"name":"Norte Bass","bio":"bogotá","links":{"instagram":"nortebass"}}`))
	req.Header.Set("Authorization", "Bearer "+dj.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("create artist=%d %s", rr.Code, rr.Body.String())
	}
	if strings.Contains(rr.Body.String(), "dj@example.com") || strings.Contains(rr.Body.String(), `"email"`) {
		t.Fatalf("public artist leaked email: %s", rr.Body.String())
	}
	var created map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &created)
	artistID, _ := created["id"].(string)
	if artistID == "" || created["name"] != "Norte Bass" {
		t.Fatalf("created=%v", created)
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/artists", strings.NewReader(`{"name":"Clone"}`))
	req.Header.Set("Authorization", "Bearer "+dj.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusConflict, apierr.Conflict)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/artists/"+artistID, nil))
	if rr.Code != http.StatusOK || strings.Contains(rr.Body.String(), "dj@example.com") {
		t.Fatalf("public get=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPatch, "/v1/artists/"+artistID, strings.NewReader(`{"bio":"hijack"}`))
	req.Header.Set("Authorization", "Bearer "+fan.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPatch, "/v1/artists/"+artistID, strings.NewReader(`{"bio":"live set"}`))
	req.Header.Set("Authorization", "Bearer "+dj.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), "live set") {
		t.Fatalf("owner patch=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var me auth.Me
	_ = json.Unmarshal(rr.Body.Bytes(), &me)
	tid := me.Tenants[0].ID

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/artists", strings.NewReader(`{"name":"Tenant Act","tenant_id":"`+tid+`"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("promoter act=%d %s", rr.Code, rr.Body.String())
	}
	var act map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &act)
	actID, _ := act["id"].(string)
	if actID == "" || act["tenant_id"] != tid {
		t.Fatalf("act=%v", act)
	}

	body := `{"tenant_id":"` + tid + `","title":"Norte","starts_at":"` + now.Format(time.RFC3339) + `","ends_at":"` + ends.Format(time.RFC3339) + `","pin":{"name":"Video Norte","lat":4.75,"lng":-74.05},"genres":["techno"]}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("event=%d %s", rr.Code, rr.Body.String())
	}
	var ev map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &ev)
	eventID, _ := ev["id"].(string)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+eventID+"/artists", strings.NewReader(`{"artist_id":"`+artistID+`","billing_order":2}`))
	req.Header.Set("Authorization", "Bearer "+fan.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusNotFound, apierr.NotFound)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+eventID+"/artists", strings.NewReader(`{"artist_id":"`+actID+`","billing_order":1}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("lineup act=%d %s", rr.Code, rr.Body.String())
	}
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+eventID+"/artists", strings.NewReader(`{"artist_id":"`+artistID+`","billing_order":0}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("lineup dj=%d %s", rr.Code, rr.Body.String())
	}
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+eventID+"/artists", strings.NewReader(`{"artist_id":"`+artistID+`","billing_order":9}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusConflict, apierr.Conflict)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/events/"+eventID, nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("event detail=%d %s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"lineup"`) || !strings.Contains(rr.Body.String(), "Norte Bass") || !strings.Contains(rr.Body.String(), "Tenant Act") {
		t.Fatalf("lineup missing: %s", rr.Body.String())
	}
	idxDJ := strings.Index(rr.Body.String(), "Norte Bass")
	idxAct := strings.Index(rr.Body.String(), "Tenant Act")
	if idxDJ < 0 || idxAct < 0 || idxDJ > idxAct {
		t.Fatalf("lineup not ordered by billing_order: %s", rr.Body.String())
	}

	attachFlyer(t, mux, promoter.AccessToken, eventID)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+eventID+"/submit", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("submit=%d %s", rr.Code, rr.Body.String())
	}
	if _, err := catalog.Publish(t.Context(), eventID); err != nil {
		t.Fatal(err)
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events/"+eventID, nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), "Norte Bass") {
		t.Fatalf("public lineup=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/artists/"+artistID+"/events", nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), eventID) {
		t.Fatalf("artist events=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/artists/"+artistID, nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"upcoming"`) || !strings.Contains(rr.Body.String(), eventID) {
		t.Fatalf("artist upcoming=%d %s", rr.Code, rr.Body.String())
	}

	png := tinyPNG(t)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"avatar","content_type":"image/png","byte_size":`+strconv.Itoa(len(png))+`,"artist_id":"`+artistID+`"}`))
	req.Header.Set("Authorization", "Bearer "+dj.AccessToken)
	req.Host = "api.parche.test"
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("artist upload=%d %s", rr.Code, rr.Body.String())
	}
	var up uploadResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &up)
	if !strings.Contains(up.Key, "artists/"+artistID+"/avatar/") {
		t.Fatalf("avatar key=%s", up.Key)
	}
	putReq, err := http.NewRequest(http.MethodPut, up.Upload.URL, bytes.NewReader(png))
	if err != nil {
		t.Fatal(err)
	}
	putReq.Header.Set("Content-Type", "image/png")
	mux.ServeHTTP(httptest.NewRecorder(), putReq)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/artists/"+artistID+"/assets", strings.NewReader(`{"key":"`+up.Key+`","kind":"avatar"}`))
	req.Header.Set("Authorization", "Bearer "+dj.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("confirm avatar=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/artists/"+artistID, nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"avatar"`) {
		t.Fatalf("avatar on profile=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodDelete, "/v1/events/"+eventID+"/artists/"+artistID, nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("remove lineup=%d %s", rr.Code, rr.Body.String())
	}

	_ = events.StatusPublished
}
