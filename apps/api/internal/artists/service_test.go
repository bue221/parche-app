package artists

import (
	"context"
	"errors"
	"testing"

	"github.com/parche-app/backend/internal/auth"
)

func TestCreateClaimedAndConflict(t *testing.T) {
	ctx := context.Background()
	users := auth.NewMemory()
	tokens := &auth.Tokens{AccessSecret: []byte("0123456789abcdef0123456789abcdef"), RefreshPepper: []byte("pepper-secret")}
	asvc, err := auth.NewService(users, tokens, auth.FastArgon2(), nil)
	if err != nil {
		t.Fatal(err)
	}
	dj, err := asvc.Register(ctx, auth.RegisterInput{Email: "dj@example.com", Password: "correct-horse", DisplayName: "DJ", Profile: "attendee"})
	if err != nil {
		t.Fatal(err)
	}
	if err := asvc.AddArtistProfile(ctx, dj.User.ID); err != nil {
		t.Fatal(err)
	}
	svc := NewService(NewMemory(), users)
	a, err := svc.Create(ctx, dj.User.ID, CreateInput{Name: "Norte Bass"})
	if err != nil {
		t.Fatal(err)
	}
	if a.UserID != dj.User.ID || a.TenantID != "" {
		t.Fatalf("claimed=%+v", a)
	}
	if _, err := svc.Create(ctx, dj.User.ID, CreateInput{Name: "Again"}); !errors.Is(err, auth.ErrConflict) {
		t.Fatalf("second=%v", err)
	}
}

func TestPromoterActAndLineupConflict(t *testing.T) {
	ctx := context.Background()
	users := auth.NewMemory()
	tokens := &auth.Tokens{AccessSecret: []byte("0123456789abcdef0123456789abcdef"), RefreshPepper: []byte("pepper-secret")}
	asvc, err := auth.NewService(users, tokens, auth.FastArgon2(), nil)
	if err != nil {
		t.Fatal(err)
	}
	p, err := asvc.Register(ctx, auth.RegisterInput{Email: "p@example.com", Password: "correct-horse", DisplayName: "Pez", Profile: "promoter"})
	if err != nil {
		t.Fatal(err)
	}
	tenants, err := users.TenantsForUser(ctx, p.User.ID)
	if err != nil || len(tenants) == 0 {
		t.Fatalf("tenant=%v %v", tenants, err)
	}
	tid := tenants[0].ID
	svc := NewService(NewMemory(), users)
	act, err := svc.Create(ctx, p.User.ID, CreateInput{Name: "Guest Act", TenantID: tid})
	if err != nil {
		t.Fatal(err)
	}
	if act.UserID != "" || act.TenantID != tid {
		t.Fatalf("act=%+v", act)
	}
	eventID := "11111111-1111-4111-8111-111111111111"
	if err := svc.AddLineup(ctx, eventID, LineupInput{ArtistID: act.ID, BillingOrder: 1}); err != nil {
		t.Fatal(err)
	}
	if err := svc.AddLineup(ctx, eventID, LineupInput{ArtistID: act.ID, BillingOrder: 2}); !errors.Is(err, auth.ErrConflict) {
		t.Fatalf("dup=%v", err)
	}
	slots, err := svc.EventLineup(ctx, eventID)
	if err != nil || len(slots) != 1 || slots[0].Name != "Guest Act" {
		t.Fatalf("lineup=%v %v", slots, err)
	}
}

func TestPatchOwnerOnly(t *testing.T) {
	ctx := context.Background()
	users := auth.NewMemory()
	tokens := &auth.Tokens{AccessSecret: []byte("0123456789abcdef0123456789abcdef"), RefreshPepper: []byte("pepper-secret")}
	asvc, err := auth.NewService(users, tokens, auth.FastArgon2(), nil)
	if err != nil {
		t.Fatal(err)
	}
	dj, err := asvc.Register(ctx, auth.RegisterInput{Email: "a@example.com", Password: "correct-horse", DisplayName: "Ada", Profile: "attendee"})
	if err != nil {
		t.Fatal(err)
	}
	stranger, err := asvc.Register(ctx, auth.RegisterInput{Email: "s@example.com", Password: "correct-horse", DisplayName: "Sam", Profile: "attendee"})
	if err != nil {
		t.Fatal(err)
	}
	if err := asvc.AddArtistProfile(ctx, dj.User.ID); err != nil {
		t.Fatal(err)
	}
	svc := NewService(NewMemory(), users)
	a, err := svc.Create(ctx, dj.User.ID, CreateInput{Name: "Ada"})
	if err != nil {
		t.Fatal(err)
	}
	name := "Ada Remix"
	if _, err := svc.Patch(ctx, stranger.User.ID, a.ID, PatchInput{Name: &name}); !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("hijack=%v", err)
	}
	got, err := svc.Patch(ctx, dj.User.ID, a.ID, PatchInput{Name: &name})
	if err != nil || got.Name != name {
		t.Fatalf("owner patch=%v %+v", err, got)
	}
}
