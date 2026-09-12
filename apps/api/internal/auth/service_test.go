package auth

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/mailer"
)

func testService(t *testing.T) (*Service, *Memory) {
	t.Helper()
	store := NewMemory()
	tokens := &Tokens{
		AccessSecret:  []byte("0123456789abcdef0123456789abcdef"),
		RefreshPepper: []byte("refresh-pepper-32-bytes-minimum!"),
	}
	svc, err := NewService(store, tokens, FastArgon2(), slog.New(slog.NewJSONHandler(io.Discard, nil)))
	if err != nil {
		t.Fatal(err)
	}
	return svc, store
}

func TestRegisterLoginRefreshRotation(t *testing.T) {
	svc, _ := testService(t)
	ctx := context.Background()
	first, err := svc.Register(ctx, RegisterInput{
		Email: "  Ada@Example.COM ", Password: "correct-horse", DisplayName: "Ada", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}
	if first.User.Email != "ada@example.com" {
		t.Fatalf("email=%s", first.User.Email)
	}
	if first.AccessToken == "" || first.RefreshToken == "" {
		t.Fatal("expected tokens")
	}
	if first.AccessExpiresAt.Sub(first.RefreshExpiresAt) >= 0 {
		t.Fatal("access should expire before refresh")
	}
	if first.AccessExpiresAt.Sub(svc.now()) >= 15*time.Minute {
		t.Fatalf("access ttl must be < 15m, exp=%s", first.AccessExpiresAt)
	}
	if strings.Contains(strings.ToLower(first.RefreshToken), "argon2") {
		t.Fatal("refresh must not be a password hash")
	}

	login, err := svc.Login(ctx, LoginInput{Email: "ada@example.com", Password: "correct-horse"})
	if err != nil {
		t.Fatal(err)
	}

	rotated, err := svc.Refresh(ctx, login.RefreshToken, "ua")
	if err != nil {
		t.Fatal(err)
	}
	if rotated.RefreshToken == login.RefreshToken {
		t.Fatal("refresh must rotate")
	}

	_, err = svc.Refresh(ctx, login.RefreshToken, "ua")
	if !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("reuse err=%v", err)
	}
	_, err = svc.Refresh(ctx, rotated.RefreshToken, "ua")
	if !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("family must die after reuse, err=%v", err)
	}
}

func TestLoginGenericAndDisabled(t *testing.T) {
	svc, store := testService(t)
	ctx := context.Background()
	sess, err := svc.Register(ctx, RegisterInput{
		Email: "u@example.com", Password: "correct-horse", DisplayName: "U", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}

	_, err = svc.Login(ctx, LoginInput{Email: "missing@example.com", Password: "correct-horse"})
	if !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("missing user err=%v", err)
	}
	_, err = svc.Login(ctx, LoginInput{Email: "u@example.com", Password: "wrong-password"})
	if !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("bad password err=%v", err)
	}

	store.SetStatus(sess.User.ID, StatusDisabled)
	_, err = svc.Login(ctx, LoginInput{Email: "u@example.com", Password: "correct-horse"})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("disabled err=%v", err)
	}
}

func TestRegisterEmailTakenAndPasswordRules(t *testing.T) {
	svc, _ := testService(t)
	ctx := context.Background()
	_, err := svc.Register(ctx, RegisterInput{
		Email: "dup@example.com", Password: "correct-horse", DisplayName: "A", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}
	_, err = svc.Register(ctx, RegisterInput{
		Email: "dup@example.com", Password: "correct-horse", DisplayName: "B", Profile: "attendee",
	})
	if !errors.Is(err, ErrEmailTaken) {
		t.Fatalf("err=%v", err)
	}

	_, err = svc.Register(ctx, RegisterInput{
		Email: "n@example.com", Password: "1234567890", DisplayName: "N", Profile: "attendee",
	})
	var inv Invalid
	if !errors.As(err, &inv) {
		t.Fatalf("err=%v", err)
	}

	_, err = svc.Register(ctx, RegisterInput{
		Email: "s@example.com", Password: "short", DisplayName: "S", Profile: "attendee",
	})
	if !errors.As(err, &inv) {
		t.Fatalf("err=%v", err)
	}
}

func TestPromoterGetsTenantStub(t *testing.T) {
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
	if me.Tenant == nil || me.Tenant.Name != "Pez Alado" || me.Tenant.Role != TenantOwner {
		t.Fatalf("tenant=%+v", me.Tenant)
	}
	if len(me.Tenants) != 1 || me.Tenants[0].ID != me.Tenant.ID {
		t.Fatalf("tenants=%+v", me.Tenants)
	}
	if len(me.Profiles) != 2 {
		t.Fatalf("profiles=%v", me.Profiles)
	}
	if me.Memberships == nil {
		t.Fatal("memberships must be empty list not null")
	}
}

func TestLogoutAndLogoutAll(t *testing.T) {
	svc, _ := testService(t)
	ctx := context.Background()
	a, err := svc.Register(ctx, RegisterInput{
		Email: "a@example.com", Password: "correct-horse", DisplayName: "A", Profile: "attendee", UserAgent: "ios",
	})
	if err != nil {
		t.Fatal(err)
	}
	b, err := svc.Login(ctx, LoginInput{Email: "a@example.com", Password: "correct-horse", UserAgent: "web"})
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.Logout(ctx, a.RefreshToken); err != nil {
		t.Fatal(err)
	}
	if err := svc.Logout(ctx, a.RefreshToken); err != nil {
		t.Fatal(err)
	}
	_, err = svc.Refresh(ctx, a.RefreshToken, "")
	if !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("logged out family err=%v", err)
	}
	if _, err := svc.Refresh(ctx, b.RefreshToken, ""); err != nil {
		t.Fatalf("other family should live: %v", err)
	}
	if err := svc.LogoutAll(ctx, a.User.ID); err != nil {
		t.Fatal(err)
	}
	_, err = svc.Refresh(ctx, b.RefreshToken, "")
	if !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("logout all err=%v", err)
	}
	claims, err := svc.Tokens.ParseAccess(b.AccessToken)
	if err != nil {
		t.Fatal(err)
	}
	ident, err := svc.AccessIdentity(ctx, a.User.ID)
	if err != nil {
		t.Fatal(err)
	}
	if ident.Epoch == claims.Epoch {
		t.Fatalf("logout all should bump session_epoch, still %d", ident.Epoch)
	}
}

func TestAccessJWTDoesNotEmbedEventRoles(t *testing.T) {
	svc, _ := testService(t)
	sess, err := svc.Register(context.Background(), RegisterInput{
		Email: "j@example.com", Password: "correct-horse", DisplayName: "J", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}
	low := strings.ToLower(sess.AccessToken)
	for _, leak := range []string{"event_id", "door", "password", sess.RefreshToken} {
		if strings.Contains(low, strings.ToLower(leak)) {
			t.Fatalf("jwt leaked %q", leak)
		}
	}
	claims, err := svc.Tokens.ParseAccess(sess.AccessToken)
	if err != nil {
		t.Fatal(err)
	}
	if claims.Subject != sess.User.ID {
		t.Fatalf("sub=%s", claims.Subject)
	}
	if claims.Epoch != 0 {
		t.Fatalf("epoch=%d", claims.Epoch)
	}
}

func TestPasswordHashRoundTrip(t *testing.T) {
	h, err := FastArgon2().Hash("correct-horse")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(h, "$argon2id$") {
		t.Fatalf("hash=%s", h)
	}
	if !VerifyPassword("correct-horse", h) {
		t.Fatal("verify")
	}
	if VerifyPassword("other-password", h) {
		t.Fatal("must reject")
	}
}

func TestRefreshHashIsNotPlain(t *testing.T) {
	raw, err := NewRefresh()
	if err != nil {
		t.Fatal(err)
	}
	sum := HashRefresh([]byte("pepper"), raw)
	if sum == raw || strings.Contains(sum, raw) {
		t.Fatal("hash must not contain plaintext")
	}
}

func TestForgotResetOneUseAndEpoch(t *testing.T) {
	svc, store := testService(t)
	inbox := &mailer.Memory{}
	svc.Mailer = inbox
	svc.AppOrigin = "http://localhost:3000"
	ctx := context.Background()
	sess, err := svc.Register(ctx, RegisterInput{
		Email: "r@example.com", Password: "correct-horse", DisplayName: "R", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}

	if err := svc.Forgot(ctx, "missing@example.com"); err != nil {
		t.Fatal(err)
	}
	if inbox.Len() != 0 {
		t.Fatal("unknown email must not send")
	}
	if err := svc.Forgot(ctx, "r@example.com"); err != nil {
		t.Fatal(err)
	}
	msg, ok := inbox.Last()
	if !ok || msg.Template != mailer.TemplatePasswordReset {
		t.Fatalf("mail=%+v", msg)
	}
	tok := tokenFromResetURL(t, msg.Vars["reset_url"])
	if strings.Contains(msg.Vars["reset_url"], "password=") {
		t.Fatal("mail must not include password")
	}

	if err := svc.Reset(ctx, ResetInput{Token: tok, Password: "new-correct-horse"}); err != nil {
		t.Fatal(err)
	}
	ident, err := svc.AccessIdentity(ctx, sess.User.ID)
	if err != nil {
		t.Fatal(err)
	}
	if ident.Epoch != 1 {
		t.Fatalf("epoch=%d", ident.Epoch)
	}

	_, err = svc.Refresh(ctx, sess.RefreshToken, "")
	if !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("refresh after reset err=%v", err)
	}
	_, err = svc.Login(ctx, LoginInput{Email: "r@example.com", Password: "correct-horse"})
	if !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("old password err=%v", err)
	}
	if _, err := svc.Login(ctx, LoginInput{Email: "r@example.com", Password: "new-correct-horse"}); err != nil {
		t.Fatal(err)
	}
	if err := svc.Reset(ctx, ResetInput{Token: tok, Password: "another-horse1"}); !errors.Is(err, ErrGone) {
		t.Fatalf("reuse err=%v", err)
	}

	store.SetStatus(sess.User.ID, StatusDisabled)
	if err := svc.Forgot(ctx, "r@example.com"); err != nil {
		t.Fatal(err)
	}
	if inbox.Len() != 1 {
		t.Fatalf("disabled user must not get a second mail, n=%d", inbox.Len())
	}
}

func TestResetExpiredToken(t *testing.T) {
	now := time.Now().UTC()
	svc, _ := testService(t)
	svc.Tokens.Now = func() time.Time { return now }
	inbox := &mailer.Memory{}
	svc.Mailer = inbox
	ctx := context.Background()
	if _, err := svc.Register(ctx, RegisterInput{
		Email: "e@example.com", Password: "correct-horse", DisplayName: "E", Profile: "attendee",
	}); err != nil {
		t.Fatal(err)
	}
	if err := svc.Forgot(ctx, "e@example.com"); err != nil {
		t.Fatal(err)
	}
	msg, ok := inbox.Last()
	if !ok {
		t.Fatal("expected mail")
	}
	tok := tokenFromResetURL(t, msg.Vars["reset_url"])
	svc.Tokens.Now = func() time.Time { return now.Add(31 * time.Minute) }
	if err := svc.Reset(ctx, ResetInput{Token: tok, Password: "new-correct-horse"}); !errors.Is(err, ErrGone) {
		t.Fatalf("expired err=%v", err)
	}
}

func TestResetPasswordPolicy(t *testing.T) {
	svc, _ := testService(t)
	err := svc.Reset(context.Background(), ResetInput{Token: "abc", Password: "short"})
	var inv Invalid
	if !errors.As(err, &inv) {
		t.Fatalf("err=%v", err)
	}
}

func tokenFromResetURL(t *testing.T, raw string) string {
	t.Helper()
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatal(err)
	}
	tok := u.Query().Get("token")
	if tok == "" {
		t.Fatalf("reset_url=%s", raw)
	}
	return tok
}
