package events

import (
	"context"
	"errors"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/geo"
	"github.com/parche-app/backend/internal/venues"
)

type stubLineup struct {
	byArtist map[string][]string
}

func (s stubLineup) EventLineup(context.Context, string) ([]LineupSlot, error) {
	return nil, nil
}

func (s stubLineup) EventIDsByArtist(_ context.Context, artistID string) ([]string, error) {
	return s.byArtist[artistID], nil
}

func TestParseSearchValidation(t *testing.T) {
	_, err := ParseSearch(url.Values{"q": {strings.Repeat("n", 81)}})
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("q length=%v", err)
	}
	_, err = ParseSearch(url.Values{"from": {"nope"}})
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("from=%v", err)
	}
	_, err = ParseSearch(url.Values{"from": {"2026-09-20"}, "to": {"2026-09-10"}})
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("order=%v", err)
	}
	_, err = ParseSearch(url.Values{"artist_id": {"not-uuid"}})
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("artist=%v", err)
	}
	f, err := ParseSearch(url.Values{"q": {"Norte"}, "genre": {"Techno", "acid"}})
	if err != nil || f.Q != "Norte" || len(f.Genres) != 2 || f.Genres[0] != "techno" {
		t.Fatalf("ok=%+v %v", f, err)
	}
}

func TestPublicSearchFiltersAndHidesDrafts(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, 9, 11, 18, 0, 0, 0, time.UTC)
	authStore := auth.NewMemory()
	vmem := venues.NewMemory()
	vsvc := venues.NewService(vmem, authStore)
	svc := NewService(NewMemory(), authStore, vsvc, vmem, NewMemoryCache())
	svc.Now = func() time.Time { return now }

	owner := mustUser(t, authStore, "p@example.com", "promoter")
	tenant := mustTenant(t, authStore, owner)
	flyer := "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
	dj := "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

	norte, err := svc.Create(ctx, owner, CreateInput{
		TenantID: tenant, Title: "Norte", Description: "chapinero rave",
		StartsAt: now.Add(24 * time.Hour), EndsAt: now.Add(28 * time.Hour),
		Pin:    &PinInput{Name: "Video Norte", Lat: 4.75, Lng: -74.05},
		Genres: []string{"techno"},
	})
	if err != nil {
		t.Fatal(err)
	}
	sur, err := svc.Create(ctx, owner, CreateInput{
		TenantID: tenant, Title: "Sur", Description: "warehouse",
		StartsAt: now.Add(48 * time.Hour), EndsAt: now.Add(52 * time.Hour),
		Pin:    &PinInput{Name: "Sur Pin", Lat: 4.60, Lng: -74.08},
		Genres: []string{"acid"},
	})
	if err != nil {
		t.Fatal(err)
	}
	draft, err := svc.Create(ctx, owner, CreateInput{
		TenantID: tenant, Title: "Norte draft", Description: "secret",
		StartsAt: now.Add(10 * time.Hour), EndsAt: now.Add(12 * time.Hour),
		Pin:    &PinInput{Name: "Hidden", Lat: 4.75, Lng: -74.05},
		Genres: []string{"techno"},
	})
	if err != nil {
		t.Fatal(err)
	}

	mustPublish := func(e Event) {
		t.Helper()
		e.FlyerAssetID = flyer
		if err := svc.Store.Update(ctx, e); err != nil {
			t.Fatal(err)
		}
		if err := svc.Submit(ctx, owner, e.ID); err != nil {
			t.Fatal(err)
		}
		if _, err := svc.Publish(ctx, e.ID); err != nil {
			t.Fatal(err)
		}
	}
	mustPublish(norte)
	mustPublish(sur)
	svc.Lineup = stubLineup{byArtist: map[string][]string{dj: {norte.ID}}}

	bbox, err := geo.ParseBBox("4.7", "-74.1", "4.8", "-74.0")
	if err != nil {
		t.Fatal(err)
	}
	hit, err := svc.ListPublic(ctx, ListFilter{Q: "Norte", Genres: []string{"techno"}, BBox: bbox, Limit: 20})
	if err != nil || len(hit) != 1 || hit[0].ID != norte.ID {
		t.Fatalf("combo=%+v %v", hit, err)
	}
	for _, e := range hit {
		if e.ID == draft.ID {
			t.Fatal("draft leaked")
		}
	}

	acid, err := svc.ListPublic(ctx, ListFilter{Genres: []string{"acid"}, Limit: 20})
	if err != nil || len(acid) != 1 || acid[0].ID != sur.ID {
		t.Fatalf("genre=%+v %v", acid, err)
	}

	from := now.Add(36 * time.Hour)
	to := now.Add(60 * time.Hour)
	window, err := svc.ListPublic(ctx, ListFilter{From: &from, To: &to, Limit: 20})
	if err != nil || len(window) != 1 || window[0].ID != sur.ID {
		t.Fatalf("from/to=%+v %v", window, err)
	}

	lineup, err := svc.ListPublic(ctx, ListFilter{ArtistID: dj, Limit: 20})
	if err != nil || len(lineup) != 1 || lineup[0].ID != norte.ID {
		t.Fatalf("artist=%+v %v", lineup, err)
	}
	empty, err := svc.ListPublic(ctx, ListFilter{ArtistID: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", Limit: 20})
	if err != nil || len(empty) != 0 {
		t.Fatalf("unknown artist=%+v %v", empty, err)
	}

	leaked, err := svc.ListPublic(ctx, ListFilter{Q: "secret", Limit: 20})
	if err != nil || len(leaked) != 0 {
		t.Fatalf("draft q=%+v %v", leaked, err)
	}

	_, err = svc.ListPublic(ctx, ListFilter{Q: strings.Repeat("n", 81), Limit: 20})
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("q length list=%v", err)
	}

	page, err := svc.ListPublic(ctx, ListFilter{Limit: 1})
	if err != nil || len(page) != 1 || NextCursor(page, 1) == nil {
		t.Fatalf("page=%+v %v", page, err)
	}
	cur := *NextCursor(page, 1)
	rest, err := svc.ListPublic(ctx, ListFilter{Limit: 1, Cursor: cur})
	if err != nil || len(rest) != 1 || rest[0].ID == page[0].ID {
		t.Fatalf("page2=%+v %v", rest, err)
	}
}

func TestCachedPublicJSONDistinctQueries(t *testing.T) {
	ctx := context.Background()
	svc := NewService(NewMemory(), nil, nil, nil, NewMemoryCache())
	calls := map[string]int{}
	load := func(q string) {
		t.Helper()
		_, err := svc.CachedPublicJSON(ctx, q, func() ([]byte, error) {
			calls[q]++
			return []byte(`{"q":"` + q + `"}`), nil
		})
		if err != nil {
			t.Fatal(err)
		}
	}
	load("q=norte")
	load("q=sur")
	load("q=norte")
	if calls["q=norte"] != 1 || calls["q=sur"] != 1 {
		t.Fatalf("cache partition=%v", calls)
	}
}
