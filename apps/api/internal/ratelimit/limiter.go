package ratelimit

import (
	"context"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// Limiter is a fixed-window counter. Keys are caller-built (IP, email, user).
type Limiter interface {
	Allow(ctx context.Context, key string, limit int, window time.Duration) (allowed bool, retryAfter time.Duration, err error)
}

const incrScript = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
if n > tonumber(ARGV[2]) then
  local ttl = redis.call('TTL', KEYS[1])
  if ttl < 0 then
    ttl = tonumber(ARGV[1])
  end
  return {0, ttl}
end
return {1, 0}
`

// New uses Redis when the client is non-nil; otherwise an in-process counter (tests / degraded).
func New(client *redis.Client) Limiter {
	if client == nil {
		return NewMemory()
	}
	return &Redis{client: client}
}

// Redis implements Limiter with INCR + EXPIRE.
type Redis struct {
	client *redis.Client
}

func (r *Redis) Allow(ctx context.Context, key string, limit int, window time.Duration) (bool, time.Duration, error) {
	sec := int(window / time.Second)
	if sec < 1 {
		sec = 1
	}
	res, err := r.client.Eval(ctx, incrScript, []string{key}, sec, limit).Int64Slice()
	if err != nil {
		return false, 0, err
	}
	if len(res) < 2 {
		return true, 0, nil
	}
	if res[0] == 1 {
		return true, 0, nil
	}
	return false, time.Duration(res[1]) * time.Second, nil
}

type memEntry struct {
	count     int
	expiresAt time.Time
}

// Memory is a process-local limiter for tests and when Redis is unavailable.
type Memory struct {
	mu      sync.Mutex
	entries map[string]memEntry
	now     func() time.Time
}

func NewMemory() *Memory {
	return &Memory{entries: map[string]memEntry{}, now: time.Now}
}

func (m *Memory) Allow(_ context.Context, key string, limit int, window time.Duration) (bool, time.Duration, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := m.now()
	ent, ok := m.entries[key]
	if !ok || now.After(ent.expiresAt) {
		m.entries[key] = memEntry{count: 1, expiresAt: now.Add(window)}
		return true, 0, nil
	}
	ent.count++
	m.entries[key] = ent
	if ent.count > limit {
		return false, ent.expiresAt.Sub(now), nil
	}
	return true, 0, nil
}
