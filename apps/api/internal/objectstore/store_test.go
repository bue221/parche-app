package objectstore

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/parche-app/backend/internal/config"
)

func TestFSPingAndExists(t *testing.T) {
	dir := t.TempDir()
	store, err := NewFS(dir)
	if err != nil {
		t.Fatal(err)
	}
	if err := store.Ping(context.Background()); err != nil {
		t.Fatal(err)
	}
	ok, err := store.Exists(context.Background(), "missing.bin")
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Fatal("expected missing key")
	}
	if err := os.WriteFile(filepath.Join(dir, "flyer.jpg"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	ok, err = store.Exists(context.Background(), "flyer.jpg")
	if err != nil || !ok {
		t.Fatalf("exists=%v err=%v", ok, err)
	}
}

func TestNewUnknownDriver(t *testing.T) {
	_, err := New(config.Config{ObjectStoreDriver: "gcs"})
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestNewFSFromConfig(t *testing.T) {
	dir := t.TempDir()
	store, err := New(config.Config{ObjectStoreDriver: "fs", ObjectStorePath: dir})
	if err != nil {
		t.Fatal(err)
	}
	if err := store.Ping(context.Background()); err != nil {
		t.Fatal(err)
	}
}
