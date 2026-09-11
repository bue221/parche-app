package objectstore

import (
	"context"
	"fmt"
	"strings"

	"github.com/parche-app/backend/internal/config"
)

// Store is the F01 readiness surface of object storage.
// PutPresign and public URLs belong to F03.
type Store interface {
	Ping(ctx context.Context) error
	Exists(ctx context.Context, key string) (bool, error)
}

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
