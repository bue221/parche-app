package redisx

import (
	"context"
	"fmt"
	"strings"

	"github.com/redis/go-redis/v9"
)

// Connect parses REDIS_URL. Availability is checked on /ready, not at listen time.
func Connect(_ context.Context, redisURL string) (*redis.Client, error) {
	if strings.TrimSpace(redisURL) == "" {
		return nil, fmt.Errorf("REDIS_URL is required")
	}
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse REDIS_URL: %w", err)
	}
	return redis.NewClient(opt), nil
}

// Ping checks Redis.
func Ping(ctx context.Context, client *redis.Client) error {
	return client.Ping(ctx).Err()
}

// Checker adapts Redis to health.Checker.
type Checker struct {
	Client *redis.Client
}

func (c Checker) Name() string { return "redis" }

func (c Checker) Ping(ctx context.Context) error {
	if c.Client == nil {
		return fmt.Errorf("redis client is nil")
	}
	return Ping(ctx, c.Client)
}
