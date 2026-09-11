package media

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/jpeg"
	"image/png"
	"strings"
	"testing"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/objectstore"
)

type stubEvents struct {
	status string
	flyer  string
}

func (s *stubEvents) BindFlyer(_ context.Context, _, assetID string) (string, string, error) {
	prev := s.flyer
	s.flyer = assetID
	return prev, s.status, nil
}

func (s *stubEvents) ClearFlyerIf(_ context.Context, _, assetID string) error {
	if s.flyer == assetID {
		s.flyer = ""
	}
	return nil
}

func (s *stubEvents) EventStatus(context.Context, string) (string, string, error) {
	return s.status, s.flyer, nil
}

func TestProcessStripsGPSAndWritesThumb(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	obj, err := objectstore.NewFS(dir)
	if err != nil {
		t.Fatal(err)
	}
	store := NewMemory()
	svc := NewService(store, obj, &stubEvents{status: "draft"})

	img := image.NewRGBA(image.Rect(0, 0, 32, 24))
	var jpegBuf bytes.Buffer
	if err := jpeg.Encode(&jpegBuf, img, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatal(err)
	}
	withGPS := injectJPEGAPP1(jpegBuf.Bytes(), []byte("Exif\x00\x00GPSLatitudeBogota"))
	if !bytes.Contains(withGPS, []byte("GPSLatitude")) {
		t.Fatal("fixture missing GPS marker")
	}

	key := "tnt/evt/flyer/obj.jpg"
	if err := obj.Put(ctx, key, "image/jpeg", bytes.NewReader(withGPS), int64(len(withGPS))); err != nil {
		t.Fatal(err)
	}
	a := Asset{
		ID: "asset-1", TenantID: "tnt", OwnerType: OwnerEvent, OwnerID: "evt",
		Kind: KindFlyer, Key: key, MIME: "image/jpeg", Bytes: int64(len(withGPS)),
		Status: StatusProcessing, CreatedBy: "user",
	}
	if err := store.CreateAsset(ctx, a); err != nil {
		t.Fatal(err)
	}
	if err := svc.Process(ctx, a.ID); err != nil {
		t.Fatal(err)
	}
	got, err := store.AssetByID(ctx, a.ID)
	if err != nil || got.Status != StatusReady || got.ThumbKey == "" {
		t.Fatalf("asset=%+v err=%v", got, err)
	}
	rc, _, err := obj.Get(ctx, key)
	if err != nil {
		t.Fatal(err)
	}
	out := new(bytes.Buffer)
	_, _ = out.ReadFrom(rc)
	_ = rc.Close()
	if bytes.Contains(out.Bytes(), []byte("GPSLatitude")) {
		t.Fatal("processed original still contains GPS EXIF")
	}
	ok, err := obj.Exists(ctx, got.ThumbKey)
	if err != nil || !ok {
		t.Fatalf("thumb exists=%v err=%v", ok, err)
	}
}

func TestProcessAudioWritesPreviewNotPublic(t *testing.T) {
	ctx := context.Background()
	obj, err := objectstore.NewFS(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	store := NewMemory()
	svc := NewService(store, obj, &stubEvents{})
	svc.PreviewAudio = func(_ context.Context, src []byte) (PreviewResult, error) {
		if len(src) == 0 {
			t.Fatal("empty source")
		}
		return PreviewResult{Body: []byte("preview-bytes"), MIME: "audio/mpeg", DurationMS: 45000}, nil
	}
	key := "tnt/evt/audio/set.wav"
	raw := []byte("RIFF-master-wav")
	if err := obj.Put(ctx, key, "audio/wav", bytes.NewReader(raw), int64(len(raw))); err != nil {
		t.Fatal(err)
	}
	a := Asset{
		ID: "asset-audio", TenantID: "tnt", OwnerType: OwnerEvent, OwnerID: "evt",
		Kind: KindAudio, Key: key, MIME: "audio/wav", Bytes: int64(len(raw)),
		Status: StatusProcessing, TranscodeStatus: TranscodePending, CreatedBy: "user",
	}
	if err := store.CreateAsset(ctx, a); err != nil {
		t.Fatal(err)
	}
	if err := svc.Process(ctx, a.ID); err != nil {
		t.Fatal(err)
	}
	got, err := store.AssetByID(ctx, a.ID)
	if err != nil || got.TranscodeStatus != TranscodeReady || got.PreviewKey == "" || got.DurationMS > 45000 {
		t.Fatalf("asset=%+v err=%v", got, err)
	}
	if got.PreviewKey == got.Key {
		t.Fatal("preview key must not be the master key")
	}
	if strings.Contains(obj.GetPublicURL(got.Key), got.PreviewKey) && got.Key == got.PreviewKey {
		t.Fatal("confused public url")
	}
	ok, err := obj.Exists(ctx, got.PreviewKey)
	if err != nil || !ok {
		t.Fatal("preview object missing")
	}
	ok, _ = obj.Exists(ctx, key)
	if !ok {
		t.Fatal("master must be kept")
	}
}

func TestProcessAudioFailedKeepsMaster(t *testing.T) {
	ctx := context.Background()
	obj, err := objectstore.NewFS(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	store := NewMemory()
	svc := NewService(store, obj, &stubEvents{})
	svc.PreviewAudio = func(context.Context, []byte) (PreviewResult, error) {
		return PreviewResult{}, errors.New("ffmpeg")
	}
	key := "tnt/evt/audio/bad.wav"
	raw := []byte("not-audio")
	if err := obj.Put(ctx, key, "audio/wav", bytes.NewReader(raw), int64(len(raw))); err != nil {
		t.Fatal(err)
	}
	a := Asset{
		ID: "asset-bad-audio", TenantID: "tnt", OwnerType: OwnerEvent, OwnerID: "evt",
		Kind: KindAudio, Key: key, MIME: "audio/wav", Bytes: int64(len(raw)),
		Status: StatusProcessing, TranscodeStatus: TranscodePending, CreatedBy: "user",
	}
	if err := store.CreateAsset(ctx, a); err != nil {
		t.Fatal(err)
	}
	if err := svc.Process(ctx, a.ID); err != nil {
		t.Fatal(err)
	}
	got, _ := store.AssetByID(ctx, a.ID)
	if got.TranscodeStatus != TranscodeFailed || got.PreviewKey != "" {
		t.Fatalf("got=%+v", got)
	}
	ok, err := obj.Exists(ctx, key)
	if err != nil || !ok {
		t.Fatal("master must be kept")
	}
}

func TestProcessMarksFailedAndKeepsOriginal(t *testing.T) {
	ctx := context.Background()
	obj, err := objectstore.NewFS(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	store := NewMemory()
	svc := NewService(store, obj, &stubEvents{})
	key := "tnt/evt/flyer/bad.jpg"
	raw := []byte("not-a-jpeg")
	if err := obj.Put(ctx, key, "image/jpeg", bytes.NewReader(raw), int64(len(raw))); err != nil {
		t.Fatal(err)
	}
	a := Asset{
		ID: "asset-2", TenantID: "tnt", OwnerType: OwnerEvent, OwnerID: "evt",
		Kind: KindFlyer, Key: key, MIME: "image/jpeg", Bytes: int64(len(raw)),
		Status: StatusProcessing, CreatedBy: "user",
	}
	if err := store.CreateAsset(ctx, a); err != nil {
		t.Fatal(err)
	}
	if err := svc.Process(ctx, a.ID); err != nil {
		t.Fatal(err)
	}
	got, _ := store.AssetByID(ctx, a.ID)
	if got.Status != StatusFailed {
		t.Fatalf("status=%s", got.Status)
	}
	ok, err := obj.Exists(ctx, key)
	if err != nil || !ok {
		t.Fatal("original must be kept")
	}
}

func TestConfirmRequiresIntentAndPrefix(t *testing.T) {
	ctx := context.Background()
	obj, err := objectstore.NewFS(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	store := NewMemory()
	binder := &stubEvents{status: "draft"}
	svc := NewService(store, obj, binder)

	var pngBuf bytes.Buffer
	_ = png.Encode(&pngBuf, image.NewRGBA(image.Rect(0, 0, 2, 2)))
	key := "tenant-1/event-1/flyer/a.png"
	if err := obj.Put(ctx, key, "image/png", bytes.NewReader(pngBuf.Bytes()), int64(pngBuf.Len())); err != nil {
		t.Fatal(err)
	}

	_, err = svc.Confirm(ctx, ConfirmInput{UserID: "u1", TenantID: "tenant-1", EventID: "event-1", Key: key, Kind: KindFlyer})
	if !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("without intent=%v", err)
	}

	if err := svc.SaveIntent(ctx, Intent{
		Key: key, UserID: "u1", Kind: KindFlyer, EventID: "event-1",
		ContentType: "image/png", ByteSize: int64(pngBuf.Len()),
		ExpiresAt: svc.now().Add(intentTTL),
	}); err != nil {
		t.Fatal(err)
	}
	view, err := svc.Confirm(ctx, ConfirmInput{UserID: "u1", TenantID: "tenant-1", EventID: "event-1", Key: key, Kind: KindFlyer})
	if err != nil {
		t.Fatal(err)
	}
	if view.ThumbURL == "" || binder.flyer == "" {
		t.Fatalf("view=%+v flyer=%s", view, binder.flyer)
	}
}

func injectJPEGAPP1(jpegBytes, payload []byte) []byte {
	if len(jpegBytes) < 2 || jpegBytes[0] != 0xFF || jpegBytes[1] != 0xD8 {
		return jpegBytes
	}
	n := 2 + len(payload)
	seg := make([]byte, 4+len(payload))
	seg[0] = 0xFF
	seg[1] = 0xE1
	seg[2] = byte((2 + len(payload)) >> 8)
	seg[3] = byte(2 + len(payload))
	copy(seg[4:], payload)
	_ = n
	out := make([]byte, 0, 2+len(seg)+len(jpegBytes)-2)
	out = append(out, jpegBytes[:2]...)
	out = append(out, seg...)
	out = append(out, jpegBytes[2:]...)
	return out
}
