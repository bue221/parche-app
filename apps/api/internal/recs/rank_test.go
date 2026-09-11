package recs

import (
	"testing"
	"time"
)

func TestRankFollowBeatsPopular(t *testing.T) {
	now := time.Date(2026, 9, 12, 0, 0, 0, 0, time.UTC)
	cands := []Candidate{
		cand("popular", "techno", "", 40, 4.7, -74.0, now.Add(48*time.Hour)),
		cand("dj-night", "acid", "dj-1", 1, 4.7, -74.0, now.Add(24*time.Hour)),
	}
	p := buildProfile(cands, []string{"dj-1"}, nil)
	got := rank(cands, p, "", 20)
	if len(got) < 1 || got[0].EventID != "dj-night" || got[0].Reason != ReasonFollow {
		t.Fatalf("got=%+v", got)
	}
}

func TestRankExcludesBought(t *testing.T) {
	now := time.Date(2026, 9, 12, 0, 0, 0, 0, time.UTC)
	cands := []Candidate{
		cand("bought", "techno", "dj-1", 10, 4.7, -74.0, now.Add(24*time.Hour)),
		cand("other", "techno", "", 2, 4.7, -74.0, now.Add(48*time.Hour)),
	}
	p := buildProfile(cands, []string{"dj-1"}, []string{"bought"})
	got := rank(cands, p, "", 20)
	for _, it := range got {
		if it.EventID == "bought" {
			t.Fatalf("bought leaked: %+v", got)
		}
	}
	if len(got) != 1 || got[0].EventID != "other" {
		t.Fatalf("got=%+v", got)
	}
}

func TestRankColdStartPopular(t *testing.T) {
	now := time.Date(2026, 9, 12, 0, 0, 0, 0, time.UTC)
	cands := []Candidate{
		cand("quiet", "acid", "", 1, 4.6, -74.1, now.Add(24*time.Hour)),
		cand("hot", "techno", "", 20, 4.7, -74.0, now.Add(48*time.Hour)),
	}
	p := buildProfile(cands, nil, nil)
	if !p.cold {
		t.Fatal("expected cold start")
	}
	got := rank(cands, p, "", 20)
	if len(got) != 2 || got[0].EventID != "hot" || got[0].Reason != ReasonPopular {
		t.Fatalf("got=%+v", got)
	}
}

func TestRankGenreOverlap(t *testing.T) {
	now := time.Date(2026, 9, 12, 0, 0, 0, 0, time.UTC)
	cands := []Candidate{
		cand("paid-src", "techno", "", 0, 4.7, -74.0, now.Add(24*time.Hour)),
		cand("same-genre", "techno", "", 0, 5.5, -74.0, now.Add(36*time.Hour)),
		cand("other-genre", "cumbia", "", 50, 4.7, -74.0, now.Add(48*time.Hour)),
	}
	p := buildProfile(cands, nil, []string{"paid-src"})
	got := rank(cands, p, "", 20)
	if len(got) < 1 || got[0].EventID != "same-genre" || got[0].Reason != ReasonGenre {
		t.Fatalf("got=%+v p.genres=%v", got, p.genres)
	}
	for _, it := range got {
		if it.EventID == "paid-src" {
			t.Fatalf("source leaked: %+v", got)
		}
	}
}
