package events

import (
	"context"
	"errors"
	"net/url"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/mailer"
	"github.com/parche-app/backend/internal/venues"
)

func TestPermissionMatrixAndTwoDoors(t *testing.T) {
	ctx, svc, mail, owner, _, eventID := memberFixture(t)
	doorA := mustUser(t, svc.Tenancy.(*auth.Memory), "door-a@example.com", auth.ProfileAttendee)
	doorB := mustUser(t, svc.Tenancy.(*auth.Memory), "door-b@example.com", auth.ProfileAttendee)
	metrics := mustUser(t, svc.Tenancy.(*auth.Memory), "metrics@example.com", auth.ProfileAttendee)

	acceptRole(t, svc, mail, owner, eventID, doorA, RoleDoor)
	acceptRole(t, svc, mail, owner, eventID, doorB, RoleDoor)
	acceptRole(t, svc, mail, owner, eventID, metrics, RoleMetrics)

	cases := []struct {
		user string
		perm string
		want bool
	}{
		{owner, PermWrite, true},
		{owner, PermDoorScan, true},
		{owner, PermMembersManage, true},
		{doorA, PermDoorScan, true},
		{doorA, PermWrite, false},
		{doorA, PermMetricsRead, false},
		{doorB, PermDoorScan, true},
		{doorB, PermMembersManage, false},
		{metrics, PermMetricsRead, true},
		{metrics, PermDoorScan, false},
		{metrics, PermWrite, false},
	}
	for _, tc := range cases {
		got, err := svc.HasPermission(ctx, tc.user, eventID, tc.perm)
		if err != nil {
			t.Fatalf("%s %s: %v", tc.user, tc.perm, err)
		}
		if got != tc.want {
			t.Fatalf("%s %s got %v want %v", tc.user, tc.perm, got, tc.want)
		}
	}

	if _, err := svc.Authorize(ctx, doorA, eventID); !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("door EventWrite=%v", err)
	}
	if _, err := svc.Authorize(ctx, owner, eventID); err != nil {
		t.Fatalf("owner EventWrite=%v", err)
	}

	if _, err := svc.ListMembers(ctx, doorA, eventID); !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("door list=%v", err)
	}
	items, err := svc.ListMembers(ctx, owner, eventID)
	if err != nil || len(items) != 4 {
		t.Fatalf("list=%d %v", len(items), err)
	}
}

func TestRevokeInvalidatesScanPermission(t *testing.T) {
	ctx, svc, mail, owner, _, eventID := memberFixture(t)
	door := mustUser(t, svc.Tenancy.(*auth.Memory), "scan@example.com", auth.ProfileAttendee)
	acceptRole(t, svc, mail, owner, eventID, door, RoleDoor)

	ok, err := svc.HasPermission(ctx, door, eventID, PermDoorScan)
	if err != nil || !ok {
		t.Fatalf("before revoke=%v %v", ok, err)
	}
	if err := svc.RevokeMember(ctx, owner, eventID, door); err != nil {
		t.Fatal(err)
	}
	ok, err = svc.HasPermission(ctx, door, eventID, PermDoorScan)
	if err != nil || ok {
		t.Fatalf("after revoke scan must be false: %v %v", ok, err)
	}
	if err := svc.RevokeMember(ctx, owner, eventID, owner); !errors.Is(err, auth.ErrConflict) {
		t.Fatalf("last owner=%v", err)
	}
}

func TestInviteUnknownEmailAndAcceptMismatch(t *testing.T) {
	ctx, svc, mail, owner, _, eventID := memberFixture(t)
	created, err := svc.InviteMember(ctx, owner, eventID, InviteInput{Email: "new.door@example.com", Role: RoleDoor})
	if err != nil || created.ID == "" || created.ExpiresAt.IsZero() {
		t.Fatalf("unknown email invite=%+v %v", created, err)
	}
	if mail.Len() != 1 || mail.Msgs[0].Template != mailer.TemplateEventInvite {
		t.Fatalf("mail=%+v", mail.Msgs)
	}
	token := inviteToken(t, mail)
	stranger := mustUser(t, svc.Tenancy.(*auth.Memory), "other@example.com", auth.ProfileAttendee)
	if err := svc.AcceptInvite(ctx, stranger, token); !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("mismatch=%v", err)
	}
	invitee := mustUser(t, svc.Tenancy.(*auth.Memory), "new.door@example.com", auth.ProfileAttendee)
	if err := svc.AcceptInvite(ctx, invitee, token); err != nil {
		t.Fatal(err)
	}
	ok, err := svc.HasPermission(ctx, invitee, eventID, PermDoorScan)
	if err != nil || !ok {
		t.Fatalf("accepted scan=%v %v", ok, err)
	}
	mine, err := svc.ListEventMemberships(ctx, invitee)
	if err != nil || len(mine) != 1 || mine[0].EventID != eventID || mine[0].Role != RoleDoor {
		t.Fatalf("memberships=%+v %v", mine, err)
	}
}

func TestInviteOwnerRoleAndTransfer(t *testing.T) {
	ctx, svc, mail, owner, _, eventID := memberFixture(t)
	_, err := svc.InviteMember(ctx, owner, eventID, InviteInput{Email: "x@example.com", Role: RoleOwner})
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("invite owner=%v", err)
	}
	manager := mustUser(t, svc.Tenancy.(*auth.Memory), "mgr@example.com", auth.ProfileAttendee)
	acceptRole(t, svc, mail, owner, eventID, manager, RoleManager)
	if err := svc.TransferOwnership(ctx, owner, eventID, manager); err != nil {
		t.Fatal(err)
	}
	ok, err := svc.HasPermission(ctx, manager, eventID, PermWrite)
	if err != nil || !ok {
		t.Fatalf("new owner write=%v %v", ok, err)
	}
	role, err := svc.memberRole(ctx, eventID, owner)
	if err != nil || role != RoleManager {
		t.Fatalf("old owner=%s %v", role, err)
	}
	if _, err := svc.PatchMember(ctx, manager, eventID, manager, RoleDoor); !errors.Is(err, auth.ErrConflict) {
		t.Fatalf("degrade last owner=%v", err)
	}
}

func memberFixture(t *testing.T) (context.Context, *Service, *mailer.Memory, string, string, string) {
	t.Helper()
	ctx := context.Background()
	now := time.Date(2026, 9, 11, 18, 0, 0, 0, time.UTC)
	authStore := auth.NewMemory()
	vmem := venues.NewMemory()
	vsvc := venues.NewService(vmem, authStore)
	mail := &mailer.Memory{}
	svc := NewService(NewMemory(), authStore, vsvc, vmem, NewMemoryCache())
	svc.Now = func() time.Time { return now }
	svc.Mailer = mail
	svc.Pepper = []byte("invite-pepper")
	svc.AppOrigin = "http://localhost:3000"
	owner := mustUser(t, authStore, "p@example.com", "promoter")
	tenant := mustTenant(t, authStore, owner)
	draft, err := svc.Create(ctx, owner, CreateInput{
		TenantID: tenant, Title: "Norte",
		StartsAt: now.Add(24 * time.Hour), EndsAt: now.Add(28 * time.Hour),
		Pin: &PinInput{Name: "Video Norte", Lat: 4.75, Lng: -74.05},
	})
	if err != nil {
		t.Fatal(err)
	}
	return ctx, svc, mail, owner, tenant, draft.ID
}

func acceptRole(t *testing.T, svc *Service, mail *mailer.Memory, owner, eventID, userID, role string) {
	t.Helper()
	u, err := svc.Tenancy.UserByID(context.Background(), userID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.InviteMember(context.Background(), owner, eventID, InviteInput{Email: u.Email, Role: role}); err != nil {
		t.Fatal(err)
	}
	if err := svc.AcceptInvite(context.Background(), userID, inviteToken(t, mail)); err != nil {
		t.Fatal(err)
	}
}

func inviteToken(t *testing.T, mail *mailer.Memory) string {
	t.Helper()
	msg, ok := mail.Last()
	if !ok {
		t.Fatal("expected invite mail")
	}
	raw := msg.Vars["invite_url"]
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatal(err)
	}
	tok := u.Query().Get("token")
	if tok == "" {
		t.Fatalf("invite_url=%s", raw)
	}
	return tok
}
