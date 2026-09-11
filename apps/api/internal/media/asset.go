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

	TranscodePending = "pending"
	TranscodeReady   = "ready"
	TranscodeFailed  = "failed"

	intentTTL       = 15 * time.Minute
	maxFlyerPx      = 1600
	maxThumbPx      = 800
	thumbMIME       = "image/webp"
	thumbSuffix     = ".thumb.webp"
	previewSuffix   = ".preview.mp3"
	previewMIME     = "audio/mpeg"
	maxTracks       = 10
	maxTrackTitle   = 120
	previewSeconds  = 45
	maxPreviewBytes = 20 << 20
	previewURLTTL   = 10 * time.Minute
	masterURLTTL    = 5 * time.Minute
)

// Asset is confirmed object metadata for an event, user, or artist.
type Asset struct {
	ID              string
	TenantID        string
	OwnerType       string
	OwnerID         string
	Kind            string
	Key             string
	ThumbKey        string
	PreviewKey      string
	MIME            string
	Bytes           int64
	Width           int
	Height          int
	DurationMS      int
	Status          string
	TranscodeStatus string
	CreatedBy       string
	CreatedAt       time.Time
}

// Track is an ordered reference audio row (event_tracks).
type Track struct {
	ID       string
	EventID  string
	AssetID  string
	Title    string
	Position int
}

// AudioView is POST /v1/events/{id}/audio. Masters are never public URLs.
type AudioView struct {
	ID              string `json:"id"`
	Kind            string `json:"kind"`
	MIME            string `json:"mime,omitempty"`
	Bytes           int64  `json:"bytes,omitempty"`
	DurationMS      int    `json:"duration_ms,omitempty"`
	TranscodeStatus string `json:"transcode_status"`
}

// TrackInput is one item in PUT /v1/events/{id}/tracks.
type TrackInput struct {
	AssetID  string `json:"asset_id"`
	Title    string `json:"title"`
	Position int    `json:"position"`
}

// MasterURL is GET /v1/events/{id}/tracks/{id}/master (event.write, short-lived).
type MasterURL struct {
	URL       string    `json:"url"`
	ExpiresAt time.Time `json:"expires_at"`
}

// PreviewResult is a generated 45s preview (tests inject this; production uses ffmpeg).
type PreviewResult struct {
	Body       []byte
	MIME       string
	DurationMS int
}

// Intent is a server-issued upload key. Confirm rejects keys that were not issued to the caller.
type Intent struct {
	Key         string
	UserID      string
	Kind        string
	EventID     string
	ArtistID    string
	ContentType string
	ByteSize    int64
	ExpiresAt   time.Time
}

// ConfirmInput is POST /v1/events/{id}/assets.
type ConfirmInput struct {
	UserID   string
	TenantID string
	EventID  string
	ArtistID string
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
	ReplaceTracks(ctx context.Context, eventID string, tracks []Track) error
	ListTracks(ctx context.Context, eventID string) ([]Track, error)
	TrackByID(ctx context.Context, eventID, trackID string) (Track, error)
	AssetInTracks(ctx context.Context, assetID string) (bool, error)
}

// EventBinder updates events.flyer_asset_id (implemented by events.Service).
type EventBinder interface {
	BindFlyer(ctx context.Context, eventID, assetID string) (previousAssetID string, status string, err error)
	ClearFlyerIf(ctx context.Context, eventID, assetID string) error
	EventStatus(ctx context.Context, eventID string) (status, flyerAssetID string, err error)
}

// ArtistBinder updates artists.avatar_asset_id (implemented by artists.Service).
type ArtistBinder interface {
	BindAvatar(ctx context.Context, artistID, assetID string) (previousAssetID string, err error)
}

// UserBinder updates users.avatar_asset_id (implemented by auth.Service).
type UserBinder interface {
	BindAvatar(ctx context.Context, userID, assetID string) (previousAssetID string, err error)
}

// Publisher is NATS (or a test fake). Nil means Process runs in-process.
type Publisher interface {
	Publish(ctx context.Context, subject string, payload []byte) error
}
