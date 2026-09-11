package ratelimit

import (
	"context"
	"testing"
	"time"
)

func TestMemoryAllowsUntilLimit(t *testing.T) {
	m := NewMemory()
	ctx := context.Background()
	for i := 0; i < 10; i++ {
		ok, _, err := m.Allow(ctx, "rl:auth:1.1.1.1:a@b.c", 10, 15*time.Minute)
		if err != nil || !ok {
			t.Fatalf("hit %d: ok=%v err=%v", i+1, ok, err)
		}
	}
	ok, retry, err := m.Allow(ctx, "rl:auth:1.1.1.1:a@b.c", 10, 15*time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Fatal("expected 11th request to be limited")
	}
	if retry <= 0 {
		t.Fatal("expected positive Retry-After")
	}
}

func TestMemoryIsolatesKeys(t *testing.T) {
	m := NewMemory()
	ctx := context.Background()
	for i := 0; i < 10; i++ {
		ok, _, err := m.Allow(ctx, "a", 10, time.Minute)
		if err != nil || !ok {
			t.Fatal("key a should be allowed")
		}
	}
	ok, _, err := m.Allow(ctx, "b", 10, time.Minute)
	if err != nil || !ok {
		t.Fatal("key b should not share a's counter")
	}
}

func TestMemoryWindowReset(t *testing.T) {
	m := NewMemory()
	base := time.Date(2026, 9, 11, 12, 0, 0, 0, time.UTC)
	m.now = func() time.Time { return base }
	ctx := context.Background()
	for i := 0; i < 2; i++ {
		ok, _, err := m.Allow(ctx, "k", 2, time.Second)
		if err != nil || !ok {
			t.Fatal(err)
		}
	}
	ok, _, _ := m.Allow(ctx, "k", 2, time.Second)
	if ok {
		t.Fatal("expected limited")
	}
	m.now = func() time.Time { return base.Add(2 * time.Second) }
	ok, _, err := m.Allow(ctx, "k", 2, time.Second)
	if err != nil || !ok {
		t.Fatal("window should reset")
	}
}
