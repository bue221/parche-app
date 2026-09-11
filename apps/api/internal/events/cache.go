package events

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// MemoryCache is for tests and when Redis is down.
type MemoryCache struct {
	mu   sync.Mutex
	data map[string]memEntry
}

type memEntry struct {
	val string
	exp time.Time
}

func NewMemoryCache() *MemoryCache {
	return &MemoryCache{data: map[string]memEntry{}}
}

func (c *MemoryCache) Get(_ context.Context, key string) (string, bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.data[key]
	if !ok || time.Now().After(e.exp) {
		delete(c.data, key)
		return "", false, nil
	}
	return e.val, true, nil
}

func (c *MemoryCache) Set(_ context.Context, key, val string, ttl time.Duration) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data[key] = memEntry{val: val, exp: time.Now().Add(ttl)}
	return nil
}

func (c *MemoryCache) DeletePrefix(_ context.Context, prefix string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	for k := range c.data {
		if strings.HasPrefix(k, prefix) {
			delete(c.data, k)
		}
	}
	return nil
}

// RedisCache stores GET /v1/events pages. SCAN is acceptable: keys are hashed queries, TTL 30s.
type RedisCache struct {
	Client redis.Cmdable
}

func (c RedisCache) Get(ctx context.Context, key string) (string, bool, error) {
	if c.Client == nil {
		return "", false, nil
	}
	val, err := c.Client.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return val, true, nil
}

func (c RedisCache) Set(ctx context.Context, key, val string, ttl time.Duration) error {
	if c.Client == nil {
		return nil
	}
	return c.Client.Set(ctx, key, val, ttl).Err()
}

func (c RedisCache) DeletePrefix(ctx context.Context, prefix string) error {
	if c.Client == nil {
		return nil
	}
	var cursor uint64
	for {
		keys, next, err := c.Client.Scan(ctx, cursor, prefix+"*", 64).Result()
		if err != nil {
			return err
		}
		if len(keys) > 0 {
			if err := c.Client.Del(ctx, keys...).Err(); err != nil {
				return err
			}
		}
		cursor = next
		if cursor == 0 {
			return nil
		}
	}
}

func listCacheKey(rawQuery string) string {
	sum := sha256.Sum256([]byte(rawQuery))
	return listCachePref + hex.EncodeToString(sum[:16])
}
