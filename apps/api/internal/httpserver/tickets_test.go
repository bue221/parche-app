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
	"github.com/parche-app/backend/internal/mailer"
	"github.com/parche-app/backend/internal/payments"
)

func TestTicketTypesHTTP(t *testing.T) {
	mux, catalog := testEventStack(t)
	mail, ok := catalog.Mailer.(*mailer.Memory)
	if !ok {
		t.Fatal("mailer")
	}
	now := time.Now().UTC().Add(24 * time.Hour)
	ends := now.Add(4 * time.Hour)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"p@example.com","password":"correct-horse","display_name":"Pez Alado","profile":"promoter"}`)))
	var promoter sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &promoter)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"door@example.com","password":"correct-horse","display_name":"Door","profile":"attendee"}`)))
	var door sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &door)

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
	if rr.Code != http.StatusCreated {
		t.Fatalf("create=%d %s", rr.Code, rr.Body.String())
	}
	var created map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &created)
	id, _ := created["id"].(string)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/members", strings.NewReader(`{"email":"door@example.com","role":"door"}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("invite=%d %s", rr.Code, rr.Body.String())
	}
	token := httpInviteToken(t, mail)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/invites/"+token+"/accept", nil)
	req.Header.Set("Authorization", "Bearer "+door.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("accept=%d %s", rr.Code, rr.Body.String())
	}

	put := `{"items":[{"name":"Early","price_cents":-1,"capacity":40,"status":"on_sale"}]}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/v1/events/"+id+"/ticket-types", strings.NewReader(put))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)
	if !strings.Contains(rr.Body.String(), "price_cents") {
		t.Fatalf("negative price details: %s", rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/v1/events/"+id+"/ticket-types", strings.NewReader(`{"items":[{"name":"Early","price_cents":50000,"capacity":40,"status":"draft"},{"name":"Door","price_cents":80000,"capacity":60,"status":"on_sale"}]}`))
	req.Header.Set("Authorization", "Bearer "+door.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/v1/events/"+id+"/ticket-types", strings.NewReader(`{"items":[{"name":"Early","price_cents":50000,"capacity":40,"status":"draft"},{"name":"Door","price_cents":80000,"capacity":60,"status":"on_sale"}]}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("put=%d %s", rr.Code, rr.Body.String())
	}
	var listed struct {
		Items []events.TicketType `json:"items"`
	}
	_ = json.Unmarshal(rr.Body.Bytes(), &listed)
	if len(listed.Items) != 2 {
		t.Fatalf("items=%s", rr.Body.String())
	}
	var earlyID string
	for _, tix := range listed.Items {
		if tix.Name == "Early" {
			earlyID = tix.ID
		}
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPut, "/v1/events/"+id+"/ticket-types", strings.NewReader(`{"items":[{"id":"`+earlyID+`","name":"Early","price_cents":50000,"capacity":40,"status":"paused"},{"name":"Door","price_cents":80000,"capacity":60,"status":"on_sale"}]}`))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"paused"`) {
		t.Fatalf("pause=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events/"+id+"/ticket-types", nil))
	assertAPICode(t, rr, http.StatusNotFound, apierr.NotFound)

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
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events/"+id+"/ticket-types", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("public get=%d %s", rr.Code, rr.Body.String())
	}
	if strings.Contains(rr.Body.String(), `"draft"`) || strings.Contains(rr.Body.String(), `"paused"`) || strings.Contains(rr.Body.String(), `"Early"`) {
		t.Fatalf("public saw non-sale types: %s", rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"Door"`) {
		t.Fatalf("public missing on_sale: %s", rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/events/"+id+"/ticket-types", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"Early"`) {
		t.Fatalf("owner get=%d %s", rr.Code, rr.Body.String())
	}
}

func TestMyTicketsQRHTTP(t *testing.T) {
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

	attachFlyer(t, mux, promoter.AccessToken, id)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/submit", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if _, err := catalog.Publish(t.Context(), id); err != nil {
		t.Fatal(err)
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/me/tickets", nil))
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)

	orderBody := `{"items":[{"ticket_type_id":"` + typeID + `","quantity":1}]}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/orders", strings.NewReader(orderBody))
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	req.Header.Set("Idempotency-Key", "qr-http-1")
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("order=%d %s", rr.Code, rr.Body.String())
	}
	var checkout events.CheckoutCreated
	_ = json.Unmarshal(rr.Body.Bytes(), &checkout)

	raw := []byte(`{"provider_event_id":"evt-qr","order_id":"` + checkout.OrderID + `","status":"success"}`)
	sig := payments.Sign("test-webhook-secret", time.Now().UTC(), raw)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/payments/webhook", strings.NewReader(string(raw)))
	req.Header.Set(payments.HeaderSignature, sig)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("webhook=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me/tickets?upcoming=true", nil)
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("tickets=%d %s", rr.Code, rr.Body.String())
	}
	var wallet struct {
		Items []events.MyTicket `json:"items"`
	}
	_ = json.Unmarshal(rr.Body.Bytes(), &wallet)
	if len(wallet.Items) != 1 || wallet.Items[0].QRToken == "" || wallet.Items[0].Status != "valid" {
		t.Fatalf("%s", rr.Body.String())
	}
	qr := wallet.Items[0].QRToken
	if strings.Contains(qr, wallet.Items[0].TicketID) && !strings.HasPrefix(qr, "eyJ") {
		t.Fatalf("qr must be jws not raw uuid: %s", qr)
	}
	if !strings.HasPrefix(qr, "eyJ") {
		t.Fatalf("jws prefix: %s", qr)
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me/tickets?upcoming=true", nil)
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	_ = json.Unmarshal(rr.Body.Bytes(), &wallet)
	if len(wallet.Items) != 1 || wallet.Items[0].QRToken != qr {
		t.Fatalf("reget qr changed: %s", rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"o@example.com","password":"correct-horse","display_name":"Other","profile":"attendee"}`)))
	var other sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &other)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me/tickets?upcoming=true", nil)
	req.Header.Set("Authorization", "Bearer "+other.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"items":[]`) {
		t.Fatalf("stranger tickets=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me/tickets?status=bogus", nil)
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)
}

func TestTicketTransferHTTP(t *testing.T) {
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
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"a@example.com","password":"correct-horse","display_name":"Ada","profile":"attendee"}`)))
	var attendee sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &attendee)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"b@example.com","password":"correct-horse","display_name":"Bea","profile":"attendee"}`)))
	var dest sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &dest)

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
	req = httptest.NewRequest(http.MethodPut, "/v1/events/"+id+"/ticket-types", strings.NewReader(`{"items":[{"name":"Early","price_cents":50000,"capacity":8,"status":"on_sale"}]}`))
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
	req.Header.Set("Idempotency-Key", "xfer-http-1")
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("order=%d %s", rr.Code, rr.Body.String())
	}
	var checkout events.CheckoutCreated
	_ = json.Unmarshal(rr.Body.Bytes(), &checkout)

	raw := []byte(`{"provider_event_id":"evt-xfer","order_id":"` + checkout.OrderID + `","status":"success"}`)
	sig := payments.Sign("test-webhook-secret", time.Now().UTC(), raw)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/payments/webhook", strings.NewReader(string(raw)))
	req.Header.Set(payments.HeaderSignature, sig)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("webhook=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me/tickets", nil)
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	var wallet struct {
		Items []events.MyTicket `json:"items"`
	}
	_ = json.Unmarshal(rr.Body.Bytes(), &wallet)
	if len(wallet.Items) != 1 {
		t.Fatalf("wallet=%s", rr.Body.String())
	}
	ticketID := wallet.Items[0].TicketID
	oldQR := wallet.Items[0].QRToken

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/tickets/"+ticketID+"/transfer", strings.NewReader(`{"to_user_id":"`+dest.User.ID+`"}`)))
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/tickets/"+ticketID+"/transfer", strings.NewReader(`{"to_email":"a@example.com"}`))
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/tickets/"+ticketID+"/transfer", strings.NewReader(`{"to_user_id":"`+dest.User.ID+`"}`))
	req.Header.Set("Authorization", "Bearer "+dest.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/tickets/"+ticketID+"/transfer", strings.NewReader(`{"to_user_id":"`+dest.User.ID+`"}`))
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("transfer=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me/tickets", nil)
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	_ = json.Unmarshal(rr.Body.Bytes(), &wallet)
	if len(wallet.Items) != 0 {
		t.Fatalf("sender still has ticket: %s", rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me/tickets", nil)
	req.Header.Set("Authorization", "Bearer "+dest.AccessToken)
	mux.ServeHTTP(rr, req)
	_ = json.Unmarshal(rr.Body.Bytes(), &wallet)
	if len(wallet.Items) != 1 || wallet.Items[0].TicketID != ticketID || wallet.Items[0].QRToken == "" || wallet.Items[0].QRToken == oldQR {
		t.Fatalf("dest wallet=%s", rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/orders", strings.NewReader(orderBody))
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	req.Header.Set("Idempotency-Key", "xfer-http-2")
	mux.ServeHTTP(rr, req)
	_ = json.Unmarshal(rr.Body.Bytes(), &checkout)
	raw = []byte(`{"provider_event_id":"evt-xfer-2","order_id":"` + checkout.OrderID + `","status":"success"}`)
	sig = payments.Sign("test-webhook-secret", time.Now().UTC(), raw)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/payments/webhook", strings.NewReader(string(raw)))
	req.Header.Set(payments.HeaderSignature, sig)
	mux.ServeHTTP(rr, req)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me/tickets", nil)
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	_ = json.Unmarshal(rr.Body.Bytes(), &wallet)
	claimID := wallet.Items[0].TicketID

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/tickets/"+claimID+"/transfer", strings.NewReader(`{"to_email":"guest.xfer@example.com"}`))
	req.Header.Set("Authorization", "Bearer "+attendee.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("pending transfer=%d %s", rr.Code, rr.Body.String())
	}
	claimTok := httpClaimToken(t, mail)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"guest.xfer@example.com","password":"correct-horse","display_name":"Guest","profile":"attendee"}`)))
	var guest sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &guest)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/tickets/claims/"+claimTok+"/accept", nil)
	req.Header.Set("Authorization", "Bearer "+dest.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/tickets/claims/"+claimTok+"/accept", nil)
	req.Header.Set("Authorization", "Bearer "+guest.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"qr_token"`) {
		t.Fatalf("accept=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me/tickets", nil)
	req.Header.Set("Authorization", "Bearer "+guest.AccessToken)
	mux.ServeHTTP(rr, req)
	_ = json.Unmarshal(rr.Body.Bytes(), &wallet)
	if len(wallet.Items) != 1 || wallet.Items[0].TicketID != claimID {
		t.Fatalf("guest wallet=%s", rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/tickets/claims/"+claimTok+"/accept", nil)
	req.Header.Set("Authorization", "Bearer "+guest.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusGone, apierr.Gone)
}

func httpClaimToken(t *testing.T, mail *mailer.Memory) string {
	t.Helper()
	msgs := mail.All()
	for i := len(msgs) - 1; i >= 0; i-- {
		raw := msgs[i].Vars["claim_url"]
		if raw == "" {
			continue
		}
		u, err := url.Parse(raw)
		if err != nil {
			t.Fatal(err)
		}
		tok := u.Query().Get("token")
		if tok == "" {
			t.Fatalf("claim_url=%s", raw)
		}
		return tok
	}
	t.Fatal("expected ticket_claim mail")
	return ""
}
