package config

import (
	"crypto/hmac"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/parche-app/backend/internal/ticketsign"
)

// Config is process configuration loaded from the environment.
type Config struct {
	Service     string
	HTTPAddr    string
	DatabaseURL string
	RedisURL    string
	BrokerURL   string
	LogLevel    string

	JWTAccessSecret   string
	JWTRefreshSecret  string
	TicketSigningKey  string
	TicketSigningKeys string

	ObjectStoreDriver        string
	ObjectStoreEndpoint      string
	ObjectStoreBucket        string
	ObjectStoreAccessKey     string
	ObjectStoreSecretKey     string
	ObjectStoreRegion        string
	ObjectStoreUseSSL        bool
	ObjectStorePath          string
	ObjectStorePublicBaseURL string

	PaymentWebhookSecret   string
	SMTPHost               string
	SMTPPort               string
	SMTPUser               string
	SMTPPassword           string
	EmailFrom              string
	EmailDriver            string
	AppOrigin              string
	CORSOrigins            []string
	AppEnv                 string
	PaymentProvider        string
	PaymentCheckoutBaseURL string
}

// Load reads and validates required environment variables.
// Missing DATABASE_URL or JWT secrets is a fatal configuration error.
func Load() (Config, error) {
	cfg := Config{
		Service:                  getenv("SERVICE", "api"),
		HTTPAddr:                 getenv("HTTP_ADDR", ":8080"),
		DatabaseURL:              os.Getenv("DATABASE_URL"),
		RedisURL:                 os.Getenv("REDIS_URL"),
		BrokerURL:                os.Getenv("BROKER_URL"),
		LogLevel:                 getenv("LOG_LEVEL", "info"),
		JWTAccessSecret:          os.Getenv("JWT_ACCESS_SECRET"),
		JWTRefreshSecret:         os.Getenv("JWT_REFRESH_SECRET"),
		TicketSigningKey:         os.Getenv("TICKET_SIGNING_KEY"),
		TicketSigningKeys:        os.Getenv("TICKET_SIGNING_KEYS"),
		ObjectStoreDriver:        getenv("OBJECT_STORE_DRIVER", "fs"),
		ObjectStoreEndpoint:      os.Getenv("OBJECT_STORE_ENDPOINT"),
		ObjectStoreBucket:        getenv("OBJECT_STORE_BUCKET", "parche"),
		ObjectStoreAccessKey:     os.Getenv("OBJECT_STORE_ACCESS_KEY"),
		ObjectStoreSecretKey:     os.Getenv("OBJECT_STORE_SECRET_KEY"),
		ObjectStoreRegion:        getenv("OBJECT_STORE_REGION", "us-east-1"),
		ObjectStoreUseSSL:        getenvBool("OBJECT_STORE_USE_SSL", false),
		ObjectStorePath:          getenv("OBJECT_STORE_PATH", "./data/media"),
		ObjectStorePublicBaseURL: os.Getenv("OBJECT_STORE_PUBLIC_BASE_URL"),
		PaymentWebhookSecret:     os.Getenv("PAYMENT_WEBHOOK_SECRET"),
		SMTPHost:                 os.Getenv("SMTP_HOST"),
		SMTPPort:                 getenv("SMTP_PORT", "587"),
		SMTPUser:                 os.Getenv("SMTP_USER"),
		SMTPPassword:             os.Getenv("SMTP_PASSWORD"),
		EmailFrom:                os.Getenv("EMAIL_FROM"),
		EmailDriver:              getenv("EMAIL_DRIVER", "log"),
		AppOrigin:                getenv("APP_ORIGIN", "http://localhost:3000"),
		CORSOrigins:              splitCSV(os.Getenv("CORS_ORIGINS")),
		AppEnv:                   getenv("APP_ENV", ""),
		PaymentProvider:          getenv("PAYMENT_PROVIDER", "fake"),
		PaymentCheckoutBaseURL:   os.Getenv("PAYMENT_CHECKOUT_BASE_URL"),
	}

	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

// Validate checks required secrets and connection URLs.
func (c Config) Validate() error {
	var missing []string
	if strings.TrimSpace(c.DatabaseURL) == "" {
		missing = append(missing, "DATABASE_URL")
	}
	if strings.TrimSpace(c.JWTAccessSecret) == "" {
		missing = append(missing, "JWT_ACCESS_SECRET")
	}
	if strings.TrimSpace(c.JWTRefreshSecret) == "" {
		missing = append(missing, "JWT_REFRESH_SECRET")
	}
	if len(missing) > 0 {
		return fmt.Errorf("missing required env: %s", strings.Join(missing, ", "))
	}
	keys, err := ticketsign.Parse(c.TicketSigningKey, c.TicketSigningKeys)
	if err != nil {
		return fmt.Errorf("ticket signing keys: %w", err)
	}
	if hmac.Equal(keys.ActiveSecret(), []byte(c.JWTAccessSecret)) {
		return fmt.Errorf("TICKET_SIGNING_KEY must differ from JWT_ACCESS_SECRET")
	}
	return nil
}

// RedactedDatabaseURL hides the password for logs.
func (c Config) RedactedDatabaseURL() string {
	u, err := url.Parse(c.DatabaseURL)
	if err != nil {
		return "[unparseable DATABASE_URL]"
	}
	if u.User == nil {
		return u.String()
	}
	pass, has := u.User.Password()
	if !has || pass == "" {
		return u.String()
	}
	return strings.Replace(c.DatabaseURL, pass, "****", 1)
}

func getenv(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func getenvBool(key string, fallback bool) bool {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}

func splitCSV(s string) []string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
