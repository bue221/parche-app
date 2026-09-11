package objectstore

import (
	"fmt"
	"path"
	"strings"

	"github.com/google/uuid"
)

// Media kinds accepted by POST /v1/uploads.
const (
	KindFlyer   = "flyer"
	KindGallery = "gallery"
	KindAvatar  = "avatar"
	KindAudio   = "audio"
	KindCover   = "cover"
)

const (
	maxImageBytes = 8 << 20  // 8 MiB
	maxAudioBytes = 80 << 20 // 80 MiB source; preview cap is F10
)

var imageMIME = map[string]string{
	"image/jpeg": "jpg",
	"image/png":  "png",
	"image/webp": "webp",
}

var audioMIME = map[string]string{
	"audio/mpeg": "mp3",
	"audio/ogg":  "ogg",
	"audio/wav":  "wav",
	"audio/mp4":  "m4a",
}

// ValidateUpload rejects disallowed MIME or size before any presign.
func ValidateUpload(kind, contentType string, byteSize int64) error {
	kind = strings.TrimSpace(kind)
	contentType = strings.TrimSpace(contentType)
	if byteSize <= 0 {
		return fmt.Errorf("byte_size")
	}
	switch kind {
	case KindFlyer, KindGallery, KindAvatar, KindCover:
		if _, ok := imageMIME[contentType]; !ok {
			return fmt.Errorf("content_type")
		}
		if byteSize > maxImageBytes {
			return fmt.Errorf("byte_size")
		}
	case KindAudio:
		if _, ok := audioMIME[contentType]; !ok {
			return fmt.Errorf("content_type")
		}
		if byteSize > maxAudioBytes {
			return fmt.Errorf("byte_size")
		}
	default:
		return fmt.Errorf("kind")
	}
	return nil
}

// BuildKey generates the object key on the server. Clients never choose the path.
func BuildKey(kind, tenantID, eventID, userID, contentType string) (string, error) {
	ext, err := extension(kind, contentType)
	if err != nil {
		return "", err
	}
	id, err := uuid.NewV7()
	if err != nil {
		id = uuid.New()
	}
	file := id.String() + "." + ext
	switch kind {
	case KindAvatar:
		if strings.TrimSpace(userID) == "" {
			return "", fmt.Errorf("user_id")
		}
		key := path.Join("users", userID, KindAvatar, file)
		if strings.Contains(key, "/events/") || strings.HasPrefix(key, "events/") {
			return "", fmt.Errorf("avatar key must not live under events/")
		}
		return key, nil
	case KindFlyer, KindGallery, KindAudio:
		if strings.TrimSpace(tenantID) == "" || strings.TrimSpace(eventID) == "" {
			return "", fmt.Errorf("event_id")
		}
		return path.Join(tenantID, eventID, kind, file), nil
	default:
		return "", fmt.Errorf("kind")
	}
}

// BuildArtistAvatarKey is POST /v1/uploads kind=avatar with artist_id (F12).
func BuildArtistAvatarKey(artistID, contentType string) (string, error) {
	if strings.TrimSpace(artistID) == "" {
		return "", fmt.Errorf("artist_id")
	}
	ext, err := extension(KindAvatar, contentType)
	if err != nil {
		return "", err
	}
	id, err := uuid.NewV7()
	if err != nil {
		id = uuid.New()
	}
	file := id.String() + "." + ext
	key := path.Join("artists", artistID, KindAvatar, file)
	if strings.Contains(key, "/events/") || strings.HasPrefix(key, "events/") {
		return "", fmt.Errorf("avatar key must not live under events/")
	}
	return key, nil
}

// BuildPostCoverKey is POST /v1/uploads kind=cover with post_id (F23).
func BuildPostCoverKey(postID, contentType string) (string, error) {
	if strings.TrimSpace(postID) == "" {
		return "", fmt.Errorf("post_id")
	}
	ext, err := extension(KindCover, contentType)
	if err != nil {
		return "", err
	}
	id, err := uuid.NewV7()
	if err != nil {
		id = uuid.New()
	}
	file := id.String() + "." + ext
	key := path.Join("posts", postID, KindCover, file)
	if strings.Contains(key, "/events/") || strings.HasPrefix(key, "events/") {
		return "", fmt.Errorf("cover key must not live under events/")
	}
	return key, nil
}

func extension(kind, contentType string) (string, error) {
	switch kind {
	case KindFlyer, KindGallery, KindAvatar, KindCover:
		ext, ok := imageMIME[contentType]
		if !ok {
			return "", fmt.Errorf("content_type")
		}
		return ext, nil
	case KindAudio:
		ext, ok := audioMIME[contentType]
		if !ok {
			return "", fmt.Errorf("content_type")
		}
		return ext, nil
	default:
		return "", fmt.Errorf("kind")
	}
}

// MIMEFromKey infers a content type from the object extension when Head has none.
func MIMEFromKey(key string) string {
	switch strings.ToLower(path.Ext(key)) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	case ".mp3":
		return "audio/mpeg"
	case ".ogg":
		return "audio/ogg"
	case ".wav":
		return "audio/wav"
	case ".m4a":
		return "audio/mp4"
	default:
		return "application/octet-stream"
	}
}

func validObjectKey(key string) error {
	if key == "" || strings.Contains(key, "..") || strings.HasPrefix(key, "/") || strings.Contains(key, "\\") {
		return fmt.Errorf("invalid object key")
	}
	for _, p := range strings.Split(key, "/") {
		if p == "" || p == "." || p == ".." {
			return fmt.Errorf("invalid object key")
		}
	}
	return nil
}
