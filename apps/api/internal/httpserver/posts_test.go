package httpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/events"
)

func TestEditorialPostsHTTP(t *testing.T) {
	mux, _, store := testEventStackFull(t)

	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"ed@example.com","password":"correct-horse","display_name":"Ed","profile":"attendee"}`)))
	var editor sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &editor)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/auth/register", strings.NewReader(`{"email":"fan@example.com","password":"correct-horse","display_name":"Fan","profile":"attendee"}`)))
	var fan sessionBody
	_ = json.Unmarshal(rr.Body.Bytes(), &fan)

	body := `{"title":"Acid en Chapinero","body_md":"Un **recorrido** con <script>alert(1)</script> y [x](javascript:alert(1))"}`
	rr = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/v1/admin/posts", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+editor.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/v1/admin/posts", strings.NewReader(body)))
	assertAPICode(t, rr, http.StatusUnauthorized, apierr.Unauthorized)

	if err := store.InsertProfile(context.Background(), editor.User.ID, auth.ProfilePlatformAdmin); err != nil {
		t.Fatal(err)
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/admin/posts", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+editor.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("create=%d %s", rr.Code, rr.Body.String())
	}
	var created map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &created)
	id, _ := created["id"].(string)
	slug, _ := created["slug"].(string)
	html, _ := created["body_html"].(string)
	if id == "" || slug == "" || created["status"] != "draft" {
		t.Fatalf("created=%v", created)
	}
	if strings.Contains(html, "<script>") || strings.Contains(html, `href="javascript:`) {
		t.Fatalf("xss html=%s", html)
	}
	if !strings.Contains(html, "&lt;script&gt;") || !strings.Contains(html, "<strong>") {
		t.Fatalf("sanitize=%s", html)
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/posts/"+slug, nil))
	assertAPICode(t, rr, http.StatusNotFound, apierr.NotFound)

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/posts", nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"items":[]`) {
		t.Fatalf("public list draft=%d %s", rr.Code, rr.Body.String())
	}

	png := tinyPNG(t)
	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"cover","content_type":"image/png","byte_size":`+strconv.Itoa(len(png))+`,"post_id":"`+id+`"}`))
	req.Header.Set("Authorization", "Bearer "+fan.AccessToken)
	req.Host = "api.parche.test"
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/uploads", strings.NewReader(`{"kind":"cover","content_type":"image/png","byte_size":`+strconv.Itoa(len(png))+`,"post_id":"`+id+`"}`))
	req.Header.Set("Authorization", "Bearer "+editor.AccessToken)
	req.Host = "api.parche.test"
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("cover upload=%d %s", rr.Code, rr.Body.String())
	}
	var up uploadResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &up)
	if !strings.HasPrefix(up.Key, "posts/"+id+"/cover/") {
		t.Fatalf("key=%s", up.Key)
	}
	putReq, err := http.NewRequest(http.MethodPut, up.Upload.URL, bytes.NewReader(png))
	if err != nil {
		t.Fatal(err)
	}
	putReq.Header.Set("Content-Type", "image/png")
	mux.ServeHTTP(httptest.NewRecorder(), putReq)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/admin/posts/"+id+"/assets", strings.NewReader(`{"key":"`+up.Key+`","kind":"cover"}`))
	req.Header.Set("Authorization", "Bearer "+fan.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusForbidden, apierr.Forbidden)

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/admin/posts/"+id+"/assets", strings.NewReader(`{"key":"`+up.Key+`","kind":"cover"}`))
	req.Header.Set("Authorization", "Bearer "+editor.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("confirm cover=%d %s", rr.Code, rr.Body.String())
	}
	var cover events.Image
	_ = json.Unmarshal(rr.Body.Bytes(), &cover)
	if cover.Kind != "cover" || cover.PublicURL == "" {
		t.Fatalf("cover=%+v", cover)
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/admin/posts/"+id+"/publish", nil)
	req.Header.Set("Authorization", "Bearer "+editor.AccessToken)
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"published"`) {
		t.Fatalf("publish=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/posts/"+slug, nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("public get=%d %s", rr.Code, rr.Body.String())
	}
	raw := rr.Body.String()
	if strings.Contains(raw, "<script>") || !strings.Contains(raw, `"cover"`) {
		t.Fatalf("public body=%s", raw)
	}
	if strings.Contains(raw, `"status"`) {
		t.Fatalf("public leaked admin status: %s", raw)
	}

	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/v1/posts", nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), slug) {
		t.Fatalf("list=%d %s", rr.Code, rr.Body.String())
	}

	rr = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/v1/admin/posts/"+id+"/publish", nil)
	req.Header.Set("Authorization", "Bearer "+editor.AccessToken)
	mux.ServeHTTP(rr, req)
	assertAPICode(t, rr, http.StatusConflict, apierr.Conflict)
}
