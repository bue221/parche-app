package objectstore

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type fsStore struct {
	root string
}

// NewFS stores objects under root (dev fallback when MinIO is down).
func NewFS(root string) (Store, error) {
	if strings.TrimSpace(root) == "" {
		return nil, fmt.Errorf("OBJECT_STORE_PATH is required for fs driver")
	}
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, fmt.Errorf("create media dir: %w", err)
	}
	abs, err := filepath.Abs(root)
	if err != nil {
		return nil, err
	}
	return &fsStore{root: abs}, nil
}

func (s *fsStore) Ping(ctx context.Context) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	info, err := os.Stat(s.root)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return fmt.Errorf("object store path is not a directory")
	}
	return nil
}

func (s *fsStore) Exists(_ context.Context, key string) (bool, error) {
	_, err := os.Stat(filepath.Join(s.root, filepath.FromSlash(key)))
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}
