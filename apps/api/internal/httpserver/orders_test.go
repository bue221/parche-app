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

func TestCheckoutHTTP(t *testing.T) {
	mux, catalog := testEventStack(t)
	now := time.Now().UTC().Add(24 * time.Hour)
	ends := now.Add(4 * time.Hour)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"p@example.com","password":"correct-horse","display_name":"Pez","profile":"promoter"}`)))
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

	body := `{"tenant_id":"` + tid + `","title":"Norte","starts_at":"` + now.Format(time.RFC3339) + `","ends_at":"` + ends.Format(time.RFC3339) + `","pin":{"name":"Video Norte","lat":4.75,"lng":-74.05}}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var created map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &created)
	id, _ := created["id"].(string)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/v1/events/"+id+"/ticket-types", strings.NewReader(`{"items":[{"name":"Early","price_cents":50000,"capacity":2,"status":"on_sale"}]}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var listed struct {
		Items []events.TicketType `json:"items"`
	}
	_ = json.Unmarshal(rr.Body.Bytes(), &listed)
	typeID := listed.Items[0].ID

	orderBody := `{"items":[{"ticket_type_id":"` + typeID + `","quantity":1}]}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/orders", strings.NewReader(orderBody))
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	req.Header.Set("Idempotency-Key", "checkout-key-early")
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
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/orders", strings.NewReader(orderBody))
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/orders", strings.NewReader(orderBody))
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	req.Header.Set("Idempotency-Key", "checkout-key-1")
	req.Host = "api.parche.test"
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("order=%d %s", rr.Code, rr.Body.String())
	}
	var checkout events.CheckoutCreated
	_ = json.Unmarshal(rr.Body.Bytes(), &checkout)
	if checkout.Status != events.OrderPending || !strings.Contains(checkout.CheckoutURL, "/v1/dev/pay/") {
		t.Fatalf("%+v", checkout)
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/orders", strings.NewReader(orderBody))
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	req.Header.Set("Idempotency-Key", "checkout-key-1")
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("replay=%d %s", rr.Code, rr.Body.String())
	}
	var replay events.CheckoutCreated
	_ = json.Unmarshal(rr.Body.Bytes(), &replay)
	if replay.OrderID != checkout.OrderID {
		t.Fatalf("replay id %s vs %s", replay.OrderID, checkout.OrderID)
	}

	raw := []byte(`{"provider_event_id":"evt-dup","order_id":"` + checkout.OrderID + `","status":"success"}`)
	sig := payments.Sign("test-webhook-secret", time.Now().UTC(), raw)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/payments/webhook", strings.NewReader(string(raw)))
	req.Header.Set(payments.HeaderSignature, sig)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("webhook=%d %s", rr.Code, rr.Body.String())
	}
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/payments/webhook", strings.NewReader(string(raw)))
	req.Header.Set(payments.HeaderSignature, sig)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("dup webhook=%d %s", rr.Code, rr.Body.String())
	}
	mail, ok := catalog.Mailer.(*mailer.Memory)
	if !ok {
		t.Fatal("mailer")
	}
	paid := 0
	for _, msg := range mail.All() {
		if msg.Template == mailer.TemplateOrderPaid {
			paid++
		}
	}
	if paid != 1 {
		t.Fatalf("order_paid count=%d", paid)
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/orders/"+checkout.OrderID, nil)
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"paid"`) {
		t.Fatalf("get order=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/orders/"+checkout.OrderID, nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("owner metrics get=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"x@example.com","password":"correct-horse","display_name":"X","profile":"attendee"}`)))
	var other sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &other)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/orders/"+checkout.OrderID, nil)
	req.Header.Set("Authorization", "Bearer "+other.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusNotFound, apierr.NotFound)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/orders", strings.NewReader(`{"items":[{"ticket_type_id":"`+typeID+`","quantity":2}]}`))
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	req.Header.Set("Idempotency-Key", "checkout-key-full")
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusConflict, apierr.Conflict)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/payments/webhook", strings.NewReader(string(raw)))
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)
}

func TestDevSimulateAndBadSignature(t *testing.T) {
	mux, catalog := testEventStack(t)
	now := time.Now().UTC().Add(24 * time.Hour)
	ends := now.Add(4 * time.Hour)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"p2@example.com","password":"correct-horse","display_name":"Pez","profile":"promoter"}`)))
	var promoter sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &promoter)
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"a2@example.com","password":"correct-horse","display_name":"Ada","profile":"attendee"}`)))
	var attendee sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &attendee)

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var me auth.Me
	_ = json.Unmarshal(rr.Body.Bytes(), &me)

	body := `{"tenant_id":"` + me.Tenants[0].ID + `","title":"Sur","starts_at":"` + now.Format(time.RFC3339) + `","ends_at":"` + ends.Format(time.RFC3339) + `","pin":{"name":"Pin","lat":4.6,"lng":-74.08}}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var created map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &created)
	id, _ := created["id"].(string)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/v1/events/"+id+"/ticket-types", strings.NewReader(`{"items":[{"name":"Door","price_cents":1000,"capacity":10,"status":"on_sale"}]}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var listed struct {
		Items []events.TicketType `json:"items"`
	}
	_ = json.Unmarshal(rr.Body.Bytes(), &listed)
	attachFlyer(t, mux, promoter.AccessToken, id)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/submit", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if _, err := catalog.Publish(t.Context(), id); err != nil {
		t.Fatal(err)
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/orders", strings.NewReader(`{"items":[{"ticket_type_id":"`+listed.Items[0].ID+`","quantity":1}]}`))
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	req.Header.Set("Idempotency-Key", "sim-key-1")
	mux.ServeHTTP(rr, req)
	var checkout events.CheckoutCreated
	_ = json.Unmarshal(rr.Body.Bytes(), &checkout)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/dev/pay/"+checkout.OrderID, nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), checkout.OrderID) {
		t.Fatalf("dev pay=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/dev/payments/simulate", strings.NewReader(`{"order_id":"`+checkout.OrderID+`","status":"success"}`))
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("simulate=%d %s", rr.Code, rr.Body.String())
	}
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/orders/"+checkout.OrderID, nil)
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	if !strings.Contains(rr.Body.String(), `"paid"`) {
		t.Fatalf("after simulate: %s", rr.Body.String())
	}
}
