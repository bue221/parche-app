package auth

import (
	"context"
	"errors"
	"testing"

	"github.com/parche-app/backend/internal/mailer"
)

func TestBootstrapAndLastAdmin(t *testing.T) {
	svc, store := testService(t)
	ctx := context.Background()
	first, err := svc.Register(ctx, RegisterInput{
		Email: "ops@example.com", Password: "correct-horse", DisplayName: "Ops", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.BootstrapPlatformAdmin(ctx, "ops@example.com"); err != nil {
		t.Fatal(err)
	}
	if err := svc.BootstrapPlatformAdmin(ctx, "missing@example.com"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing bootstrap err=%v", err)
	}
	ok, err := svc.HasProfile(ctx, first.User.ID, ProfilePlatformAdmin)
	if err != nil || !ok {
		t.Fatalf("bootstrap profile ok=%v err=%v", ok, err)
	}
	if err := svc.DisableUser(ctx, first.User.ID, first.User.ID); !errors.Is(err, ErrLastAdmin) {
		t.Fatalf("last admin disable err=%v", err)
	}

	other, err := svc.Register(ctx, RegisterInput{
		Email: "ops2@example.com", Password: "correct-horse", DisplayName: "Ops2", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.MutateAdminProfile(ctx, first.User.ID, other.User.ID, AdminProfileInput{Profile: ProfilePlatformAdmin, Op: "add"}); err != nil {
		t.Fatal(err)
	}
	if err := svc.MutateAdminProfile(ctx, first.User.ID, first.User.ID, AdminProfileInput{Profile: ProfilePlatformAdmin, Op: "remove"}); err != nil {
		t.Fatal(err)
	}
	if err := svc.MutateAdminProfile(ctx, other.User.ID, other.User.ID, AdminProfileInput{Profile: ProfilePlatformAdmin, Op: "remove"}); !errors.Is(err, ErrLastAdmin) {
		t.Fatalf("last profile remove err=%v", err)
	}
	_ = store
}

func TestBroadcastSkipsOptOut(t *testing.T) {
	svc, _ := testService(t)
	box := &mailer.Memory{}
	svc.Mailer = box
	svc.AppOrigin = "http://localhost:3000"
	ctx := context.Background()
	admin, err := svc.Register(ctx, RegisterInput{
		Email: "ops@example.com", Password: "correct-horse", DisplayName: "Ops", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.BootstrapPlatformAdmin(ctx, "ops@example.com"); err != nil {
		t.Fatal(err)
	}
	fan, err := svc.Register(ctx, RegisterInput{
		Email: "fan@example.com", Password: "correct-horse", DisplayName: "Fan", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}
	n, err := svc.Broadcast(ctx, admin.User.ID, BroadcastInput{Audience: "all_attendees", Vars: map[string]string{"digest_body": "hola"}}, nil, nil)
	if err != nil || n < 2 {
		t.Fatalf("queued=%d err=%v", n, err)
	}
	if err := svc.OptOutEmail(ctx, fan.User.ID); err != nil {
		t.Fatal(err)
	}
	n2, err := svc.Broadcast(ctx, admin.User.ID, BroadcastInput{Audience: "all_attendees", Vars: map[string]string{"digest_body": "otra"}}, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	for _, msg := range box.All()[n:] {
		if msg.ToUserID == fan.User.ID {
			t.Fatalf("opted out %+v", msg)
		}
	}
	if n2 != n-1 {
		t.Fatalf("after opt-out queued=%d before=%d", n2, n)
	}
}
