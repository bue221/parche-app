package objectstore

import (
	"bytes"
	"context"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

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

func TestMinIOAndS3ShareDriver(t *testing.T) {
	cfg := config.Config{
		ObjectStoreEndpoint:  "s3.example.internal",
		ObjectStoreBucket:    "parche",
		ObjectStoreAccessKey: "key",
		ObjectStoreSecretKey: "secret",
		ObjectStoreRegion:    "us-east-1",
	}
	for _, driver := range []string{"minio", "s3"} {
		cfg.ObjectStoreDriver = driver
		store, err := New(cfg)
		if err != nil {
			t.Fatalf("%s: %v", driver, err)
		}
		if _, ok := store.(*s3Store); !ok {
			t.Fatalf("%s: expected *s3Store", driver)
		}
	}
}

func TestFSPutPresignThenExists(t *testing.T) {
	dir := t.TempDir()
	store, err := NewFS(dir)
	if err != nil {
		t.Fatal(err)
	}
	direct, ok := store.(DirectStore)
	if !ok {
		t.Fatal("fs driver must support direct PUT")
	}

	key := "tnt/evt/flyer/obj.webp"
	grant, err := store.PutPresign(context.Background(), key, "image/webp", 16, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if grant.Method != "PUT" || grant.Headers["Content-Type"] != "image/webp" {
		t.Fatalf("grant=%+v", grant)
	}
	token := tokenFromDirectURL(t, grant.URL)
	body := []byte("webp-bytes-here")
	if err := direct.ConsumePut(context.Background(), token, "image/webp", bytes.NewReader(body), int64(len(body))); err != nil {
		t.Fatal(err)
	}
	ok, err = store.Exists(context.Background(), key)
	if err != nil || !ok {
		t.Fatalf("exists=%v err=%v", ok, err)
	}
	info, err := store.Head(context.Background(), key)
	if err != nil || info.Size != int64(len(body)) || info.ContentType != "image/webp" {
		t.Fatalf("head=%+v err=%v", info, err)
	}
	rc, _, err := store.Get(context.Background(), key)
	if err != nil {
		t.Fatal(err)
	}
	got, _ := io.ReadAll(rc)
	_ = rc.Close()
	if string(got) != string(body) {
		t.Fatalf("get=%q", got)
	}
	if err := store.Delete(context.Background(), key); err != nil {
		t.Fatal(err)
	}
	ok, err = store.Exists(context.Background(), key)
	if err != nil || ok {
		t.Fatalf("deleted exists=%v err=%v", ok, err)
	}
}

func TestFSPresignExpiredPutFails(t *testing.T) {
	dir := t.TempDir()
	raw, err := NewFS(dir)
	if err != nil {
		t.Fatal(err)
	}
	fs := raw.(*fsStore)
	start := time.Now()
	fs.now = func() time.Time { return start }
	grant, err := fs.PutPresign(context.Background(), "a/b/flyer/x.jpg", "image/jpeg", 8, time.Second)
	if err != nil {
		t.Fatal(err)
	}
	token := tokenFromDirectURL(t, grant.URL)
	fs.now = func() time.Time { return start.Add(2 * time.Second) }
	err = fs.ConsumePut(context.Background(), token, "image/jpeg", bytes.NewReader([]byte("x")), 1)
	if err != ErrPresignExpired {
		t.Fatalf("err=%v", err)
	}
	ok, err := fs.Exists(context.Background(), "a/b/flyer/x.jpg")
	if err != nil || ok {
		t.Fatalf("expired put must not create object exists=%v err=%v", ok, err)
	}
}

func TestS3GetPublicURLUsesCDN(t *testing.T) {
	store := &s3Store{
		bucket:     "parche",
		endpoint:   "minio:9000",
		useSSL:     false,
		publicBase: "https://cdn.example",
	}
	got := store.GetPublicURL("t/e/flyer/a.webp")
	if got != "https://cdn.example/t/e/flyer/a.webp" {
		t.Fatalf("url=%q", got)
	}
}

func TestBuildKeyAvatarNotUnderEvents(t *testing.T) {
	key, err := BuildKey(KindAvatar, "tenant", "event-should-be-ignored", "user-1", "image/png")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(key, "events/") || strings.Contains(key, "/event-should-be-ignored/") {
		t.Fatalf("avatar under events: %s", key)
	}
	if !strings.HasPrefix(key, "users/user-1/avatar/") {
		t.Fatalf("key=%s", key)
	}
}

func TestValidateUploadRejects(t *testing.T) {
	if err := ValidateUpload(KindFlyer, "application/pdf", 100); err == nil {
		t.Fatal("pdf")
	}
	if err := ValidateUpload(KindFlyer, "image/jpeg", 9<<20); err == nil {
		t.Fatal("size")
	}
	if err := ValidateUpload(KindAudio, "audio/mpeg", 100); err != nil {
		t.Fatal(err)
	}
	if err := ValidateUpload(KindCover, "image/png", 100); err != nil {
		t.Fatal(err)
	}
}

func TestBuildPostCoverKey(t *testing.T) {
	key, err := BuildPostCoverKey("11111111-1111-1111-1111-111111111111", "image/webp")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(key, "posts/11111111-1111-1111-1111-111111111111/cover/") {
		t.Fatalf("key=%s", key)
	}
	if strings.Contains(key, "events/") {
		t.Fatalf("cover under events: %s", key)
	}
}

func tokenFromDirectURL(t *testing.T, raw string) string {
	t.Helper()
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatal(err)
	}
	if tok := u.Query().Get("token"); tok != "" {
		return tok
	}
	t.Fatalf("no token in %q", raw)
	return ""
}

func TestFSGetPresignRoundTrip(t *testing.T) {
	dir := t.TempDir()
	store, err := NewFS(dir)
	if err != nil {
		t.Fatal(err)
	}
	direct := store.(DirectStore)
	key := "t/e/audio/a.mp3"
	grant, err := store.PutPresign(context.Background(), key, "audio/mpeg", 4, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if err := direct.ConsumePut(context.Background(), tokenFromDirectURL(t, grant.URL), "audio/mpeg", bytes.NewReader([]byte("abcd")), 4); err != nil {
		t.Fatal(err)
	}
	getURL, err := store.GetPresign(context.Background(), key, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	rc, _, err := direct.OpenGet(context.Background(), tokenFromDirectURL(t, getURL))
	if err != nil {
		t.Fatal(err)
	}
	defer rc.Close()
	got, _ := io.ReadAll(rc)
	if string(got) != "abcd" {
		t.Fatalf("body=%q", got)
	}
}
