package auth

import (
	"context"
	"errors"
	"net/url"
	"strings"
	"testing"

	"github.com/parche-app/backend/internal/mailer"
)

func TestPatchMeAndPublicProfile(t *testing.T) {
	svc, store := testService(t)
	ctx := context.Background()
	sess, err := svc.Register(ctx, RegisterInput{
		Email: "ada@example.com", Password: "correct-horse", DisplayName: "Ada", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}
	name := "Ada Lovelace"
	bio := "Bogotá"
	phone := "+573001112233"
	me, err := svc.PatchMe(ctx, sess.User.ID, PatchMeInput{DisplayName: &name, Bio: &bio, Phone: &phone})
	if err != nil {
		t.Fatal(err)
	}
	if me.DisplayName != name || me.Bio != bio || me.Phone != phone {
		t.Fatalf("me=%+v", me)
	}
	if me.Tenants == nil || me.Memberships == nil {
		t.Fatal("must keep tenants and memberships slices")
	}

	long := strings.Repeat("ñ", 281)
	if _, err := svc.PatchMe(ctx, sess.User.ID, PatchMeInput{Bio: &long}); !errors.As(err, &Invalid{}) {
		t.Fatalf("bio length err=%v", err)
	}

	pub, err := svc.PublicProfile(ctx, sess.User.ID)
	if err != nil {
		t.Fatal(err)
	}
	if pub.DisplayName != name || pub.ID != sess.User.ID || pub.Phone != phone {
		t.Fatalf("public=%+v", pub)
	}

	bad := "12"
	if _, err := svc.PatchMe(ctx, sess.User.ID, PatchMeInput{Phone: &bad}); !errors.As(err, &Invalid{}) {
		t.Fatalf("phone err=%v", err)
	}

	store.SetStatus(sess.User.ID, StatusDisabled)
	if _, err := svc.PublicProfile(ctx, sess.User.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("disabled err=%v", err)
	}
}

func TestChangeEmailConfirm(t *testing.T) {
	svc, _ := testService(t)
	inbox := &mailer.Memory{}
	svc.Mailer = inbox
	svc.AppOrigin = "http://localhost:3000"
	ctx := context.Background()
	first, err := svc.Register(ctx, RegisterInput{
		Email: "old@example.com", Password: "correct-horse", DisplayName: "Ada", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}
	other, err := svc.Register(ctx, RegisterInput{
		Email: "taken@example.com", Password: "correct-horse", DisplayName: "Bob", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}

	if err := svc.ChangeEmail(ctx, first.User.ID, "not-an-email"); !errors.As(err, &Invalid{}) {
		t.Fatalf("invalid email err=%v", err)
	}
	if err := svc.ChangeEmail(ctx, first.User.ID, "old@example.com"); !errors.As(err, &Invalid{}) {
		t.Fatalf("unchanged err=%v", err)
	}
	if err := svc.ChangeEmail(ctx, first.User.ID, "taken@example.com"); !errors.Is(err, ErrEmailTaken) {
		t.Fatalf("taken err=%v", err)
	}
	if err := svc.ChangeEmail(ctx, first.User.ID, "new@example.com"); err != nil {
		t.Fatal(err)
	}
	msg, ok := inbox.Last()
	if !ok || msg.Template != mailer.TemplateEmailChange || msg.To != "new@example.com" {
		t.Fatalf("mail=%+v", msg)
	}
	u, err := url.Parse(msg.Vars["confirm_url"])
	if err != nil {
		t.Fatal(err)
	}
	tok := u.Query().Get("token")
	if tok == "" {
		t.Fatal("missing token")
	}

	if err := svc.ConfirmEmail(ctx, other.User.ID, tok); !errors.Is(err, ErrForbidden) {
		t.Fatalf("other user err=%v", err)
	}
	if err := svc.ConfirmEmail(ctx, first.User.ID, tok); err != nil {
		t.Fatal(err)
	}
	me, err := svc.Me(ctx, first.User.ID)
	if err != nil {
		t.Fatal(err)
	}
	if me.Email != "new@example.com" {
		t.Fatalf("email=%s", me.Email)
	}
	if err := svc.ConfirmEmail(ctx, first.User.ID, tok); !errors.Is(err, ErrGone) {
		t.Fatalf("reuse err=%v", err)
	}
}
