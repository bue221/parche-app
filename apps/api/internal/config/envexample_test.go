package config

import (
	"bufio"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestEnvExampleCoversRequiredKeys(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("caller")
	}
	path := filepath.Join(filepath.Dir(file), "..", "..", ".env.example")
	f, err := os.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()

	keys := map[string]bool{}
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		k, _, found := strings.Cut(line, "=")
		if found {
			keys[k] = true
		}
	}
	if err := sc.Err(); err != nil {
		t.Fatal(err)
	}

	required := []string{
		"DATABASE_URL", "REDIS_URL", "BROKER_URL", "HTTP_ADDR",
		"JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "TICKET_SIGNING_KEY",
		"OBJECT_STORE_DRIVER", "OBJECT_STORE_ENDPOINT", "OBJECT_STORE_BUCKET",
		"OBJECT_STORE_ACCESS_KEY", "OBJECT_STORE_SECRET_KEY", "OBJECT_STORE_REGION",
		"OBJECT_STORE_PATH", "OBJECT_STORE_PUBLIC_BASE_URL", "PAYMENT_WEBHOOK_SECRET",
		"SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "EMAIL_FROM",
		"CORS_ORIGINS", "APP_ORIGIN", "LOG_LEVEL", "APP_ENV",
		"PAYMENT_PROVIDER", "PAYMENT_CHECKOUT_BASE_URL",
	}
	for _, k := range required {
		if !keys[k] {
			t.Errorf("missing %s in .env.example", k)
		}
	}
}
