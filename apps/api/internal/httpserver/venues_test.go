package httpserver

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/venues"
)

func TestVenuesCRUDAuthBBoxAndGeoJSON(t *testing.T) {
	mux, _ := testAuthStack(t)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"p@example.com","password":"correct-horse","display_name":"Pez Alado","profile":"promoter"}`)))
	var promoter sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &promoter)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"a@example.com","password":"correct-horse","display_name":"Ada","profile":"attendee"}`)))
	var attendee sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &attendee)

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var me auth.Me
	_ = json.Unmarshal(rr.Body.Bytes(), &me)
	tid := me.Tenants[0].ID

	body := `{"tenant_id":"` + tid + `","name":"Video Club","address_text":"Chapinero, Bogotá","lat":4.65,"lng":-74.06,"geojson":{"type":"Point","coordinates":[-74.06,4.65]}}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/venues", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusNotFound, apierr.NotFound)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/venues", strings.NewReader(body))
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/venues", strings.NewReader(`{"tenant_id":"`+tid+`","name":"X","lat":91,"lng":0}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/venues", strings.NewReader(`{"tenant_id":"`+tid+`","name":"X","lat":4.6,"lng":-74,"source":"google_places"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/venues", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("create=%d %s", rr.Code, rr.Body.String())
	}
	var created map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &created)
	id, _ := created["id"].(string)
	if id == "" || created["source"] != "user_pin" {
		t.Fatalf("created=%v", created)
	}
	if _, ok := created["geojson"]; !ok {
		t.Fatal("geojson missing")
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/venues/"+id, nil))
	assertAPICode(t, rr, http.StatusNotFound, apierr.NotFound)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/venues/"+id, nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("get=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPatch, "/v1/venues/"+id, strings.NewReader(`{"address_text":"Cra 7"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), "Cra 7") {
		t.Fatalf("patch=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/venues?min_lat=4.5&min_lng=-74.2&max_lat=4.8&max_lng=-74.0", nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"items":[]`) {
		t.Fatalf("public unpublished=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/venues?min_lat=5&min_lng=-74&max_lat=4&max_lng=-73", nil))
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events?min_lat=0&min_lng=0&max_lat=3&max_lng=0.1", nil))
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events", nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"items"`) {
		t.Fatalf("events empty=%d %s", rr.Code, rr.Body.String())
	}
}

func TestPublicVenueAfterPublishedUse(t *testing.T) {
	store := auth.NewMemory()
	vmem := venues.NewMemory()
	vsvc := venues.NewService(vmem, store)
	tokens := testTokens()
	svc, err := auth.NewService(store, tokens, auth.FastArgon2(), testLogger())
	if err != nil {
		t.Fatal(err)
	}
	access := JWTAccess{Tokens: tokens, Lookup: svc.AccessIdentity}
	mux := newMux(testLogger(), configCORS(), nil, nil, nil, Routes{
		Access: access,
		Auth:   svc,
		Venues: vsvc,
	})

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"p@example.com","password":"correct-horse","display_name":"Pez Alado","profile":"promoter"}`)))
	var promoter sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &promoter)
	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var me auth.Me
	_ = json.Unmarshal(rr.Body.Bytes(), &me)
	tid := me.Tenants[0].ID

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/venues", strings.NewReader(`{"tenant_id":"`+tid+`","name":"Video Club","lat":4.65,"lng":-74.06}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("create=%d %s", rr.Code, rr.Body.String())
	}
	var created venues.Venue
	_ = json.Unmarshal(rr.Body.Bytes(), &created)
	if err := vsvc.RecordPublishedEvent(t.Context(), created.ID, 1); err != nil {
		t.Fatal(err)
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/venues/"+created.ID, nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("public get=%d %s", rr.Code, rr.Body.String())
	}
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/venues?q=video&min_lat=4.5&min_lng=-74.2&max_lat=4.8&max_lng=-74.0", nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), created.ID) {
		t.Fatalf("public list=%d %s", rr.Code, rr.Body.String())
	}
}

func testTokens() *auth.Tokens {
	return &auth.Tokens{
		AccessSecret:  []byte("0123456789abcdef0123456789abcdef"),
		RefreshPepper: []byte("refresh-pepper-32-bytes-minimum!"),
	}
}
