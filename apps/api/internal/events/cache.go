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
	mu     sync.Mutex
	data   map[string]memEntry
	hashes map[string]hashEntry
}

type memEntry struct {
	val string
	exp time.Time
}

type hashEntry struct {
	fields map[string]string
	exp    time.Time
}

func NewMemoryCache() *MemoryCache {
	return &MemoryCache{data: map[string]memEntry{}, hashes: map[string]hashEntry{}}
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
	for k := range c.hashes {
		if strings.HasPrefix(k, prefix) {
			delete(c.hashes, k)
		}
	}
	return nil
}

func (c *MemoryCache) HashGet(_ context.Context, key, field string) (string, bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.hashes[key]
	if !ok || time.Now().After(e.exp) {
		delete(c.hashes, key)
		return "", false, nil
	}
	val, ok := e.fields[field]
	if !ok {
		return "", false, nil
	}
	return val, true, nil
}

func (c *MemoryCache) HashSet(_ context.Context, key, field, val string, ttl time.Duration) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.hashes[key]
	if !ok || time.Now().After(e.exp) {
		e = hashEntry{fields: map[string]string{}}
	}
	if e.fields == nil {
		e.fields = map[string]string{}
	}
	e.fields[field] = val
	e.exp = time.Now().Add(ttl)
	c.hashes[key] = e
	return nil
}

func (c *MemoryCache) Delete(_ context.Context, keys ...string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	for _, k := range keys {
		delete(c.data, k)
		delete(c.hashes, k)
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

func (c RedisCache) HashGet(ctx context.Context, key, field string) (string, bool, error) {
	if c.Client == nil {
		return "", false, nil
	}
	val, err := c.Client.HGet(ctx, key, field).Result()
	if err == redis.Nil {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return val, true, nil
}

func (c RedisCache) HashSet(ctx context.Context, key, field, val string, ttl time.Duration) error {
	if c.Client == nil {
		return nil
	}
	pipe := c.Client.TxPipeline()
	pipe.HSet(ctx, key, field, val)
	pipe.Expire(ctx, key, ttl)
	_, err := pipe.Exec(ctx)
	return err
}

func (c RedisCache) Delete(ctx context.Context, keys ...string) error {
	if c.Client == nil || len(keys) == 0 {
		return nil
	}
	return c.Client.Del(ctx, keys...).Err()
}

func listCacheKey(rawQuery string) string {
	sum := sha256.Sum256([]byte(rawQuery))
	return listCachePref + hex.EncodeToString(sum[:16])
}
