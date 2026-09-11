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

func TestRecommendationsHTTP(t *testing.T) {
	mux, catalog := testEventStack(t)
	djStart := time.Now().UTC().Add(24 * time.Hour)
	djEnd := djStart.Add(4 * time.Hour)
	otherStart := time.Now().UTC().Add(48 * time.Hour)
	otherEnd := otherStart.Add(4 * time.Hour)

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
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/me/recommendations", nil))
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)

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

	createPub := func(title, genre string, start, end time.Time) string {
		t.Helper()
		body := `{"tenant_id":"` + tid + `","title":"` + title + `","starts_at":"` + start.Format(time.RFC3339) + `","ends_at":"` + end.Format(time.RFC3339) + `","pin":{"name":"` + title + `","lat":4.75,"lng":-74.05},"genres":["` + genre + `"]}`
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
		mux.ServeHTTP(rr, req)
		if rr.Code != http.StatusCreated {
			t.Fatalf("create %s=%d %s", title, rr.Code, rr.Body.String())
		}
		var ev map[string]any
		_ = json.Unmarshal(rr.Body.Bytes(), &ev)
		id, _ := ev["id"].(string)
		attachFlyer(t, mux, promoter.AccessToken, id)
		rr = httptest.NewRecorder()
		req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/submit", nil)
		req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
		mux.ServeHTTP(rr, req)
		if rr.Code != http.StatusNoContent {
			t.Fatalf("submit %s=%d %s", title, rr.Code, rr.Body.String())
		}
		if _, err := catalog.Publish(t.Context(), id); err != nil {
			t.Fatal(err)
		}
		return id
	}

	draftBody := `{"tenant_id":"` + tid + `","title":"Secret","starts_at":"` + djStart.Format(time.RFC3339) + `","ends_at":"` + djEnd.Format(time.RFC3339) + `","pin":{"name":"Hidden","lat":4.75,"lng":-74.05},"genres":["techno"]}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(draftBody))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var draft map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &draft)
	draftID, _ := draft["id"].(string)

	djEvent := createPub("DJ Night", "acid", djStart, djEnd)
	otherEvent := createPub("Warehouse", "techno", otherStart, otherEnd)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+djEvent+"/artists", strings.NewReader(`{"artist_id":"`+artistID+`","billing_order":1}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("lineup=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me/recommendations", nil)
	req.Header.Set("Authorization", "Bearer "+fan.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("cold=%d %s", rr.Code, rr.Body.String())
	}
	var cold recList
	_ = json.Unmarshal(rr.Body.Bytes(), &cold)
	if len(cold.Events) < 2 {
		t.Fatalf("cold events=%v", rr.Body.String())
	}
	for _, ev := range cold.Events {
		if ev.ID == draftID || ev.Reason != "popular" {
			t.Fatalf("cold leaked or reason: %+v body=%s", ev, rr.Body.String())
		}
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/artists/"+artistID+"/follow", nil)
	req.Header.Set("Authorization", "Bearer "+fan.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("follow=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me/recommendations", nil)
	req.Header.Set("Authorization", "Bearer "+fan.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("follow recs=%d %s", rr.Code, rr.Body.String())
	}
	var followed recList
	_ = json.Unmarshal(rr.Body.Bytes(), &followed)
	if len(followed.Events) == 0 || followed.Events[0].ID != djEvent || followed.Events[0].Reason != "follow" {
		t.Fatalf("follow recs=%s", rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/v1/events/"+djEvent+"/ticket-types", strings.NewReader(`{"items":[{"name":"Early","price_cents":1000,"capacity":10,"status":"on_sale"}]}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var listed struct {
		Items []events.TicketType `json:"items"`
	}
	_ = json.Unmarshal(rr.Body.Bytes(), &listed)
	typeID := listed.Items[0].ID

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+djEvent+"/orders", strings.NewReader(`{"items":[{"ticket_type_id":"`+typeID+`","quantity":1}]}`))
	req.Header.Set("Authorization", "Bearer "+fan.AccessToken)
	req.Header.Set("Idempotency-Key", "recs-buy-1")
	req.Host = "api.parche.test"
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("order=%d %s", rr.Code, rr.Body.String())
	}
	var checkout events.CheckoutCreated
	_ = json.Unmarshal(rr.Body.Bytes(), &checkout)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/dev/payments/simulate", strings.NewReader(`{"order_id":"`+checkout.OrderID+`","status":"success"}`))
	req.Header.Set("Authorization", "Bearer "+fan.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("simulate=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me/recommendations", nil)
	req.Header.Set("Authorization", "Bearer "+fan.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("after buy=%d %s", rr.Code, rr.Body.String())
	}
	var afterBuy recList
	_ = json.Unmarshal(rr.Body.Bytes(), &afterBuy)
	for _, ev := range afterBuy.Events {
		if ev.ID == djEvent {
			t.Fatalf("bought still recommended: %s", rr.Body.String())
		}
	}
	if len(afterBuy.Events) == 0 || afterBuy.Events[0].ID != otherEvent {
		t.Fatalf("expected remaining event: %s", rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events/"+draftID+"/similar", nil))
	assertAPICode(t, rr, http.StatusNotFound, apierr.NotFound)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events/"+djEvent+"/similar", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("similar=%d %s", rr.Code, rr.Body.String())
	}
	var sim recList
	_ = json.Unmarshal(rr.Body.Bytes(), &sim)
	for _, ev := range sim.Events {
		if ev.ID == djEvent || ev.ID == draftID {
			t.Fatalf("similar leaked: %s", rr.Body.String())
		}
	}
}
