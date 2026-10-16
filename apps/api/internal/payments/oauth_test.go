package payments

import (
	"strings"
	"testing"
	"time"
)

func TestOAuthStateRoundTrip(t *testing.T) {
	o := OAuth{
		ClientID:     "app",
		ClientSecret: "secret",
		RedirectURL:  "https://api.example/v1/payments/mercadopago/oauth/callback",
		StateKey:     []byte("state-key-32-bytes-minimum!!!!"),
		Now:          func() time.Time { return time.Date(2026, 9, 20, 12, 0, 0, 0, time.UTC) },
	}
	state := o.SignState("tenant-1", "user-9")
	tid, uid, err := o.ParseState(state)
	if err != nil || tid != "tenant-1" || uid != "user-9" {
		t.Fatalf("%s %s %v", tid, uid, err)
	}
	if _, _, err := o.ParseState(state + "x"); err == nil {
		t.Fatal("tamper")
	}
}

func TestOAuthAuthorizationURL(t *testing.T) {
	o := OAuth{
		ClientID:     "396538344466862",
		ClientSecret: "secret",
		RedirectURL:  "https://api.example/callback",
		StateKey:     []byte("k"),
	}
	u, err := o.AuthorizationURL("abc")
	if err != nil {
		t.Fatal(err)
	}
	for _, part := range []string{
		"https://auth.mercadopago.com/authorization",
		"client_id=396538344466862",
		"response_type=code",
		"platform_id=mp",
	} {
		if !strings.Contains(u, part) {
			t.Fatalf("missing %q in %s", part, u)
		}
	}
}
