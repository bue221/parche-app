package payments

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/mercadopago/sdk-go/pkg/payment"
)

func TestVerifyMercadoPagoSignature(t *testing.T) {
	secret := "whsec-test"
	dataID := "999999999"
	reqID := "req-1"
	ts := "1704908010"
	manifest := "id:" + strings.ToLower(dataID) + ";request-id:" + reqID + ";ts:" + ts + ";"
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(manifest))
	sig := "ts=" + ts + ",v1=" + hex.EncodeToString(mac.Sum(nil))

	body := []byte(`{"type":"payment","data":{"id":"999999999"}}`)
	r := httptest.NewRequest(http.MethodPost, "/v1/payments/webhook?data.id=999999999&type=payment", strings.NewReader(string(body)))
	r.Header.Set("x-signature", sig)
	r.Header.Set("x-request-id", reqID)
	if err := VerifyMercadoPago(secret, r, body, time.Now().UTC()); err != nil {
		t.Fatal(err)
	}
	r.Header.Set("x-signature", sig+"ff")
	if err := VerifyMercadoPago(secret, r, body, time.Now().UTC()); err != ErrBadSignature {
		t.Fatalf("tamper=%v", err)
	}
}

func TestLooksLikeMercadoPago(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/v1/payments/webhook?topic=payment&data.id=12", nil)
	r.Header.Set("x-signature", "ts=1,v1=abc")
	if !LooksLikeMercadoPago(r, nil) {
		t.Fatal("x-signature")
	}
	body := []byte(`{"type":"payment","data":{"id":"12"}}`)
	if !LooksLikeMercadoPago(httptest.NewRequest(http.MethodPost, "/v1/payments/webhook", strings.NewReader(string(body))), body) {
		t.Fatal("json body")
	}
	fake := []byte(`{"order_id":"ord-1","status":"success"}`)
	if LooksLikeMercadoPago(httptest.NewRequest(http.MethodPost, "/v1/payments/webhook", strings.NewReader(string(fake))), fake) {
		t.Fatal("fake hmac payload must not look like Mercado Pago")
	}
}

func TestEventFromPayment(t *testing.T) {
	ev, err := EventFromPayment(&payment.Response{ID: 12, Status: "approved", ExternalReference: "ord-1"})
	if err != nil || ev.Status != "success" || ev.ProviderEventID != "12" || ev.OrderID != "ord-1" {
		t.Fatalf("%+v %v", ev, err)
	}
	ev, err = EventFromPayment(&payment.Response{ID: 12, Status: "pending", ExternalReference: "ord-1"})
	if err != nil || ev.OrderID != "" {
		t.Fatalf("pending should be ignored: %+v %v", ev, err)
	}
	ev, err = EventFromPayment(&payment.Response{ID: 9, Status: "rejected", ExternalReference: "ord-1"})
	if err != nil || ev.Status != "failed" {
		t.Fatalf("rejected=%+v %v", ev, err)
	}
}
