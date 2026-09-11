package httpserver

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"testing"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
)

func TestUserProfileHTTP(t *testing.T) {
	mux, logs, inbox := testAuthStackMail(t)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"ada@example.com","password":"correct-horse","display_name":"Ada","profile":"attendee"}`)))
	if rr.Code != http.StatusCreated {
		t.Fatalf("register=%d %s", rr.Code, rr.Body.String())
	}
	var sess sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &sess)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"bob@example.com","password":"correct-horse","display_name":"Bob","profile":"attendee"}`)))
	var bob sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &bob)

	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/v1/me", strings.NewReader(`{"display_name":"Ada L","bio":"chapinero"}`))
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("patch=%d %s", rr.Code, rr.Body.String())
	}
	var me auth.Me
	_ = json.Unmarshal(rr.Body.Bytes(), &me)
	if me.DisplayName != "Ada L" || me.Bio != "chapinero" || me.Email != "ada@example.com" {
		t.Fatalf("me=%+v", me)
	}
	if me.Tenants == nil || me.Memberships == nil {
		t.Fatal("patch dropped tenants or memberships")
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPatch, "/v1/me", strings.NewReader(`{"email":"hijack@example.com"}`))
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPatch, "/v1/me", strings.NewReader(`{"bio":"`+strings.Repeat("x", 281)+`"}`))
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusBadRequest, apierr.Validation)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/users/"+sess.User.ID, nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("public=%d %s", rr.Code, rr.Body.String())
	}
	if strings.Contains(rr.Body.String(), "ada@example.com") || strings.Contains(rr.Body.String(), `"email"`) {
		t.Fatalf("public leaked email: %s", rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "Ada L") || !strings.Contains(rr.Body.String(), "chapinero") {
		t.Fatalf("public body=%s", rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/users/not-a-uuid", nil))
	assertAPICode(t, rr, http.StatusNotFound, apierr.NotFound)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/me/email/change", strings.NewReader(`{"email":"bob@example.com"}`))
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusConflict, apierr.Conflict)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/me/email/change", strings.NewReader(`{"email":"ada2@example.com"}`))
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("change=%d %s", rr.Code, rr.Body.String())
	}
	msg, ok := inbox.Last()
	if !ok || msg.Template != "email_change" {
		t.Fatalf("mail=%+v ok=%v", msg, ok)
	}
	u, err := url.Parse(msg.Vars["confirm_url"])
	if err != nil {
		t.Fatal(err)
	}
	tok := u.Query().Get("token")

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/me/email/confirm", strings.NewReader(`{"token":"`+tok+`"}`))
	req.Header.Set("Authorization", "Bearer "+bob.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/me/email/confirm", strings.NewReader(`{"token":"`+tok+`"}`))
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("confirm=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	mux.ServeHTTP(rr, req)
	_ = json.Unmarshal(rr.Body.Bytes(), &me)
	if me.Email != "ada2@example.com" {
		t.Fatalf("email after confirm=%s", me.Email)
	}
	if me.Tenants == nil || me.Memberships == nil {
		t.Fatal("get me dropped tenants or memberships")
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/me/email/confirm", strings.NewReader(`{"token":"`+tok+`"}`))
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusGone, apierr.Gone)

	_ = logs
}

func TestUserAvatarHTTP(t *testing.T) {
	mux, _ := testEventStack(t)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"ada@example.com","password":"correct-horse","display_name":"Ada","profile":"attendee"}`)))
	var sess sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &sess)

	png := tinyPNG(t)
	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"avatar","content_type":"image/png","byte_size":`+strconv.Itoa(len(png))+`}`))
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	req.Host = "api.parche.test"
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("upload=%d %s", rr.Code, rr.Body.String())
	}
	var up uploadResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &up)
	if !strings.Contains(up.Key, "users/"+sess.User.ID+"/avatar/") {
		t.Fatalf("key=%s", up.Key)
	}
	putReq, err := http.NewRequest(http.MethodPut, up.Upload.URL, bytes.NewReader(png))
	if err != nil {
		t.Fatal(err)
	}
	putReq.Header.Set("Content-Type", "image/png")
	mux.ServeHTTP(httptest.NewRecorder(), putReq)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/me/avatar", strings.NewReader(`{"key":"`+up.Key+`"}`))
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("confirm=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+sess.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"avatar_url"`) {
		t.Fatalf("me avatar=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/users/"+sess.User.ID, nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"avatar_url"`) {
		t.Fatalf("public avatar=%d %s", rr.Code, rr.Body.String())
	}
	if strings.Contains(rr.Body.String(), `"email"`) {
		t.Fatalf("public leaked email: %s", rr.Body.String())
	}
}
