package objectstore

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/parche-app/backend/internal/config"
)

// ErrNotFound is returned by Head/Get when the object is missing.
var ErrNotFound = errors.New("object not found")

// Info is object metadata from Head/Get.
type Info struct {
	Size        int64
	ContentType string
}

// Store is the media port. Handlers depend on this, never a vendor SDK.
// Changing OBJECT_STORE_DRIVER (fs | minio | s3) does not change callers.
type Store interface {
	Ping(ctx context.Context) error
	Exists(ctx context.Context, key string) (bool, error)
	Delete(ctx context.Context, key string) error
	Head(ctx context.Context, key string) (Info, error)
	Get(ctx context.Context, key string) (io.ReadCloser, Info, error)
	Put(ctx context.Context, key, contentType string, r io.Reader, size int64) error
	PutPresign(ctx context.Context, key, contentType string, maxBytes int64, ttl time.Duration) (Presign, error)
	GetPresign(ctx context.Context, key string, ttl time.Duration) (string, error)
	GetPublicURL(key string) string
}

// DirectStore is the fs fallback: tests (and local-without-MinIO) PUT/GET through the API.
type DirectStore interface {
	ConsumePut(ctx context.Context, token, contentType string, body io.Reader, contentLength int64) error
	OpenGet(ctx context.Context, token string) (body io.ReadCloser, contentType string, err error)
}

// Presign is a short-lived PUT grant. Do not log URL (query string is a credential).
type Presign struct {
	Method    string            `json:"method"`
	URL       string            `json:"url"`
	Headers   map[string]string `json:"headers"`
	ExpiresAt time.Time         `json:"expires_at"`
}

// DirectPutPrefix is the path-only URL issued by the fs driver; the HTTP layer makes it absolute.
const DirectPutPrefix = "/v1/uploads/direct?token="

// New builds a driver from config. Handlers must depend on Store, not a vendor SDK.
func New(cfg config.Config) (Store, error) {
	switch strings.ToLower(cfg.ObjectStoreDriver) {
	case "fs", "filesystem", "local":
		return NewFS(cfg.ObjectStorePath)
	case "minio", "s3":
		return NewS3(cfg)
	default:
		return nil, fmt.Errorf("unknown OBJECT_STORE_DRIVER %q", cfg.ObjectStoreDriver)
	}
}

// Checker adapts Store to health.Checker.
type Checker struct {
	Store Store
}

func (c Checker) Name() string { return "object_store" }

func (c Checker) Ping(ctx context.Context) error {
	if c.Store == nil {
		return fmt.Errorf("object store is nil")
	}
	return c.Store.Ping(ctx)
}
