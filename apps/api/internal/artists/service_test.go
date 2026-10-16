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

func TestFollowIdempotentAndList(t *testing.T) {
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
	fan, err := asvc.Register(ctx, auth.RegisterInput{Email: "fan@example.com", Password: "correct-horse", DisplayName: "Fan", Profile: "attendee"})
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
	if err := svc.Follow(ctx, fan.User.ID, a.ID); err != nil {
		t.Fatal(err)
	}
	if err := svc.Follow(ctx, fan.User.ID, a.ID); err != nil {
		t.Fatalf("dup follow=%v", err)
	}
	if err := svc.Follow(ctx, dj.User.ID, a.ID); err != nil {
		t.Fatalf("self follow=%v", err)
	}
	got, err := svc.Get(ctx, a.ID)
	if err != nil || got.FollowersCount != 2 {
		t.Fatalf("count=%v %+v", err, got)
	}
	ids, err := svc.FollowerUserIDs(ctx, a.ID)
	if err != nil || len(ids) != 2 {
		t.Fatalf("follower ids=%v %v", ids, err)
	}
	items, next, err := svc.ListFollowing(ctx, fan.User.ID, FollowFilter{Limit: 20})
	if err != nil || next != nil || len(items) != 1 || items[0].ID != a.ID {
		t.Fatalf("following=%v next=%v %v", items, next, err)
	}
	if err := svc.Unfollow(ctx, fan.User.ID, a.ID); err != nil {
		t.Fatal(err)
	}
	if err := svc.Unfollow(ctx, fan.User.ID, a.ID); err != nil {
		t.Fatalf("dup unfollow=%v", err)
	}
	got, err = svc.Get(ctx, a.ID)
	if err != nil || got.FollowersCount != 1 {
		t.Fatalf("after unfollow count=%v %+v", err, got)
	}
	items, _, err = svc.ListFollowing(ctx, fan.User.ID, FollowFilter{Limit: 20})
	if err != nil || len(items) != 0 {
		t.Fatalf("empty following=%v %v", items, err)
	}
	missing := "11111111-1111-4111-8111-111111111111"
	if err := svc.Follow(ctx, fan.User.ID, missing); !errors.Is(err, auth.ErrNotFound) {
		t.Fatalf("missing=%v", err)
	}
}
