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
	"github.com/parche-app/backend/internal/events"
	"github.com/parche-app/backend/internal/venues"
)

func TestEventsLifecycleHTTP(t *testing.T) {
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

	body := `{"tenant_id":"` + tid + `","title":"Norte","starts_at":"` + now.Format(time.RFC3339) + `","ends_at":"` + ends.Format(time.RFC3339) + `","pin":{"name":"Video Norte","lat":4.75,"lng":-74.05,"address_text":"Chapinero"},"genres":["techno"]}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(body))
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)

	badDates := `{"tenant_id":"` + tid + `","title":"X","starts_at":"` + ends.Format(time.RFC3339) + `","ends_at":"` + now.Format(time.RFC3339) + `","pin":{"name":"Video","lat":4.75,"lng":-74.05}}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(badDates))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)
	if !strings.Contains(rr.Body.String(), "ends_at") {
		t.Fatalf("expected ends_at detail: %s", rr.Body.String())
	}

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
	if id == "" || created["status"] != events.StatusDraft {
		t.Fatalf("created=%v", created)
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("public empty=%d %s", rr.Code, rr.Body.String())
	}
	if strings.Contains(rr.Body.String(), id) {
		t.Fatalf("draft in public list: %s", rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events/"+id, nil))
	assertAPICode(t, rr, http.StatusNotFound, apierr.NotFound)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/events/"+id, nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("owner get=%d %s", rr.Code, rr.Body.String())
	}

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
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events?min_lat=4.7&min_lng=-74.1&max_lat=4.8&max_lng=-74.0", nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"Norte"`) {
		t.Fatalf("bbox list=%d %s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"lat"`) {
		t.Fatal("published list must include lat")
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events/"+id, nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("public detail=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPatch, "/v1/events/"+id, strings.NewReader(`{"description":"new copy"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), "new copy") {
		t.Fatalf("patch desc=%d %s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"status":"published"`) {
		t.Fatalf("desc patch should stay published: %s", rr.Body.String())
	}

	later := now.Add(48 * time.Hour)
	laterEnd := later.Add(4 * time.Hour)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPatch, "/v1/events/"+id, strings.NewReader(`{"starts_at":"`+later.Format(time.RFC3339)+`","ends_at":"`+laterEnd.Format(time.RFC3339)+`"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), events.StatusPendingReview) {
		t.Fatalf("patch schedule=%d %s", rr.Code, rr.Body.String())
	}

	if _, err := catalog.Publish(t.Context(), id); err != nil {
		t.Fatal(err)
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/tenants/"+tid+"/events", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), id) {
		t.Fatalf("tenant list=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/cancel", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("cancel=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events", nil))
	if strings.Contains(rr.Body.String(), id) {
		t.Fatalf("cancelled in agenda: %s", rr.Body.String())
	}
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events/"+id, nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), events.StatusCancelled) {
		t.Fatalf("cancelled detail=%d %s", rr.Code, rr.Body.String())
	}
}

func testEventStack(t *testing.T) (http.Handler, *events.Service) {
	t.Helper()
	store := auth.NewMemory()
	tokens := testTokens()
	svc, err := auth.NewService(store, tokens, auth.FastArgon2(), testLogger())
	if err != nil {
		t.Fatal(err)
	}
	vmem := venues.NewMemory()
	vsvc := venues.NewService(vmem, store)
	esvc := events.NewService(events.NewMemory(), store, vsvc, vmem, events.NewMemoryCache())
	access := JWTAccess{Tokens: tokens, Lookup: svc.AccessIdentity}
	mux := newMux(testLogger(), configCORS(), nil, nil, nil, Routes{
		Access:  access,
		Events:  esvc,
		Catalog: esvc,
		Auth:    svc,
		Venues:  vsvc,
	})
	return mux, esvc
}
