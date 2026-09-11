package httpserver

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/venues"
)

func TestClubsDirectoryHTTP(t *testing.T) {
	mux, catalog := testEventStack(t)
	now := time.Now().UTC().Add(24 * time.Hour)
	ends := now.Add(4 * time.Hour)

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

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/tenants/"+tid+"/members", strings.NewReader(`{"email":"a@example.com"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("add staff=%d %s", rr.Code, rr.Body.String())
	}

	body := `{"tenant_id":"` + tid + `","name":"Video Club","address_text":"Chapinero, Bogotá","lat":4.65,"lng":-74.06}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/clubs", strings.NewReader(body))
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/venues", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("venue=%d %s", rr.Code, rr.Body.String())
	}
	var house venues.Venue
	_ = json.Unmarshal(rr.Body.Bytes(), &house)
	if house.Kind != venues.KindOther {
		t.Fatalf("house kind=%s", house.Kind)
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/clubs", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("create club=%d %s", rr.Code, rr.Body.String())
	}
	var club map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &club)
	id, _ := club["id"].(string)
	if id == "" || club["kind"] != "club" || club["listed"] != true {
		t.Fatalf("club=%v", club)
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/clubs/"+house.ID, nil))
	assertAPICode(t, rr, http.StatusNotFound, apierr.NotFound)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/clubs/"+id, nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"lat"`) || !strings.Contains(rr.Body.String(), `"upcoming"`) {
		t.Fatalf("public listed=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/clubs?q=video&min_lat=4.5&min_lng=-74.2&max_lat=4.8&max_lng=-74.0", nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), id) {
		t.Fatalf("map list=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/clubs?min_lat=5&min_lng=-74&max_lat=4&max_lng=-73", nil))
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPatch, "/v1/clubs/"+id, strings.NewReader(`{"listed":false}`))
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPatch, "/v1/clubs/"+id, strings.NewReader(`{"listed":false}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || strings.Contains(rr.Body.String(), `"listed":true`) {
		t.Fatalf("unlist=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/clubs/"+id, nil))
	assertAPICode(t, rr, http.StatusNotFound, apierr.NotFound)

	evBody := `{"tenant_id":"` + tid + `","title":"Norte","starts_at":"` + now.Format(time.RFC3339) + `","ends_at":"` + ends.Format(time.RFC3339) + `","venue_id":"` + id + `","genres":["techno"]}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(evBody))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("event=%d %s", rr.Code, rr.Body.String())
	}
	var ev map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &ev)
	eid, _ := ev["id"].(string)
	attachFlyer(t, mux, promoter.AccessToken, eid)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+eid+"/submit", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("submit=%d %s", rr.Code, rr.Body.String())
	}
	if _, err := catalog.Publish(t.Context(), eid); err != nil {
		t.Fatal(err)
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/clubs/"+id, nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"Norte"`) {
		t.Fatalf("upcoming=%d %s", rr.Code, rr.Body.String())
	}
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/clubs?q=video", nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), id) {
		t.Fatalf("published dir=%d %s", rr.Code, rr.Body.String())
	}
}
