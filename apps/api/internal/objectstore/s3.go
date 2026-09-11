package objectstore

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/parche-app/backend/internal/config"
)

type s3Store struct {
	client     *minio.Client
	bucket     string
	endpoint   string
	useSSL     bool
	publicBase string
}

// NewS3 talks to MinIO or AWS S3 with the same client.
func NewS3(cfg config.Config) (Store, error) {
	endpoint := strings.TrimSpace(cfg.ObjectStoreEndpoint)
	if endpoint == "" {
		return nil, fmt.Errorf("OBJECT_STORE_ENDPOINT is required for %s driver", cfg.ObjectStoreDriver)
	}
	if strings.TrimSpace(cfg.ObjectStoreAccessKey) == "" || strings.TrimSpace(cfg.ObjectStoreSecretKey) == "" {
		return nil, fmt.Errorf("OBJECT_STORE_ACCESS_KEY and OBJECT_STORE_SECRET_KEY are required")
	}

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.ObjectStoreAccessKey, cfg.ObjectStoreSecretKey, ""),
		Secure: cfg.ObjectStoreUseSSL,
		Region: cfg.ObjectStoreRegion,
	})
	if err != nil {
		return nil, fmt.Errorf("object store client: %w", err)
	}
	return &s3Store{
		client:     client,
		bucket:     cfg.ObjectStoreBucket,
		endpoint:   endpoint,
		useSSL:     cfg.ObjectStoreUseSSL,
		publicBase: strings.TrimRight(strings.TrimSpace(cfg.ObjectStorePublicBaseURL), "/"),
	}, nil
}

func (s *s3Store) Ping(ctx context.Context) error {
	ok, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return err
	}
	if ok {
		return nil
	}
	return s.client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{})
}

func (s *s3Store) Exists(ctx context.Context, key string) (bool, error) {
	if err := validObjectKey(key); err != nil {
		return false, err
	}
	_, err := s.client.StatObject(ctx, s.bucket, key, minio.StatObjectOptions{})
	if err == nil {
		return true, nil
	}
	if minio.ToErrorResponse(err).StatusCode == http.StatusNotFound {
		return false, nil
	}
	return false, err
}

func (s *s3Store) Delete(ctx context.Context, key string) error {
	if err := validObjectKey(key); err != nil {
		return err
	}
	return s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{})
}

func (s *s3Store) PutPresign(ctx context.Context, key, contentType string, maxBytes int64, ttl time.Duration) (Presign, error) {
	_ = maxBytes // size is enforced at POST /v1/uploads; S3 PUT presign has no content-length condition
	if err := validObjectKey(key); err != nil {
		return Presign{}, err
	}
	if ttl < time.Second {
		ttl = time.Second
	}
	hdr := http.Header{}
	hdr.Set("Content-Type", contentType)
	u, err := s.client.PresignHeader(ctx, http.MethodPut, s.bucket, key, ttl, nil, hdr)
	if err != nil {
		return Presign{}, err
	}
	return Presign{
		Method:    http.MethodPut,
		URL:       u.String(),
		Headers:   map[string]string{"Content-Type": contentType},
		ExpiresAt: time.Now().UTC().Add(ttl),
	}, nil
}

func (s *s3Store) GetPresign(ctx context.Context, key string, ttl time.Duration) (string, error) {
	if err := validObjectKey(key); err != nil {
		return "", err
	}
	if ttl < time.Second {
		ttl = time.Second
	}
	u, err := s.client.PresignedGetObject(ctx, s.bucket, key, ttl, nil)
	if err != nil {
		return "", err
	}
	return u.String(), nil
}

func (s *s3Store) GetPublicURL(key string) string {
	if s.publicBase != "" {
		return s.publicBase + "/" + key
	}
	scheme := "http"
	if s.useSSL {
		scheme = "https"
	}
	return scheme + "://" + s.endpoint + "/" + s.bucket + "/" + key
}
