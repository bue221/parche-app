package objectstore

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const defaultPresignTTL = 5 * time.Minute

var (
	// ErrPresignExpired is returned when a fs direct PUT/GET is used after ExpiresAt.
	ErrPresignExpired = errors.New("presign expired")
	// ErrPresignToken is returned when the fs token is missing or forged.
	ErrPresignToken = errors.New("invalid presign token")
	// ErrContentTypeMismatch is returned when PUT Content-Type does not match the grant.
	ErrContentTypeMismatch = errors.New("content-type mismatch")
	// ErrTooLarge is returned when the body exceeds the granted max bytes.
	ErrTooLarge = errors.New("object too large")
)

type fsStore struct {
	root   string
	secret []byte
	now    func() time.Time
}

type directTicket struct {
	V   int    `json:"v"`
	Op  string `json:"op"`
	Key string `json:"key"`
	CT  string `json:"ct,omitempty"`
	Max int64  `json:"max,omitempty"`
	Exp int64  `json:"exp"`
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
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return nil, fmt.Errorf("object store signing key: %w", err)
	}
	return &fsStore{root: abs, secret: secret, now: time.Now}, nil
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
	full, err := s.resolve(key)
	if err != nil {
		return false, err
	}
	_, err = os.Stat(full)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

func (s *fsStore) Delete(_ context.Context, key string) error {
	full, err := s.resolve(key)
	if err != nil {
		return err
	}
	err = os.Remove(full)
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

func (s *fsStore) Head(_ context.Context, key string) (Info, error) {
	full, err := s.resolve(key)
	if err != nil {
		return Info{}, err
	}
	fi, err := os.Stat(full)
	if err != nil {
		if os.IsNotExist(err) {
			return Info{}, ErrNotFound
		}
		return Info{}, err
	}
	return Info{Size: fi.Size(), ContentType: MIMEFromKey(key)}, nil
}

func (s *fsStore) Get(_ context.Context, key string) (io.ReadCloser, Info, error) {
	info, err := s.Head(context.Background(), key)
	if err != nil {
		return nil, Info{}, err
	}
	full, err := s.resolve(key)
	if err != nil {
		return nil, Info{}, err
	}
	f, err := os.Open(full)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, Info{}, ErrNotFound
		}
		return nil, Info{}, err
	}
	return f, info, nil
}

func (s *fsStore) Put(_ context.Context, key, contentType string, r io.Reader, size int64) error {
	_ = contentType
	full, err := s.resolve(key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return err
	}
	f, err := os.Create(full)
	if err != nil {
		return err
	}
	defer f.Close()
	var src io.Reader = r
	if size > 0 {
		src = io.LimitReader(r, size)
	}
	_, err = io.Copy(f, src)
	return err
}

func (s *fsStore) PutPresign(_ context.Context, key, contentType string, maxBytes int64, ttl time.Duration) (Presign, error) {
	if err := validObjectKey(key); err != nil {
		return Presign{}, err
	}
	if ttl <= 0 {
		ttl = defaultPresignTTL
	}
	exp := s.clock().Add(ttl)
	token, err := s.sign(directTicket{
		V:   1,
		Op:  "put",
		Key: key,
		CT:  contentType,
		Max: maxBytes,
		Exp: exp.Unix(),
	})
	if err != nil {
		return Presign{}, err
	}
	return Presign{
		Method:    "PUT",
		URL:       DirectPutPrefix + token,
		Headers:   map[string]string{"Content-Type": contentType},
		ExpiresAt: exp.UTC(),
	}, nil
}

func (s *fsStore) GetPresign(_ context.Context, key string, ttl time.Duration) (string, error) {
	if err := validObjectKey(key); err != nil {
		return "", err
	}
	if ttl <= 0 {
		ttl = defaultPresignTTL
	}
	exp := s.clock().Add(ttl)
	token, err := s.sign(directTicket{
		V:   1,
		Op:  "get",
		Key: key,
		Exp: exp.Unix(),
	})
	if err != nil {
		return "", err
	}
	return DirectPutPrefix + token, nil
}

func (s *fsStore) GetPublicURL(key string) string {
	return "/media/" + key
}

func (s *fsStore) ConsumePut(ctx context.Context, token, contentType string, body io.Reader, contentLength int64) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	t, err := s.parse(token)
	if err != nil {
		return err
	}
	if t.Op != "put" {
		return ErrPresignToken
	}
	if s.clock().Unix() > t.Exp {
		return ErrPresignExpired
	}
	if contentType != t.CT {
		return ErrContentTypeMismatch
	}
	if t.Max > 0 && contentLength > t.Max {
		return ErrTooLarge
	}
	full, err := s.resolve(t.Key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return err
	}
	limited := io.LimitReader(body, t.Max+1)
	if t.Max <= 0 {
		limited = body
	}
	f, err := os.Create(full)
	if err != nil {
		return err
	}
	defer f.Close()
	n, err := io.Copy(f, limited)
	if err != nil {
		_ = os.Remove(full)
		return err
	}
	if t.Max > 0 && n > t.Max {
		_ = os.Remove(full)
		return ErrTooLarge
	}
	return nil
}

func (s *fsStore) OpenGet(ctx context.Context, token string) (io.ReadCloser, string, error) {
	if err := ctx.Err(); err != nil {
		return nil, "", err
	}
	t, err := s.parse(token)
	if err != nil {
		return nil, "", err
	}
	if t.Op != "get" {
		return nil, "", ErrPresignToken
	}
	if s.clock().Unix() > t.Exp {
		return nil, "", ErrPresignExpired
	}
	full, err := s.resolve(t.Key)
	if err != nil {
		return nil, "", err
	}
	f, err := os.Open(full)
	if err != nil {
		return nil, "", err
	}
	ct := t.CT
	if ct == "" {
		ct = "application/octet-stream"
	}
	return f, ct, nil
}

func (s *fsStore) clock() time.Time {
	if s.now != nil {
		return s.now()
	}
	return time.Now()
}

func (s *fsStore) resolve(key string) (string, error) {
	if err := validObjectKey(key); err != nil {
		return "", err
	}
	full := filepath.Join(s.root, filepath.FromSlash(key))
	rel, err := filepath.Rel(s.root, full)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", fmt.Errorf("invalid object key")
	}
	return full, nil
}

func (s *fsStore) sign(t directTicket) (string, error) {
	raw, err := json.Marshal(t)
	if err != nil {
		return "", err
	}
	mac := hmac.New(sha256.New, s.secret)
	_, _ = mac.Write(raw)
	return base64.RawURLEncoding.EncodeToString(raw) + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil)), nil
}

func (s *fsStore) parse(token string) (directTicket, error) {
	payloadB64, sigB64, ok := strings.Cut(token, ".")
	if !ok {
		return directTicket{}, ErrPresignToken
	}
	raw, err := base64.RawURLEncoding.DecodeString(payloadB64)
	if err != nil {
		return directTicket{}, ErrPresignToken
	}
	sig, err := base64.RawURLEncoding.DecodeString(sigB64)
	if err != nil {
		return directTicket{}, ErrPresignToken
	}
	mac := hmac.New(sha256.New, s.secret)
	_, _ = mac.Write(raw)
	if !hmac.Equal(mac.Sum(nil), sig) {
		return directTicket{}, ErrPresignToken
	}
	var t directTicket
	if err := json.Unmarshal(raw, &t); err != nil {
		return directTicket{}, ErrPresignToken
	}
	return t, nil
}
