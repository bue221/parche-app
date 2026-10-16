package httpserver

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
)

func TestRequireProfileUsesDatabaseNotJWT(t *testing.T) {
	store := auth.NewMemory()
	tokens := &auth.Tokens{
		AccessSecret:  []byte("0123456789abcdef0123456789abcdef"),
		RefreshPepper: []byte("refresh-pepper-32-bytes-minimum!"),
	}
	svc, err := auth.NewService(store, tokens, auth.FastArgon2(), slog.New(slog.NewJSONHandler(io.Discard, nil)))
	if err != nil {
		t.Fatal(err)
	}
	access := JWTAccess{Tokens: tokens, Lookup: svc.AccessIdentity}
	h := RequireProfile(access, store.Profiles, auth.ProfilePlatformAdmin, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	sess, err := svc.Register(context.Background(), auth.RegisterInput{
		Email: "u@example.com", Password: "correct-horse", DisplayName: "U", Profile: "attendee",
	})
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/admin/ping", nil)
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	h.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	if err := store.InsertProfile(context.Background(), sess.User.ID, auth.ProfilePlatformAdmin); err != nil {
		t.Fatal(err)
	}
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/admin/ping", nil)
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("after grant status=%d body=%s", rr.Code, rr.Body.String())
	}
}
