package objectstore

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/parche-app/backend/internal/config"
)

type s3Store struct {
	client *minio.Client
	bucket string
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
	return &s3Store{client: client, bucket: cfg.ObjectStoreBucket}, nil
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
	_, err := s.client.StatObject(ctx, s.bucket, key, minio.StatObjectOptions{})
	if err == nil {
		return true, nil
	}
	if minio.ToErrorResponse(err).StatusCode == http.StatusNotFound {
		return false, nil
	}
	return false, err
}
