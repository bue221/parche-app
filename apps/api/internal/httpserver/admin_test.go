package httpserver

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/mailer"
	"github.com/parche-app/backend/internal/ratelimit"
)

func TestPlatformAdminApproveRejectUsersBroadcast(t *testing.T) {
	mux, catalog, store := testEventStackFull(t)
	now := time.Now().UTC().Add(24 * time.Hour)
	ends := now.Add(4 * time.Hour)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"p@example.com","password":"correct-horse","display_name":"Pez","profile":"promoter"}`)))
	var promoter sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &promoter)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"ops@example.com","password":"correct-horse","display_name":"Ops","profile":"attendee"}`)))
	var ops sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &ops)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"ops2@example.com","password":"correct-horse","display_name":"Ops2","profile":"attendee"}`)))
	var ops2 sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &ops2)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"fan@example.com","password":"correct-horse","display_name":"Fan","profile":"attendee"}`)))
	var fan sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &fan)

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var me auth.Me
	_ = json.Unmarshal(rr.Body.Bytes(), &me)
	tid := me.Tenants[0].ID

	body := `{"tenant_id":"` + tid + `","title":"Norte","starts_at":"` + now.Format(time.RFC3339) + `","ends_at":"` + ends.Format(time.RFC3339) + `","pin":{"name":"Video Norte","lat":4.75,"lng":-74.05}}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var created map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &created)
	id, _ := created["id"].(string)
	attachFlyer(t, mux, promoter.AccessToken, id)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+id+"/submit", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("submit=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/admin/events/"+id+"/approve", nil)
	req.Header.Set("Authorization", "Bearer "+ops.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	if err := store.InsertProfile(context.Background(), ops.User.ID, auth.ProfilePlatformAdmin); err != nil {
		t.Fatal(err)
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/admin/events?status=pending_review", nil)
	req.Header.Set("Authorization", "Bearer "+ops.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), id) {
		t.Fatalf("queue=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/admin/events/"+id+"/approve", nil)
	req.Header.Set("Authorization", "Bearer "+ops.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"published"`) {
		t.Fatalf("approve=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/events", nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"Norte"`) {
		t.Fatalf("public after approve=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/admin/metrics", nil)
	req.Header.Set("Authorization", "Bearer "+ops.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"events_published"`) {
		t.Fatalf("metrics=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/tenants/"+tid+"/metrics", nil)
	req.Header.Set("Authorization", "Bearer "+ops.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("admin tenant metrics=%d %s", rr.Code, rr.Body.String())
	}

	rejectBody := `{"tenant_id":"` + tid + `","title":"South","starts_at":"` + now.Format(time.RFC3339) + `","ends_at":"` + ends.Format(time.RFC3339) + `","pin":{"name":"Video Sur","lat":4.6,"lng":-74.08}}`
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events", strings.NewReader(rejectBody))
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	var second map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &second)
	rid, _ := second["id"].(string)
	attachFlyer(t, mux, promoter.AccessToken, rid)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/events/"+rid+"/submit", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/admin/events/"+rid+"/reject", strings.NewReader(`{"reason":"falta lineup"}`))
	req.Header.Set("Authorization", "Bearer "+ops.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"rejected"`) {
		t.Fatalf("reject=%d %s", rr.Code, rr.Body.String())
	}
	box, _ := catalog.Mailer.(*mailer.Memory)
	foundReject := false
	for _, msg := range box.All() {
		if msg.Template == mailer.TemplateEventRejected && strings.Contains(msg.Vars["reason"], "lineup") {
			foundReject = true
		}
	}
	if !foundReject {
		t.Fatalf("missing reject mail %+v", box.All())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/admin/users?q=fan@", nil)
	req.Header.Set("Authorization", "Bearer "+ops.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), fan.User.ID) {
		t.Fatalf("search=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/admin/users/"+ops2.User.ID+"/profiles", strings.NewReader(`{"profile":"platform_admin","op":"add"}`))
	req.Header.Set("Authorization", "Bearer "+ops.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("grant admin=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/admin/users/"+fan.User.ID+"/disable", nil)
	req.Header.Set("Authorization", "Bearer "+ops.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("disable=%d %s", rr.Code, rr.Body.String())
	}
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+fan.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/admin/users/"+fan.User.ID+"/enable", nil)
	req.Header.Set("Authorization", "Bearer "+ops.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("enable=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/admin/broadcasts", strings.NewReader(`{"audience":"all_attendees","vars":{"digest_body":"hola parche"}}`))
	req.Header.Set("Authorization", "Bearer "+ops.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusAccepted {
		t.Fatalf("broadcast=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/me/email/opt-out", nil)
	req.Header.Set("Authorization", "Bearer "+promoter.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("opt-out=%d %s", rr.Code, rr.Body.String())
	}
	before := box.Len()
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/admin/broadcasts", strings.NewReader(`{"audience":"all_attendees","vars":{"digest_body":"segunda"}}`))
	req.Header.Set("Authorization", "Bearer "+ops.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusAccepted {
		t.Fatalf("broadcast2=%d %s", rr.Code, rr.Body.String())
	}
	for _, msg := range box.All()[before:] {
		if msg.ToUserID == promoter.User.ID {
			t.Fatalf("opted-out user received mail %+v", msg)
		}
		if msg.Template == mailer.TemplateAdminDigest && msg.Vars["opt_out_url"] == "" {
			t.Fatalf("missing opt_out_url %+v", msg)
		}
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/admin/users/"+ops.User.ID+"/disable", nil)
	req.Header.Set("Authorization", "Bearer "+ops.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("disable extra admin=%d %s", rr.Code, rr.Body.String())
	}
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/admin/users/"+ops2.User.ID+"/disable", nil)
	req.Header.Set("Authorization", "Bearer "+ops2.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusConflict, apierr.Conflict)
}

func TestEmailOptOutSignedToken(t *testing.T) {
	mux, _, store := testEventStackFull(t)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"fan@example.com","password":"correct-horse","display_name":"Fan","profile":"attendee"}`)))
	var fan sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &fan)
	tok, err := testTokens().SignEmailOptOut(fan.User.ID)
	if err != nil {
		t.Fatal(err)
	}
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/me/email/opt-out", strings.NewReader(`{"token":"`+tok+`"}`)))
	if rr.Code != http.StatusNoContent {
		t.Fatalf("token opt-out=%d %s", rr.Code, rr.Body.String())
	}
	u, err := store.UserByID(context.Background(), fan.User.ID)
	if err != nil || !u.EmailOptOut {
		t.Fatalf("opt_out=%v err=%v", u.EmailOptOut, err)
	}
}

func TestRateLimitAdmin(t *testing.T) {
	limiter := ratelimit.NewMemory()
	mux := newMux(testLogger(), configCORS(), limiter, nil, func(mux *http.ServeMux) {
		mux.HandleFunc("GET /v1/admin/ping", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		})
	}, Routes{})
	for i := 0; i < 30; i++ {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/v1/admin/ping", nil)
		req = req.WithContext(WithUserID(req.Context(), "admin-1"))
		mux.ServeHTTP(rr, req)
		if rr.Code != http.StatusNoContent {
			t.Fatalf("hit %d status=%d", i+1, rr.Code)
		}
	}
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/v1/admin/ping", nil)
	req = req.WithContext(WithUserID(req.Context(), "admin-1"))
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("status=%d", rr.Code)
	}
}
