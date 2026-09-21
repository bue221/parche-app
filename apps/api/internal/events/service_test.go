package events

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/geo"
	"github.com/parche-app/backend/internal/payments"
	"github.com/parche-app/backend/internal/venues"
)

func TestLifecycleDraftHiddenSubmitPublishCancelAndPatch(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, 9, 11, 18, 0, 0, 0, time.UTC)
	authStore := auth.NewMemory()
	vmem := venues.NewMemory()
	vsvc := venues.NewService(vmem, authStore)
	cache := NewMemoryCache()
	svc := NewService(NewMemory(), authStore, vsvc, vmem, cache)
	svc.Now = func() time.Time { return now }

	owner := mustUser(t, authStore, "p@example.com", "promoter")
	attendee := mustUser(t, authStore, "a@example.com", "attendee")
	tenant := mustTenant(t, authStore, owner)

	_, err := svc.Create(ctx, attendee, CreateInput{
		TenantID: tenant, Title: "X", StartsAt: now.Add(time.Hour), EndsAt: now.Add(2 * time.Hour),
		Pin: &PinInput{Name: "Video", Lat: 4.65, Lng: -74.06},
	})
	if !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("attendee create=%v", err)
	}

	_, err = svc.Create(ctx, owner, CreateInput{
		TenantID: tenant, Title: "Bad dates", StartsAt: now.Add(2 * time.Hour), EndsAt: now.Add(time.Hour),
		Pin: &PinInput{Name: "Video", Lat: 4.65, Lng: -74.06},
	})
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("ends_at=%v", err)
	}

	draft, err := svc.Create(ctx, owner, CreateInput{
		TenantID: tenant, Title: "Norte", Description: "rave",
		StartsAt: now.Add(24 * time.Hour), EndsAt: now.Add(28 * time.Hour),
		Pin:    &PinInput{Name: "Video Norte", Lat: 4.75, Lng: -74.05, AddressText: "Chapinero"},
		Genres: []string{"Techno", "acid"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if draft.Status != StatusDraft || draft.Lat == 0 {
		t.Fatalf("draft=%+v", draft)
	}

	public, err := svc.ListPublic(ctx, ListFilter{Limit: 20})
	if err != nil || len(public) != 0 {
		t.Fatalf("draft leaked=%+v %v", public, err)
	}
	_, err = svc.Get(ctx, "", draft.ID)
	if !errors.Is(err, auth.ErrNotFound) {
		t.Fatalf("public draft get=%v", err)
	}
	got, err := svc.Get(ctx, owner, draft.ID)
	if err != nil || got.Title != "Norte" {
		t.Fatalf("owner get=%+v %v", got, err)
	}

	orphan := draft
	orphan.ID = "00000000-0000-4000-8000-000000000099"
	orphan.Slug = "no-pin-orphan"
	orphan.VenueID = ""
	if err := svc.Store.Create(ctx, orphan, owner); err != nil {
		t.Fatal(err)
	}
	if err := svc.Submit(ctx, owner, orphan.ID); !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("submit without pin=%v", err)
	}

	if err := svc.Submit(ctx, owner, draft.ID); !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("submit without flyer=%v", err)
	}
	draft.FlyerAssetID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
	if err := svc.Store.Update(ctx, draft); err != nil {
		t.Fatal(err)
	}

	if err := svc.Submit(ctx, owner, draft.ID); err != nil {
		t.Fatal(err)
	}
	pending, err := svc.Get(ctx, owner, draft.ID)
	if err != nil || pending.Status != StatusPendingReview {
		t.Fatalf("submit=%+v %v", pending, err)
	}

	pub, err := svc.Publish(ctx, draft.ID)
	if err != nil || pub.Status != StatusPublished {
		t.Fatalf("publish=%+v %v", pub, err)
	}
	v, err := vmem.ByID(ctx, pub.VenueID)
	if err != nil || v.PublishedUses != 1 {
		t.Fatalf("published_uses=%+v %v", v, err)
	}
	open, err := svc.Get(ctx, "", draft.ID)
	if err != nil || open.Lat == 0 {
		t.Fatalf("public get=%+v %v", open, err)
	}

	listed, err := svc.ListPublic(ctx, ListFilter{Limit: 20})
	if err != nil || len(listed) != 1 || listed[0].Title != "Norte" {
		t.Fatalf("agenda=%+v %v", listed, err)
	}
	bbox, err := geo.ParseBBox("4.7", "-74.1", "4.8", "-74.0")
	if err != nil {
		t.Fatal(err)
	}
	hit, err := svc.ListPublic(ctx, ListFilter{BBox: bbox, Limit: 20})
	if err != nil || len(hit) != 1 {
		t.Fatalf("bbox hit=%+v %v", hit, err)
	}
	missBBox, _ := geo.ParseBBox("0", "0", "1", "1")
	miss, err := svc.ListPublic(ctx, ListFilter{BBox: missBBox, Limit: 20})
	if err != nil || len(miss) != 0 {
		t.Fatalf("bbox miss=%+v %v", miss, err)
	}

	desc := "updated copy"
	patched, err := svc.Patch(ctx, owner, draft.ID, PatchInput{Description: &desc})
	if err != nil || patched.Status != StatusPublished || patched.Description != desc {
		t.Fatalf("desc patch=%+v %v", patched, err)
	}

	starts := now.Add(48 * time.Hour)
	ends := now.Add(52 * time.Hour)
	review, err := svc.Patch(ctx, owner, draft.ID, PatchInput{StartsAt: &starts, EndsAt: &ends})
	if err != nil || review.Status != StatusPendingReview {
		t.Fatalf("schedule patch=%+v %v", review, err)
	}
	v, _ = vmem.ByID(ctx, review.VenueID)
	if v.PublishedUses != 0 {
		t.Fatalf("unpublished uses=%d", v.PublishedUses)
	}

	if _, err := svc.Publish(ctx, draft.ID); err != nil {
		t.Fatal(err)
	}
	if err := svc.Cancel(ctx, owner, draft.ID); err != nil {
		t.Fatal(err)
	}
	gone, err := svc.ListPublic(ctx, ListFilter{Limit: 20})
	if err != nil || len(gone) != 0 {
		t.Fatalf("cancelled still listed=%+v", gone)
	}
	cancelled, err := svc.Get(ctx, "", draft.ID)
	if err != nil || cancelled.Status != StatusCancelled {
		t.Fatalf("cancelled detail=%+v %v", cancelled, err)
	}

	key := listCacheKey("q=1")
	if err := cache.Set(ctx, key, "stale", time.Minute); err != nil {
		t.Fatal(err)
	}
	if err := cache.DeletePrefix(ctx, listCachePref); err != nil {
		t.Fatal(err)
	}
	if _, ok, _ := cache.Get(ctx, key); ok {
		t.Fatal("cache prefix should invalidate")
	}
	_ = json.RawMessage(nil)
}

func TestCachedPublicJSONRoundTrip(t *testing.T) {
	ctx := context.Background()
	cache := NewMemoryCache()
	svc := NewService(NewMemory(), nil, nil, nil, cache)
	calls := 0
	body, err := svc.CachedPublicJSON(ctx, "limit=1", func() ([]byte, error) {
		calls++
		return []byte(`{"items":[]}`), nil
	})
	if err != nil || string(body) != `{"items":[]}` || calls != 1 {
		t.Fatalf("miss=%s calls=%d err=%v", body, calls, err)
	}
	body, err = svc.CachedPublicJSON(ctx, "limit=1", func() ([]byte, error) {
		calls++
		return []byte(`{"items":[1]}`), nil
	})
	if err != nil || string(body) != `{"items":[]}` || calls != 1 {
		t.Fatalf("hit=%s calls=%d err=%v", body, calls, err)
	}
}

func TestCreateRequiresMercadoPagoSeller(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, 9, 11, 18, 0, 0, 0, time.UTC)
	authStore := auth.NewMemory()
	vmem := venues.NewMemory()
	svc := NewService(NewMemory(), authStore, venues.NewService(vmem, authStore), vmem, NewMemoryCache())
	svc.Now = func() time.Time { return now }
	svc.Payments = payments.MercadoPago{PlatformToken: "APP-TOKEN"}
	sellers := &payments.MemoryAccounts{}
	svc.Sellers = sellers
	svc.RequireMPSeller = true
	owner := mustUser(t, authStore, "payout@example.com", "promoter")
	tenant := mustTenant(t, authStore, owner)
	in := CreateInput{
		TenantID: tenant, Title: "Norte", StartsAt: now.Add(time.Hour), EndsAt: now.Add(2 * time.Hour),
		Pin: &PinInput{Name: "Video", Lat: 4.65, Lng: -74.06},
	}
	if _, err := svc.Create(ctx, owner, in); !errors.Is(err, payments.ErrPayoutRequired) {
		t.Fatalf("err=%v", err)
	}
	if err := sellers.Upsert(ctx, payments.Account{TenantID: tenant, AccessToken: "seller-token", MPUserID: "123"}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Create(ctx, owner, in); err != nil {
		t.Fatal(err)
	}
}

func mustUser(t *testing.T, store *auth.Memory, email, profile string) string {
	t.Helper()
	id, err := newID()
	if err != nil {
		t.Fatal(err)
	}
	acc := auth.Account{
		User:     auth.User{ID: id, Email: email, PasswordHash: "x", DisplayName: "N", Status: auth.StatusActive},
		Profiles: []string{profile},
	}
	if err := store.CreateAccount(context.Background(), acc); err != nil {
		t.Fatal(err)
	}
	return id
}

func mustTenant(t *testing.T, store *auth.Memory, ownerID string) string {
	t.Helper()
	id, err := newID()
	if err != nil {
		t.Fatal(err)
	}
	if err := store.CreateTenant(context.Background(), auth.Tenant{
		ID: id, Slug: "colectivo-" + slugSuffix(id), Name: "Colectivo", Currency: "COP", Status: auth.StatusActive,
	}, ownerID); err != nil {
		t.Fatal(err)
	}
	return id
}
