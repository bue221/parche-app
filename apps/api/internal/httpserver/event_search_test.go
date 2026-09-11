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
)

func TestEventSearchHTTP(t *testing.T) {
	mux, catalog := testEventStack(t)
	norteStart := time.Now().UTC().Add(24 * time.Hour)
	norteEnd := norteStart.Add(4 * time.Hour)
	surStart := time.Now().UTC().Add(48 * time.Hour)
	surEnd := surStart.Add(4 * time.Hour)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"p@example.com","password":"correct-horse","display_name":"Pez","profile":"promoter"}`)))
	var promoter sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &promoter)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"dj@example.com","password":"correct-horse","display_name":"Norte","profile":"attendee"}`)))
	var dj sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &dj)

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var me auth.Me
	_ = json.Unmarshal(rr.Body.Bytes(), &me)
	tid := me.Tenants[0].ID

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/me/profiles/artist", nil)
	req.Header.Set("Authorization", "Bearer "+dj.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("artist profile=%d %s", rr.Code, rr.Body.String())
	}
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/artists", strings.NewReader(`{"name":"Norte Bass"}`))
	req.Header.Set("Authorization", "Bearer "+dj.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("artist=%d %s", rr.Code, rr.Body.String())
	}
	var artist map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &artist)
	artistID, _ := artist["id"].(string)

	norteBody := `{"tenant_id":"` + tid + `","title":"Norte","description":"chapinero rave","starts_at":"` + norteStart.Format(time.RFC3339) + `","ends_at":"` + norteEnd.Format(time.RFC3339) + `","pin":{"name":"Video Norte","lat":4.75,"lng":-74.05},"genres":["techno"]}`
	surBody := `{"tenant_id":"` + tid + `","title":"Sur","description":"warehouse","starts_at":"` + surStart.Format(time.RFC3339) + `","ends_at":"` + surEnd.Format(time.RFC3339) + `","pin":{"name":"Sur Pin","lat":4.60,"lng":-74.08},"genres":["acid"]}`
	draftBody := `{"tenant_id":"` + tid + `","title":"Norte draft","description":"secret","starts_at":"` + norteStart.Format(time.RFC3339) + `","ends_at":"` + norteEnd.Format(time.RFC3339) + `","pin":{"name":"Hidden","lat":4.75,"lng":-74.05},"genres":["techno"]}`

	create := func(body string) string {
		t.Helper()
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
		mux.ServeHTTP(rr, req)
		if rr.Code != http.StatusCreated {
			t.Fatalf("create=%d %s", rr.Code, rr.Body.String())
		}
		var ev map[string]any
		_ = json.Unmarshal(rr.Body.Bytes(), &ev)
		id, _ := ev["id"].(string)
		return id
	}
	norteID := create(norteBody)
	surID := create(surBody)
	draftID := create(draftBody)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+norteID+"/artists", strings.NewReader(`{"artist_id":"`+artistID+`","billing_order":0}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("lineup=%d %s", rr.Code, rr.Body.String())
	}

	publish := func(id string) {
		t.Helper()
		attachFlyer(t, mux, promoter.AccessToken, id)
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/submit", nil)
		req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
		mux.ServeHTTP(rr, req)
		if rr.Code != http.StatusNoContent {
			t.Fatalf("submit=%d %s", rr.Code, rr.Body.String())
		}
		if _, err := catalog.Publish(t.Context(), id); err != nil {
			t.Fatal(err)
		}
	}
	publish(norteID)
	publish(surID)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events?q=Norte&genre=techno&min_lat=4.7&min_lng=-74.1&max_lat=4.8&max_lng=-74.0", nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), norteID) || strings.Contains(rr.Body.String(), surID) || strings.Contains(rr.Body.String(), draftID) {
		t.Fatalf("combo=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events?artist_id="+artistID, nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), norteID) || strings.Contains(rr.Body.String(), surID) {
		t.Fatalf("artist=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events?q=secret", nil))
	if rr.Code != http.StatusOK || strings.Contains(rr.Body.String(), draftID) {
		t.Fatalf("draft leak=%s", rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events?q="+strings.Repeat("n", 81), nil))
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events?min_lat=-90&min_lng=-180&max_lat=90&max_lng=180", nil))
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events?limit=1", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("page=%d %s", rr.Code, rr.Body.String())
	}
	var env struct {
		Items      []events.PublicItem `json:"items"`
		NextCursor *string             `json:"next_cursor"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &env); err != nil || len(env.Items) != 1 || env.NextCursor == nil {
		t.Fatalf("page body=%s err=%v", rr.Body.String(), err)
	}
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events?limit=1&cursor="+*env.NextCursor, nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"items"`) {
		t.Fatalf("page2=%d %s", rr.Code, rr.Body.String())
	}
	if strings.Contains(rr.Body.String(), env.Items[0].ID) {
		t.Fatalf("cursor repeated first item: %s", rr.Body.String())
	}
}
