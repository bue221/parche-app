package media

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"path"
	"strings"

	nativewebp "github.com/HugoSmits86/nativewebp"
	"github.com/parche-app/backend/internal/objectstore"
	"golang.org/x/image/draw"
	"golang.org/x/image/webp"
)

func init() {
	image.RegisterFormat("webp", "RIFF????WEBP", webp.Decode, webp.DecodeConfig)
}

// Process generates image thumbs or a 45s audio preview. Decode/ffmpeg failure marks the asset failed and keeps the original.
func (s *Service) Process(ctx context.Context, assetID string) error {
	a, err := s.Store.AssetByID(ctx, assetID)
	if err != nil {
		return err
	}
	if a.Kind == KindAudio {
		return s.processAudio(ctx, a)
	}
	if a.Kind != KindFlyer && a.Kind != KindGallery && a.Kind != KindAvatar && a.Kind != KindCover {
		return nil
	}
	rc, _, err := s.Objects.Get(ctx, a.Key)
	if err != nil {
		if errors.Is(err, objectstore.ErrNotFound) {
			a.Status = StatusFailed
			return s.Store.UpdateAsset(ctx, a)
		}
		return err
	}
	raw, err := io.ReadAll(rc)
	_ = rc.Close()
	if err != nil {
		return err
	}

	img, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		s.log().Error("media decode failed", "asset_id", a.ID, "err", err)
		a.Status = StatusFailed
		return s.Store.UpdateAsset(ctx, a)
	}

	full := resizeMax(img, maxFlyerPx)
	thumb := resizeMax(img, maxThumbPx)
	a.Width = full.Bounds().Dx()
	a.Height = full.Bounds().Dy()

	origBuf, origMIME, err := encodeOriginal(full, a.MIME, a.Key)
	if err != nil {
		s.log().Error("media encode original failed", "asset_id", a.ID, "err", err)
		a.Status = StatusFailed
		return s.Store.UpdateAsset(ctx, a)
	}
	if err := s.Objects.Put(ctx, a.Key, origMIME, bytes.NewReader(origBuf), int64(len(origBuf))); err != nil {
		return err
	}
	a.MIME = origMIME
	a.Bytes = int64(len(origBuf))

	var thumbBuf bytes.Buffer
	if err := nativewebp.Encode(&thumbBuf, thumb, nil); err != nil {
		s.log().Error("media encode thumb failed", "asset_id", a.ID, "err", err)
		a.Status = StatusFailed
		return s.Store.UpdateAsset(ctx, a)
	}
	tk := thumbKey(a.Key)
	if err := s.Objects.Put(ctx, tk, thumbMIME, bytes.NewReader(thumbBuf.Bytes()), int64(thumbBuf.Len())); err != nil {
		return err
	}
	a.ThumbKey = tk
	a.Status = StatusReady
	return s.Store.UpdateAsset(ctx, a)
}

func (s *Service) processAudio(ctx context.Context, a Asset) error {
	fail := func(cause error) error {
		s.log().Error("media audio transcode failed", "asset_id", a.ID, "err", cause)
		a.Status = StatusFailed
		a.TranscodeStatus = TranscodeFailed
		return s.Store.UpdateAsset(ctx, a)
	}
	rc, _, err := s.Objects.Get(ctx, a.Key)
	if err != nil {
		if errors.Is(err, objectstore.ErrNotFound) {
			return fail(err)
		}
		return err
	}
	raw, err := io.ReadAll(rc)
	_ = rc.Close()
	if err != nil {
		return err
	}
	preview, err := s.makePreview(ctx, raw)
	if err != nil {
		return fail(err)
	}
	if len(preview.Body) == 0 || int64(len(preview.Body)) > maxPreviewBytes {
		return fail(fmt.Errorf("empty or oversized preview"))
	}
	pk := previewKey(a.Key)
	mime := preview.MIME
	if mime == "" {
		mime = previewMIME
	}
	if err := s.Objects.Put(ctx, pk, mime, bytes.NewReader(preview.Body), int64(len(preview.Body))); err != nil {
		return err
	}
	a.PreviewKey = pk
	a.DurationMS = preview.DurationMS
	if a.DurationMS <= 0 {
		a.DurationMS = previewSeconds * 1000
	}
	if a.DurationMS > previewSeconds*1000 {
		a.DurationMS = previewSeconds * 1000
	}
	a.Status = StatusReady
	a.TranscodeStatus = TranscodeReady
	return s.Store.UpdateAsset(ctx, a)
}

func encodeOriginal(img image.Image, mime, key string) ([]byte, string, error) {
	var buf bytes.Buffer
	switch {
	case mime == "image/png" || strings.EqualFold(path.Ext(key), ".png"):
		if err := png.Encode(&buf, img); err != nil {
			return nil, "", err
		}
		return buf.Bytes(), "image/png", nil
	case mime == "image/webp" || strings.EqualFold(path.Ext(key), ".webp"):
		if err := nativewebp.Encode(&buf, img, nil); err != nil {
			return nil, "", err
		}
		return buf.Bytes(), "image/webp", nil
	default:
		if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 85}); err != nil {
			return nil, "", err
		}
		return buf.Bytes(), "image/jpeg", nil
	}
}

func resizeMax(src image.Image, max int) image.Image {
	b := src.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= 0 || h <= 0 {
		return src
	}
	if w <= max && h <= max {
		return src
	}
	nw, nh := w, h
	if w >= h {
		nw = max
		nh = h * max / w
	} else {
		nh = max
		nw = w * max / h
	}
	if nw < 1 {
		nw = 1
	}
	if nh < 1 {
		nh = 1
	}
	dst := image.NewRGBA(image.Rect(0, 0, nw, nh))
	draw.CatmullRom.Scale(dst, dst.Bounds(), src, b, draw.Over, nil)
	return dst
}
