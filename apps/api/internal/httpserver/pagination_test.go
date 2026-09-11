package httpserver

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func jsonDecode(rr *httptest.ResponseRecorder, dest any) error {
	return json.NewDecoder(rr.Body).Decode(dest)
}

func TestParsePageDefaults(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/events", nil)
	page, details := ParsePage(req)
	if details != nil || page.Limit != 20 || page.Cursor != "" {
		t.Fatalf("page=%+v details=%v", page, details)
	}
}

func TestParsePageMaxAndInvalid(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/events?limit=50", nil)
	page, details := ParsePage(req)
	if details != nil || page.Limit != 50 {
		t.Fatalf("page=%+v details=%v", page, details)
	}

	req = httptest.NewRequest(http.MethodGet, "/v1/events?limit=51", nil)
	_, details = ParsePage(req)
	if len(details) == 0 || details[0].Field != "limit" {
		t.Fatalf("expected limit max, got %v", details)
	}

	req = httptest.NewRequest(http.MethodGet, "/v1/events?limit=abc", nil)
	_, details = ParsePage(req)
	if len(details) == 0 {
		t.Fatal("expected invalid limit")
	}
}
