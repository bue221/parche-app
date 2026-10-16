package ticketsign

import (
	"errors"
	"strings"
	"testing"
	"time"
)

func TestParseAndRoundTrip(t *testing.T) {
	const secret = "ticket-signing-key-32-bytes-min!!"
	k, err := Parse(secret, "")
	if err != nil {
		t.Fatal(err)
	}
	if k.ActiveKid() != "v1" {
		t.Fatalf("kid=%s", k.ActiveKid())
	}
	iat := time.Date(2026, 9, 11, 18, 0, 0, 0, time.UTC)
	exp := iat.Add(6 * time.Hour)
	tok, err := k.Sign(Claims{TicketID: "tid", EventID: "eid", JWTID: "jti-1", IssuedAt: iat, ExpiresAt: exp})
	if err != nil {
		t.Fatal(err)
	}
	again, err := k.Sign(Claims{TicketID: "tid", EventID: "eid", JWTID: "jti-1", IssuedAt: iat, ExpiresAt: exp})
	if err != nil || again != tok {
		t.Fatalf("re-sign must be identical")
	}
	got, err := k.Verify(tok, iat.Add(time.Minute))
	if err != nil {
		t.Fatal(err)
	}
	if got.TicketID != "tid" || got.EventID != "eid" || got.JWTID != "jti-1" || got.Kid != "v1" {
		t.Fatalf("%+v", got)
	}
	if _, err := k.Verify(tok, exp.Add(time.Minute)); !errors.Is(err, ErrExpired) {
		t.Fatalf("exp=%v", err)
	}
}

func TestParseKeysJSONGraceKid(t *testing.T) {
	const k1 = "old-ticket-signing-key-32-bytes!!"
	const k2 = "new-ticket-signing-key-32-bytes!!"
	ring, err := Parse("", `[{"kid":"2026-09","key":"`+k2+`"},{"kid":"2026-08","key":"`+k1+`"}]`)
	if err != nil {
		t.Fatal(err)
	}
	if ring.ActiveKid() != "2026-09" {
		t.Fatalf("active=%s", ring.ActiveKid())
	}
	grace, err := Parse("", `[{"kid":"2026-08","key":"`+k1+`"}]`)
	if err != nil {
		t.Fatal(err)
	}
	tok, err := grace.Sign(Claims{
		TicketID: "t", EventID: "e", JWTID: "j",
		IssuedAt: time.Unix(1, 0), ExpiresAt: time.Unix(9_999_999_999, 0),
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ring.Verify(tok, time.Unix(10, 0)); err != nil {
		t.Fatalf("grace verify: %v", err)
	}
	if !strings.Contains(tok, ".") {
		t.Fatal("compact jws")
	}
}

func TestParseRejectsShortAndAccessCollisionShape(t *testing.T) {
	if _, err := Parse("short", ""); !errors.Is(err, ErrShortKey) {
		t.Fatalf("short=%v", err)
	}
	if _, err := Parse("", ""); !errors.Is(err, ErrMissingKey) {
		t.Fatalf("missing=%v", err)
	}
	if _, err := Parse("", `{"nope":true}`); err == nil {
		t.Fatal("expected json error")
	}
}
