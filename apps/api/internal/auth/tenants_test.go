package auth

import (
	"context"
	"errors"
	"testing"
)

func TestPromoterRegisterLeavesUsableTenant(t *testing.T) {
	svc, _ := testService(t)
	ctx := context.Background()
	sess, err := svc.Register(ctx, RegisterInput{
		Email: "p@example.com", Password: "correct-horse", DisplayName: "Pez Alado", Profile: "promoter",
	})
	if err != nil {
		t.Fatal(err)
	}
	me, err := svc.Me(ctx, sess.User.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(me.Tenants) != 1 || me.Tenants[0].Role != TenantOwner || me.Tenants[0].Name != "Pez Alado" {
		t.Fatalf("tenants=%+v", me.Tenants)
	}
	if me.Tenant == nil || me.Tenant.ID != me.Tenants[0].ID {
		t.Fatalf("tenant alias=%+v", me.Tenant)
	}
	ok, err := svc.CanCreateEvents(ctx, sess.User.ID)
	if err != nil || !ok {
		t.Fatalf("promoter should create events, ok=%v err=%v", ok, err)
	}
	got, err := svc.GetTenant(ctx, sess.User.ID, me.Tenants[0].ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Currency != DefaultTenantCurrency || got.Status != StatusActive {
		t.Fatalf("tenant=%+v", got)
	}
}

func TestAttendeeCannotCreateTenantOrEvents(t *testing.T) {
	svc, _ := testService(t)
	ctx := context.Background()
	sess, err := svc.Register(ctx, RegisterInput{
		Email: "a@example.com", Password: "correct-horse", DisplayName: "Ada", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}
	ok, err := svc.CanCreateEvents(ctx, sess.User.ID)
	if err != nil || ok {
		t.Fatalf("attendee must not create events, ok=%v err=%v", ok, err)
	}
	_, err = svc.CreateTenant(ctx, sess.User.ID, CreateTenantInput{Name: "Pez Alado"})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("err=%v", err)
	}
}

func TestArtistProfileIdempotentAndNoTenant(t *testing.T) {
	svc, _ := testService(t)
	ctx := context.Background()
	sess, err := svc.Register(ctx, RegisterInput{
		Email: "dj@example.com", Password: "correct-horse", DisplayName: "DJ", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.AddArtistProfile(ctx, sess.User.ID); err != nil {
		t.Fatal(err)
	}
	if err := svc.AddArtistProfile(ctx, sess.User.ID); err != nil {
		t.Fatal(err)
	}
	me, err := svc.Me(ctx, sess.User.ID)
	if err != nil {
		t.Fatal(err)
	}
	if !hasProfile(me.Profiles, ProfileArtist) || !hasProfile(me.Profiles, ProfileAttendee) {
		t.Fatalf("profiles=%v", me.Profiles)
	}
	if len(me.Tenants) != 0 {
		t.Fatalf("artist profile must not mint a tenant: %+v", me.Tenants)
	}
	ok, err := svc.CanCreateEvents(ctx, sess.User.ID)
	if err != nil || ok {
		t.Fatalf("artist-only must not create events/metrics surface, ok=%v err=%v", ok, err)
	}
}

func TestPlatformAdminNotSelfServe(t *testing.T) {
	svc, _ := testService(t)
	ctx := context.Background()
	sess, err := svc.Register(ctx, RegisterInput{
		Email: "a@example.com", Password: "correct-horse", DisplayName: "Ada", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.SelfAssignProfile(ctx, sess.User.ID, ProfilePlatformAdmin); !errors.Is(err, ErrForbidden) {
		t.Fatalf("err=%v", err)
	}
	ok, err := svc.HasProfile(ctx, sess.User.ID, ProfilePlatformAdmin)
	if err != nil || ok {
		t.Fatalf("must not persist admin, ok=%v err=%v", ok, err)
	}
}

func TestTenantMembersAndLastOwner(t *testing.T) {
	svc, _ := testService(t)
	ctx := context.Background()
	owner, err := svc.Register(ctx, RegisterInput{
		Email: "own@example.com", Password: "correct-horse", DisplayName: "Owner", Profile: "promoter",
	})
	if err != nil {
		t.Fatal(err)
	}
	staff, err := svc.Register(ctx, RegisterInput{
		Email: "st@example.com", Password: "correct-horse", DisplayName: "Staff", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}
	me, err := svc.Me(ctx, owner.User.ID)
	if err != nil {
		t.Fatal(err)
	}
	tid := me.Tenants[0].ID

	second, err := svc.CreateTenant(ctx, owner.User.ID, CreateTenantInput{Name: "Segundo Parche"})
	if err != nil {
		t.Fatal(err)
	}
	if second.ID == tid {
		t.Fatal("N tenants per promoter")
	}

	added, err := svc.AddMember(ctx, owner.User.ID, tid, AddMemberInput{Email: "st@example.com"})
	if err != nil {
		t.Fatal(err)
	}
	if added.Role != TenantStaff || added.UserID != staff.User.ID {
		t.Fatalf("member=%+v", added)
	}
	_, err = svc.AddMember(ctx, owner.User.ID, tid, AddMemberInput{UserID: staff.User.ID})
	if !errors.Is(err, ErrConflict) {
		t.Fatalf("dup err=%v", err)
	}

	items, err := svc.ListMembers(ctx, owner.User.ID, tid)
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 2 {
		t.Fatalf("members=%d", len(items))
	}

	_, err = svc.ListMembers(ctx, staff.User.ID, tid)
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("staff list err=%v", err)
	}

	patched, err := svc.PatchTenant(ctx, owner.User.ID, tid, PatchTenantInput{Currency: ptr("USD")})
	if err != nil {
		t.Fatal(err)
	}
	if patched.Currency != "USD" {
		t.Fatalf("currency=%s", patched.Currency)
	}
	_, err = svc.PatchTenant(ctx, staff.User.ID, tid, PatchTenantInput{Name: ptr("Nope")})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("staff patch err=%v", err)
	}

	if _, err := svc.GetTenant(ctx, staff.User.ID, tid); err != nil {
		t.Fatalf("staff should read tenant: %v", err)
	}

	stranger, err := svc.Register(ctx, RegisterInput{
		Email: "x@example.com", Password: "correct-horse", DisplayName: "X", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.GetTenant(ctx, stranger.User.ID, tid); !errors.Is(err, ErrNotFound) {
		t.Fatalf("stranger err=%v", err)
	}

	if err := svc.RemoveMember(ctx, owner.User.ID, tid, owner.User.ID); !errors.Is(err, ErrLastOwner) {
		t.Fatalf("last owner err=%v", err)
	}
	if err := svc.RemoveMember(ctx, owner.User.ID, tid, staff.User.ID); err != nil {
		t.Fatal(err)
	}
	items, err = svc.ListMembers(ctx, owner.User.ID, tid)
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 {
		t.Fatalf("after remove members=%d", len(items))
	}
}

func ptr(s string) *string { return &s }
