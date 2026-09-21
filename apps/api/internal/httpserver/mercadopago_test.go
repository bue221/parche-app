package httpserver

import "testing"

func TestCobrosReturn(t *testing.T) {
	t.Parallel()
	if got := cobrosReturn("http://localhost:8081", "connected"); got != "parche://parche/cobros?mp=connected" {
		t.Fatalf("local=%s", got)
	}
	if got := cobrosReturn("https://app.parche.co", "connected"); got != "https://app.parche.co/parche/cobros?mp=connected" {
		t.Fatalf("public=%s", got)
	}
}
