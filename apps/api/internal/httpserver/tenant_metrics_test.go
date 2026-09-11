package httpserver

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/events"
	"github.com/parche-app/backend/internal/payments"
)

func TestTenantMetricsHTTP(t *testing.T) {
	mux, catalog := testEventStack(t)
	now := time.Now().UTC().Add(24 * time.Hour)
	ends := now.Add(4 * time.Hour)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"p@example.com","password":"correct-horse","display_name":"Pez","profile":"promoter"}`)))
	var promoter sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &promoter)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"staff@example.com","password":"correct-horse","display_name":"Staff","profile":"attendee"}`)))
	var staff sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &staff)

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

	body := `{"tenant_id":"` + tid + `","title":"Norte","starts_at":"` + now.Format(time.RFC3339) + `","ends_at":"` + ends.Format(time.RFC3339) + `","pin":{"name":"Video Norte","lat":4.75,"lng":-74.05}}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var created map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &created)
	id, _ := created["id"].(string)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/v1/events/"+id+"/ticket-types", strings.NewReader(`{"items":[{"name":"Early","price_cents":50000,"capacity":40,"status":"on_sale"}]}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var listed struct {
		Items []events.TicketType `json:"items"`
	}
	_ = json.Unmarshal(rr.Body.Bytes(), &listed)
	typeID := listed.Items[0].ID

	attachFlyer(t, mux, promoter.AccessToken, id)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/submit", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if _, err := catalog.Publish(t.Context(), id); err != nil {
		t.Fatal(err)
	}

	orderBody := `{"items":[{"ticket_type_id":"` + typeID + `","quantity":1}]}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/orders", strings.NewReader(orderBody))
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	req.Header.Set("Idempotency-Key", "tenant-metrics-http-1")
	mux.ServeHTTP(rr, req)
	var checkout events.CheckoutCreated
	_ = json.Unmarshal(rr.Body.Bytes(), &checkout)
	raw := []byte(`{"provider_event_id":"evt-tenant-metrics","order_id":"` + checkout.OrderID + `","status":"success"}`)
	sig := payments.Sign("test-webhook-secret", time.Now().UTC(), raw)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/payments/webhook", strings.NewReader(string(raw)))
	req.Header.Set(payments.HeaderSignature, sig)
	mux.ServeHTTP(rr, req)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/tenants/"+tid+"/members", strings.NewReader(`{"email":"staff@example.com"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("add staff=%d %s", rr.Code, rr.Body.String())
	}

	from := now.Add(-time.Hour).UTC().Format(time.RFC3339)
	to := ends.Add(time.Hour).UTC().Format(time.RFC3339)
	path := "/v1/tenants/" + tid + "/metrics?" + url.Values{"from": {from}, "to": {to}}.Encode()

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, path, nil))
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("Authorization", "Bearer "+staff.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusNotFound, apierr.NotFound)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/tenants/"+tid+"/metrics?from=nope&to="+url.QueryEscape(to), nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("owner=%d %s", rr.Code, rr.Body.String())
	}
	var got events.TenantMetrics
	if err := json.Unmarshal(rr.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if got.GrossCents != 50000 || got.TicketsSold != 1 || got.OrdersPaid != 1 || got.EventsPublished != 1 {
		t.Fatalf("metrics=%+v %s", got, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/events/"+id+"/metrics", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var ev events.EventMetrics
	_ = json.Unmarshal(rr.Body.Bytes(), &ev)
	if ev.GrossCents != got.GrossCents {
		t.Fatalf("f20=%d f21=%d", ev.GrossCents, got.GrossCents)
	}
}
