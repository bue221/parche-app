package media

import (
	"bytes"
	"context"
	"errors"
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

// Process generates a GPS-free original (capped) and a webp thumbnail.
// Decode failure marks the asset failed and keeps the original object.
func (s *Service) Process(ctx context.Context, assetID string) error {
	a, err := s.Store.AssetByID(ctx, assetID)
	if err != nil {
		return err
	}
	if a.Kind != KindFlyer && a.Kind != KindGallery {
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
