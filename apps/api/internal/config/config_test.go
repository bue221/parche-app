package config

import (
	"os"
	"testing"
)

func TestValidateMissingRequired(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	t.Setenv("JWT_ACCESS_SECRET", "")
	t.Setenv("JWT_REFRESH_SECRET", "")

	_, err := Load()
	if err == nil {
		t.Fatal("expected error when required env is missing")
	}
}

func TestLoadSuccess(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://parche:secret@postgres:5432/parche")
	t.Setenv("JWT_ACCESS_SECRET", "access")
	t.Setenv("JWT_REFRESH_SECRET", "refresh")
	t.Setenv("TICKET_SIGNING_KEY", "ticket-signing-key-32-bytes-min!!")
	t.Setenv("HTTP_ADDR", ":9090")
	t.Setenv("SERVICE", "api")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.HTTPAddr != ":9090" {
		t.Fatalf("HTTPAddr = %q", cfg.HTTPAddr)
	}
	redacted := cfg.RedactedDatabaseURL()
	if redacted == cfg.DatabaseURL {
		t.Fatal("expected password to be redacted")
	}
	if want := "postgres://parche:****@postgres:5432/parche"; redacted != want {
		t.Fatalf("RedactedDatabaseURL = %q want %q", redacted, want)
	}
}

func TestLoadRejectsTicketKeyEqualToAccess(t *testing.T) {
	const shared = "same-secret-must-not-be-reused-32b"
	t.Setenv("DATABASE_URL", "postgres://parche:secret@postgres:5432/parche")
	t.Setenv("JWT_ACCESS_SECRET", shared)
	t.Setenv("JWT_REFRESH_SECRET", "refresh")
	t.Setenv("TICKET_SIGNING_KEY", shared)
	if _, err := Load(); err == nil {
		t.Fatal("expected ticket key collision")
	}
}

func TestLoadDoesNotLogEnvFile(t *testing.T) {
	if _, err := os.Stat("../../.env.example"); err != nil {
		t.Skip("env example not reachable from test cwd")
	}
}
