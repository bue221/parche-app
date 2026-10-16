package recs

import (
	"testing"
	"time"

	"github.com/parche-app/backend/internal/auth"
)

func TestForUserAndRefresh(t *testing.T) {
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	mem := NewMemory()
	mem.SetCandidates([]Candidate{
		cand("hot", "techno", "", 9, 4.7, -74.0, now.Add(48*time.Hour)),
		cand("dj-night", "acid", "dj-1", 1, 4.7, -74.0, now.Add(24*time.Hour)),
		cand("bought", "techno", "", 3, 4.7, -74.0, now.Add(72*time.Hour)),
	})
	svc := NewService(mem, mem)
	svc.Now = func() time.Time { return now }

	fresh, err := svc.ForUser(t.Context(), "newbie")
	if err != nil {
		t.Fatal(err)
	}
	if len(fresh) == 0 || fresh[0].EventID != "hot" || fresh[0].Reason != ReasonPopular {
		t.Fatalf("cold=%+v", fresh)
	}

	mem.SetFollows("fan", []string{"dj-1"})
	fan, err := svc.ForUser(t.Context(), "fan")
	if err != nil {
		t.Fatal(err)
	}
	if len(fan) == 0 || fan[0].EventID != "dj-night" || fan[0].Reason != ReasonFollow {
		t.Fatalf("follow=%+v", fan)
	}

	mem.SetPaid("fan", []string{"bought"})
	mem.rows["fan"] = nil
	fan, err = svc.ForUser(t.Context(), "fan")
	if err != nil {
		t.Fatal(err)
	}
	for _, it := range fan {
		if it.EventID == "bought" {
			t.Fatalf("bought in recs: %+v", fan)
		}
	}

	if _, err := svc.ForUser(t.Context(), ""); err != auth.ErrUnauthorized {
		t.Fatalf("empty user=%v", err)
	}

	n, err := svc.RefreshAll(t.Context())
	if err != nil || n < 1 {
		t.Fatalf("refresh=%d %v", n, err)
	}
	cached, err := mem.ListUser(t.Context(), "fan", 20)
	if err != nil || len(cached) == 0 {
		t.Fatalf("cached=%v %v", cached, err)
	}
}

func TestSimilarLineupAndGenre(t *testing.T) {
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	mem := NewMemory()
	mem.SetCandidates([]Candidate{
		cand("seed", "techno", "dj-1", 1, 4.7, -74.0, now.Add(24*time.Hour)),
		cand("same-dj", "cumbia", "dj-1", 0, 5.9, -74.0, now.Add(48*time.Hour)),
		cand("same-genre", "techno", "dj-2", 0, 5.9, -74.0, now.Add(36*time.Hour)),
	})
	svc := NewService(mem, mem)
	svc.Now = func() time.Time { return now }

	got, err := svc.Similar(t.Context(), "seed")
	if err != nil {
		t.Fatal(err)
	}
	if len(got) < 2 {
		t.Fatalf("similar=%+v", got)
	}
	for _, it := range got {
		if it.EventID == "seed" {
			t.Fatalf("seed leaked: %+v", got)
		}
	}
	if got[0].EventID != "same-dj" || got[0].Reason != ReasonFollow {
		t.Fatalf("expected lineup first: %+v", got)
	}

	if _, err := svc.Similar(t.Context(), "missing"); err != auth.ErrNotFound {
		t.Fatalf("missing=%v", err)
	}
}
