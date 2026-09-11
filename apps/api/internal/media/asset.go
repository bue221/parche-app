package media

import (
	"context"
	"time"

	"github.com/parche-app/backend/internal/events"
	"github.com/parche-app/backend/internal/objectstore"
)

const (
	OwnerEvent  = "event"
	OwnerUser   = "user"
	OwnerArtist = "artist"

	KindFlyer   = objectstore.KindFlyer
	KindGallery = objectstore.KindGallery
	KindAvatar  = objectstore.KindAvatar
	KindAudio   = objectstore.KindAudio

	StatusProcessing = "processing"
	StatusReady      = "ready"
	StatusFailed     = "failed"

	intentTTL   = 15 * time.Minute
	maxFlyerPx  = 1600
	maxThumbPx  = 800
	thumbMIME   = "image/webp"
	thumbSuffix = ".thumb.webp"
)

// Asset is confirmed object metadata for an event, user, or artist.
type Asset struct {
	ID        string
	TenantID  string
	OwnerType string
	OwnerID   string
	Kind      string
	Key       string
	ThumbKey  string
	MIME      string
	Bytes     int64
	Width     int
	Height    int
	Status    string
	CreatedBy string
	CreatedAt time.Time
}

// Intent is a server-issued upload key. Confirm rejects keys that were not issued to the caller.
type Intent struct {
	Key         string
	UserID      string
	Kind        string
	EventID     string
	ContentType string
	ByteSize    int64
	ExpiresAt   time.Time
}

// ConfirmInput is POST /v1/events/{id}/assets.
type ConfirmInput struct {
	UserID   string
	TenantID string
	EventID  string
	Key      string
	Kind     string
}

func toView(a Asset, pub func(string) string) events.Image {
	img := events.Image{
		ID:        a.ID,
		Kind:      a.Kind,
		PublicURL: pub(a.Key),
	}
	if a.ThumbKey != "" {
		img.ThumbURL = pub(a.ThumbKey)
	}
	return img
}

// Store persists intents and assets.
type Store interface {
	SaveIntent(ctx context.Context, in Intent) error
	IntentByKey(ctx context.Context, key string) (Intent, error)
	DeleteIntent(ctx context.Context, key string) error
	CreateAsset(ctx context.Context, a Asset) error
	AssetByID(ctx context.Context, id string) (Asset, error)
	AssetByKey(ctx context.Context, key string) (Asset, error)
	UpdateAsset(ctx context.Context, a Asset) error
	DeleteAsset(ctx context.Context, id string) error
	ListEventAssets(ctx context.Context, eventID string) ([]Asset, error)
}

// EventBinder updates events.flyer_asset_id (implemented by events.Service).
type EventBinder interface {
	BindFlyer(ctx context.Context, eventID, assetID string) (previousAssetID string, status string, err error)
	ClearFlyerIf(ctx context.Context, eventID, assetID string) error
	EventStatus(ctx context.Context, eventID string) (status, flyerAssetID string, err error)
}

// Publisher is NATS (or a test fake). Nil means Process runs in-process.
type Publisher interface {
	Publish(ctx context.Context, subject string, payload []byte) error
}
