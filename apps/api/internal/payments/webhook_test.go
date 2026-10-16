package payments

import (
	"testing"
	"time"
)

func TestSignAndVerify(t *testing.T) {
	secret := "change-me-webhook-dev-only"
	now := time.Date(2026, 9, 11, 21, 0, 0, 0, time.UTC)
	body := []byte(`{"provider_event_id":"evt_1","order_id":"o1","status":"success"}`)
	sig := Sign(secret, now, body)
	if err := Verify(secret, now, sig, body); err != nil {
		t.Fatal(err)
	}
	if err := Verify(secret, now, sig, []byte(`{"tampered":true}`)); err != ErrBadSignature {
		t.Fatalf("tamper=%v", err)
	}
	if err := Verify("other", now, sig, body); err != ErrBadSignature {
		t.Fatalf("wrong secret=%v", err)
	}
	if err := Verify(secret, now.Add(6*time.Minute), sig, body); err != ErrReplay {
		t.Fatalf("replay=%v", err)
	}
}

func TestParseEvent(t *testing.T) {
	ev, err := ParseEvent([]byte(`{"provider_event_id":" evt ","order_id":"o","status":"SUCCESS"}`))
	if err != nil || ev.Status != "success" || ev.ProviderEventID != "evt" {
		t.Fatalf("%+v %v", ev, err)
	}
	if _, err := ParseEvent([]byte(`{"provider_event_id":"e","order_id":"o","status":"pending"}`)); err != ErrPayload {
		t.Fatalf("pending=%v", err)
	}
}
