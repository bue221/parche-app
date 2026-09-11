package media

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"path"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/broker"
	"github.com/parche-app/backend/internal/events"
	"github.com/parche-app/backend/internal/objectstore"
)

// Service confirms event media, binds flyers, transcodes audio, and orders tracks.
type Service struct {
	Store        Store
	Objects      objectstore.Store
	Events       EventBinder
	Publisher    Publisher
	Log          *slog.Logger
	Now          func() time.Time
	PreviewAudio func(ctx context.Context, src []byte) (PreviewResult, error)
}

func NewService(store Store, objects objectstore.Store, binder EventBinder) *Service {
	return &Service{
		Store:   store,
		Objects: objects,
		Events:  binder,
		Now:     func() time.Time { return time.Now().UTC() },
	}
}

func (s *Service) now() time.Time {
	if s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func (s *Service) SaveIntent(ctx context.Context, in Intent) error {
	if s.Store == nil {
		return nil
	}
	if in.ExpiresAt.IsZero() {
		in.ExpiresAt = s.now().Add(intentTTL)
	}
	return s.Store.SaveIntent(ctx, in)
}

func (s *Service) Confirm(ctx context.Context, in ConfirmInput) (events.Image, error) {
	kind := strings.TrimSpace(in.Kind)
	if kind == KindAudio {
		return events.Image{}, auth.Invalid{Fields: []auth.Field{{Name: "kind", Issue: "use_audio_endpoint"}}}
	}
	if kind != KindFlyer && kind != KindGallery {
		return events.Image{}, auth.Invalid{Fields: []auth.Field{{Name: "kind", Issue: "invalid"}}}
	}
	a, err := s.confirmAsset(ctx, in, kind)
	if err != nil {
		return events.Image{}, err
	}
	if kind == KindFlyer {
		prev, _, err := s.Events.BindFlyer(ctx, in.EventID, a.ID)
		if err != nil {
			return events.Image{}, err
		}
		if prev != "" && prev != a.ID {
			if old, err := s.Store.AssetByID(ctx, prev); err == nil && old.Kind == KindFlyer {
				old.Kind = KindGallery
				_ = s.Store.UpdateAsset(ctx, old)
			}
		}
	}
	if err := s.enqueueProcess(ctx, a.ID); err != nil {
		s.log().Error("media.process enqueue", "asset_id", a.ID, "err", err)
	}
	ready, err := s.Store.AssetByID(ctx, a.ID)
	if err != nil {
		ready = a
	}
	return s.view(ready), nil
}

func (s *Service) ConfirmAudio(ctx context.Context, in ConfirmInput) (AudioView, error) {
	in.Kind = KindAudio
	a, err := s.confirmAsset(ctx, in, KindAudio)
	if err != nil {
		return AudioView{}, err
	}
	if err := s.enqueueProcess(ctx, a.ID); err != nil {
		s.log().Error("media.process enqueue", "asset_id", a.ID, "err", err)
	}
	ready, err := s.Store.AssetByID(ctx, a.ID)
	if err != nil {
		ready = a
	}
	return audioView(ready), nil
}

func (s *Service) confirmAsset(ctx context.Context, in ConfirmInput, kind string) (Asset, error) {
	key := strings.TrimSpace(in.Key)
	if key == "" {
		return Asset{}, auth.Invalid{Fields: []auth.Field{{Name: "key", Issue: "required"}}}
	}

	intent, err := s.Store.IntentByKey(ctx, key)
	if err != nil {
		if errors.Is(err, auth.ErrNotFound) {
			return Asset{}, auth.ErrForbidden
		}
		return Asset{}, err
	}
	if intent.UserID != in.UserID {
		return Asset{}, auth.ErrForbidden
	}
	if s.now().After(intent.ExpiresAt) {
		return Asset{}, auth.ErrGone
	}
	if intent.EventID != "" && intent.EventID != in.EventID {
		return Asset{}, auth.ErrForbidden
	}
	if intent.Kind != "" && intent.Kind != kind {
		return Asset{}, auth.Invalid{Fields: []auth.Field{{Name: "kind", Issue: "mismatch"}}}
	}

	prefix := in.TenantID + "/" + in.EventID + "/"
	if !strings.HasPrefix(key, prefix) {
		return Asset{}, auth.ErrForbidden
	}
	if !strings.HasPrefix(key, prefix+kind+"/") {
		return Asset{}, auth.ErrForbidden
	}

	ok, err := s.Objects.Exists(ctx, key)
	if err != nil {
		return Asset{}, err
	}
	if !ok {
		return Asset{}, auth.ErrNotFound
	}

	head, err := s.Objects.Head(ctx, key)
	if err != nil {
		if errors.Is(err, objectstore.ErrNotFound) {
			return Asset{}, auth.ErrNotFound
		}
		return Asset{}, err
	}
	mime := head.ContentType
	if mime == "" || mime == "application/octet-stream" {
		if intent.ContentType != "" {
			mime = intent.ContentType
		} else {
			mime = objectstore.MIMEFromKey(key)
		}
	}
	bytes := head.Size
	if bytes <= 0 {
		bytes = intent.ByteSize
	}

	id, err := newID()
	if err != nil {
		return Asset{}, err
	}
	a := Asset{
		ID:        id,
		TenantID:  in.TenantID,
		OwnerType: OwnerEvent,
		OwnerID:   in.EventID,
		Kind:      kind,
		Key:       key,
		MIME:      mime,
		Bytes:     bytes,
		Status:    StatusProcessing,
		CreatedBy: in.UserID,
		CreatedAt: s.now(),
	}
	if kind == KindAudio {
		a.TranscodeStatus = TranscodePending
	}
	if err := s.Store.CreateAsset(ctx, a); err != nil {
		return Asset{}, err
	}
	_ = s.Store.DeleteIntent(ctx, key)
	return a, nil
}

func (s *Service) Delete(ctx context.Context, userID, eventID, assetID string) error {
	_ = userID
	a, err := s.Store.AssetByID(ctx, assetID)
	if err != nil {
		return err
	}
	if a.OwnerType != OwnerEvent || a.OwnerID != eventID {
		return auth.ErrNotFound
	}
	inTracks, err := s.Store.AssetInTracks(ctx, a.ID)
	if err != nil {
		return err
	}
	if inTracks {
		return auth.ErrConflict
	}
	status, flyerID, err := s.Events.EventStatus(ctx, eventID)
	if err != nil {
		return err
	}
	if a.ID == flyerID && (status == events.StatusPendingReview || status == events.StatusPublished) {
		return auth.ErrConflict
	}
	if err := s.Events.ClearFlyerIf(ctx, eventID, a.ID); err != nil {
		return err
	}
	_ = s.Objects.Delete(ctx, a.Key)
	if a.ThumbKey != "" {
		_ = s.Objects.Delete(ctx, a.ThumbKey)
	}
	if a.PreviewKey != "" {
		_ = s.Objects.Delete(ctx, a.PreviewKey)
	}
	return s.Store.DeleteAsset(ctx, a.ID)
}

func (s *Service) UsableFlyer(ctx context.Context, eventID, assetID string) error {
	a, err := s.Store.AssetByID(ctx, assetID)
	if err != nil {
		return auth.Invalid{Fields: []auth.Field{{Name: "flyer", Issue: "required"}}}
	}
	if a.OwnerType != OwnerEvent || a.OwnerID != eventID || a.Kind != KindFlyer {
		return auth.Invalid{Fields: []auth.Field{{Name: "flyer", Issue: "required"}}}
	}
	if a.Status == StatusFailed {
		return auth.Invalid{Fields: []auth.Field{{Name: "flyer", Issue: "failed"}}}
	}
	return nil
}

func (s *Service) EventImages(ctx context.Context, eventIDs ...string) (map[string]events.EventMedia, error) {
	out := make(map[string]events.EventMedia, len(eventIDs))
	for _, id := range eventIDs {
		out[id] = events.EventMedia{Gallery: []events.Image{}}
	}
	for _, eventID := range eventIDs {
		list, err := s.Store.ListEventAssets(ctx, eventID)
		if err != nil {
			return nil, err
		}
		em := events.EventMedia{Gallery: []events.Image{}}
		var flyerID string
		if s.Events != nil {
			_, flyerID, _ = s.Events.EventStatus(ctx, eventID)
		}
		for _, a := range list {
			if a.Status == StatusFailed {
				continue
			}
			v := s.view(a)
			if a.ID == flyerID || (flyerID == "" && a.Kind == KindFlyer && em.Flyer == nil) {
				cp := v
				em.Flyer = &cp
				continue
			}
			if a.Kind == KindGallery {
				em.Gallery = append(em.Gallery, v)
			}
		}
		out[eventID] = em
	}
	return out, nil
}

func (s *Service) enqueueProcess(ctx context.Context, assetID string) error {
	if s.Publisher != nil {
		body, _ := json.Marshal(map[string]string{"asset_id": assetID})
		if err := s.Publisher.Publish(ctx, broker.SubjectMediaProcess, body); err == nil {
			return nil
		}
	}
	return s.Process(ctx, assetID)
}

func (s *Service) view(a Asset) events.Image {
	pub := func(key string) string {
		if s.Objects == nil || key == "" {
			return ""
		}
		return s.Objects.GetPublicURL(key)
	}
	return toView(a, pub)
}

func (s *Service) log() *slog.Logger {
	if s.Log != nil {
		return s.Log
	}
	return slog.Default()
}

func newID() (string, error) {
	id, err := uuid.NewV7()
	if err != nil {
		return uuid.NewString(), nil
	}
	return id.String(), nil
}

func thumbKey(key string) string {
	ext := path.Ext(key)
	base := strings.TrimSuffix(key, ext)
	return base + thumbSuffix
}
