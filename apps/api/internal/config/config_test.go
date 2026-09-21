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
	t.Setenv("JWT_ACCESS_SECRET", "parche-dev-jwt-access-secret-32b")
	t.Setenv("JWT_REFRESH_SECRET", "parche-dev-jwt-refresh-secret-32")
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
	t.Setenv("JWT_REFRESH_SECRET", "parche-dev-jwt-refresh-secret-32")
	t.Setenv("TICKET_SIGNING_KEY", shared)
	if _, err := Load(); err == nil {
		t.Fatal("expected ticket key collision")
	}
}

func TestLoadRejectsShortJWTSecrets(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://parche:secret@postgres:5432/parche")
	t.Setenv("JWT_ACCESS_SECRET", "too-short")
	t.Setenv("JWT_REFRESH_SECRET", "parche-dev-jwt-refresh-secret-32")
	t.Setenv("TICKET_SIGNING_KEY", "ticket-signing-key-32-bytes-min!!")
	if _, err := Load(); err == nil {
		t.Fatal("expected short access secret to fail")
	}
}

func TestLoadRejectsMatchingJWTSecrets(t *testing.T) {
	const shared = "parche-dev-jwt-shared-secret-32b!"
	t.Setenv("DATABASE_URL", "postgres://parche:secret@postgres:5432/parche")
	t.Setenv("JWT_ACCESS_SECRET", shared)
	t.Setenv("JWT_REFRESH_SECRET", shared)
	t.Setenv("TICKET_SIGNING_KEY", "ticket-signing-key-32-bytes-min!!")
	if _, err := Load(); err == nil {
		t.Fatal("expected matching jwt secrets to fail")
	}
}

func TestLoadDoesNotLogEnvFile(t *testing.T) {
	if _, err := os.Stat("../../.env.example"); err != nil {
		t.Skip("env example not reachable from test cwd")
	}
}

func TestLoadMercadoPagoDefaultsFromCredentialsCard(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://parche:secret@postgres:5432/parche")
	t.Setenv("JWT_ACCESS_SECRET", "parche-dev-jwt-access-secret-32b")
	t.Setenv("JWT_REFRESH_SECRET", "parche-dev-jwt-refresh-secret-32")
	t.Setenv("TICKET_SIGNING_KEY", "ticket-signing-key-32-bytes-min!!")
	t.Setenv("MP_ACCESS_TOKEN", "APP-TOKEN")
	t.Setenv("MP_PUBLIC_KEY", "APP-PUB")
	t.Setenv("MP_APPLICATION_ID", "396538344466862")
	t.Setenv("MP_CLIENT_ID", "")
	t.Setenv("MP_CLIENT_SECRET", "")
	t.Setenv("MP_OAUTH_REDIRECT_URL", "")
	t.Setenv("MP_NOTIFICATION_URL", "")
	t.Setenv("MP_BACK_URL_BASE", "")
	t.Setenv("MP_TOKEN_KEY", "")
	t.Setenv("API_PUBLIC_URL", "")
	t.Setenv("APP_ORIGIN", "http://localhost:8081")

	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.MPClientID != "396538344466862" {
		t.Fatalf("application number alias: %s", cfg.MPClientID)
	}
	if cfg.MPRedirectURL != "http://localhost:8080/v1/payments/mercadopago/oauth/callback" {
		t.Fatalf("redirect=%s", cfg.MPRedirectURL)
	}
	if cfg.MPNotificationURL != "http://localhost:8080/v1/payments/webhook" {
		t.Fatalf("notify=%s", cfg.MPNotificationURL)
	}
	if cfg.MPBackURLBase != "http://localhost:8081" {
		t.Fatalf("back=%s", cfg.MPBackURLBase)
	}
	if cfg.MPTokenKey != cfg.JWTRefreshSecret {
		t.Fatal("token key should default to refresh secret")
	}
	if cfg.MPClientSecret != "" {
		t.Fatal("do not invent a client secret from the access token")
	}
}
