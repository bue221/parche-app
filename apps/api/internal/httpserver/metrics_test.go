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
	"github.com/parche-app/backend/internal/mailer"
	"github.com/parche-app/backend/internal/payments"
)

func TestEventMetricsHTTP(t *testing.T) {
	mux, catalog := testEventStack(t)
	mail, ok := catalog.Mailer.(*mailer.Memory)
	if !ok {
		t.Fatal("mailer")
	}
	now := time.Now().UTC().Add(24 * time.Hour)
	ends := now.Add(4 * time.Hour)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"p@example.com","password":"correct-horse","display_name":"Pez","profile":"promoter"}`)))
	var promoter sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &promoter)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"door@example.com","password":"correct-horse","display_name":"Door","profile":"attendee"}`)))
	var door sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &door)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"a@example.com","password":"correct-horse","display_name":"Ada","profile":"attendee"}`)))
	var attendee sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &attendee)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"m@example.com","password":"correct-horse","display_name":"Metrics","profile":"attendee"}`)))
	var metrics sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &metrics)

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

	inviteAccept(t, mux, mail, promoter.AccessToken, door.AccessToken, id, "door@example.com", "door")
	inviteAccept(t, mux, mail, promoter.AccessToken, metrics.AccessToken, id, "m@example.com", "metrics")

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
	req.Header.Set("Idempotency-Key", "metrics-http-1")
	mux.ServeHTTP(rr, req)
	var checkout events.CheckoutCreated
	_ = json.Unmarshal(rr.Body.Bytes(), &checkout)
	raw := []byte(`{"provider_event_id":"evt-metrics","order_id":"` + checkout.OrderID + `","status":"success"}`)
	sig := payments.Sign("test-webhook-secret", time.Now().UTC(), raw)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/payments/webhook", strings.NewReader(string(raw)))
	req.Header.Set(payments.HeaderSignature, sig)
	mux.ServeHTTP(rr, req)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me/tickets", nil)
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	var wallet struct {
		Items []events.MyTicket `json:"items"`
	}
	_ = json.Unmarshal(rr.Body.Bytes(), &wallet)
	qr := wallet.Items[0].QRToken

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/check-in", strings.NewReader(`{"qr_token":"`+qr+`"}`))
	req.Header.Set("Authorization", "Bearer "+door.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("check-in=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events/"+id+"/metrics", nil))
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/events/"+id+"/metrics", nil)
	req.Header.Set("Authorization", "Bearer "+door.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/events/"+id+"/metrics", nil)
	req.Header.Set("Authorization", "Bearer "+metrics.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"gross_cents":50000`) {
		t.Fatalf("metrics=%d %s", rr.Code, rr.Body.String())
	}
	if strings.Contains(rr.Body.String(), "a@example.com") || strings.Contains(rr.Body.String(), "qr_token") {
		t.Fatalf("pii=%s", rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/events/"+id+"/door/live", nil)
	req.Header.Set("Authorization", "Bearer "+door.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || strings.Contains(rr.Body.String(), "gross") {
		t.Fatalf("door live=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/events/"+id+"/metrics/orders", nil)
	req.Header.Set("Authorization", "Bearer "+metrics.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"a***@example.com"`) {
		t.Fatalf("orders masked=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/events/"+id+"/metrics/orders", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"a@example.com"`) {
		t.Fatalf("owner orders=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/events/"+id+"/metrics/export", nil)
	req.Header.Set("Authorization", "Bearer "+metrics.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/events/"+id+"/metrics/export", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Header().Get("Content-Type"), "text/csv") {
		t.Fatalf("export=%d %s %s", rr.Code, rr.Header().Get("Content-Type"), rr.Body.String())
	}
	if strings.Contains(strings.ToLower(rr.Body.String()), "qr") {
		t.Fatalf("export qr=%s", rr.Body.String())
	}
}
