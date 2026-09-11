package venues

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/geo"
)

type memTenancy struct {
	roles map[string]string
}

func (m memTenancy) Membership(_ context.Context, tenantID, userID string) (string, error) {
	role, ok := m.roles[tenantID+"/"+userID]
	if !ok {
		return "", auth.ErrNotFound
	}
	return role, nil
}

func TestCreateGetPatchListAndBBox(t *testing.T) {
	ctx := context.Background()
	store := NewMemory()
	ten := memTenancy{roles: map[string]string{"t1/u1": auth.TenantOwner, "t1/staff": auth.TenantStaff}}
	svc := NewService(store, ten)

	_, err := svc.Create(ctx, "stranger", CreateInput{TenantID: "t1", Name: "Video", Lat: 4.6, Lng: -74.05})
	if !errors.Is(err, auth.ErrNotFound) {
		t.Fatalf("stranger=%v", err)
	}
	_, err = svc.Create(ctx, "u1", CreateInput{TenantID: "t1", Name: "Video", Lat: 91, Lng: -74})
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("lat=%v", err)
	}
	_, err = svc.Create(ctx, "u1", CreateInput{
		TenantID: "t1", Name: "Video", Lat: 4.6, Lng: -74.05, Source: "google_places",
	})
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("google=%v", err)
	}

	poly := json.RawMessage(`{"type":"Polygon","coordinates":[[[-74.1,4.5],[-74.0,4.5],[-74.0,4.7],[-74.1,4.7],[-74.1,4.5]]]}`)
	v, err := svc.Create(ctx, "u1", CreateInput{
		TenantID: "t1", Name: "Video Club", AddressText: "Chapinero, Bogotá",
		Lat: 4.65, Lng: -74.06, GeoJSON: poly,
	})
	if err != nil {
		t.Fatal(err)
	}
	if v.Source != SourceUserPin || len(v.GeoJSON) == 0 {
		t.Fatalf("venue=%+v", v)
	}

	_, err = svc.Get(ctx, "", v.ID)
	if !errors.Is(err, auth.ErrNotFound) {
		t.Fatalf("unpublished public=%v", err)
	}
	got, err := svc.Get(ctx, "u1", v.ID)
	if err != nil || got.Name != "Video Club" {
		t.Fatalf("owner get=%+v %v", got, err)
	}

	name := "Video Club Norte"
	lat, lng := 4.70, -74.05
	patched, err := svc.Patch(ctx, "staff", v.ID, PatchInput{Name: &name, Lat: &lat, Lng: &lng})
	if err != nil || patched.Name != name || patched.Lat != lat {
		t.Fatalf("staff patch=%+v %v", patched, err)
	}

	public, err := svc.List(ctx, "", ListFilter{Limit: 20})
	if err != nil || len(public) != 0 {
		t.Fatalf("unpublished list=%+v %v", public, err)
	}
	if err := svc.RecordPublishedEvent(ctx, v.ID, 1); err != nil {
		t.Fatal(err)
	}
	open, err := svc.Get(ctx, "", v.ID)
	if err != nil || open.Lat == 0 {
		t.Fatalf("published get=%+v %v", open, err)
	}

	bbox, err := geo.ParseBBox("4.6", "-74.1", "4.8", "-74.0")
	if err != nil {
		t.Fatal(err)
	}
	hit, err := svc.List(ctx, "", ListFilter{BBox: bbox, Limit: 20, Q: "video"})
	if err != nil || len(hit) != 1 {
		t.Fatalf("bbox=%+v %v", hit, err)
	}
	missBBox, _ := geo.ParseBBox("0", "0", "1", "1")
	miss, err := svc.List(ctx, "", ListFilter{BBox: missBBox, Limit: 20})
	if err != nil || len(miss) != 0 {
		t.Fatalf("miss=%+v %v", miss, err)
	}

	own, err := svc.List(ctx, "u1", ListFilter{TenantID: "t1", Limit: 20})
	if err != nil || len(own) != 1 {
		t.Fatalf("tenant list=%+v %v", own, err)
	}
}

func TestClubDirectoryListedAndPublished(t *testing.T) {
	ctx := context.Background()
	store := NewMemory()
	ten := memTenancy{roles: map[string]string{"t1/u1": auth.TenantOwner, "t1/staff": auth.TenantStaff}}
	svc := NewService(store, ten)

	other, err := svc.Create(ctx, "u1", CreateInput{TenantID: "t1", Name: "Casa", Lat: 4.65, Lng: -74.06})
	if err != nil || other.Kind != KindOther || other.Listed {
		t.Fatalf("other=%+v %v", other, err)
	}
	club, err := svc.CreateClub(ctx, "u1", CreateInput{TenantID: "t1", Name: "Video Club", AddressText: "Chapinero", Lat: 4.65, Lng: -74.06})
	if err != nil || club.Kind != KindClub || !club.Listed {
		t.Fatalf("club=%+v %v", club, err)
	}

	open, err := svc.GetClub(ctx, "", club.ID)
	if err != nil || open.ID != club.ID {
		t.Fatalf("listed public=%+v %v", open, err)
	}
	if _, err := svc.GetClub(ctx, "", other.ID); !errors.Is(err, auth.ErrNotFound) {
		t.Fatalf("other as club=%v", err)
	}
	dir, err := svc.ListClubs(ctx, ListFilter{Limit: 20, Q: "video"})
	if err != nil || len(dir) != 1 {
		t.Fatalf("listed dir=%+v %v", dir, err)
	}

	listed := false
	if _, err := svc.PatchClub(ctx, "staff", club.ID, PatchInput{Listed: &listed}); !errors.Is(err, auth.ErrForbidden) {
		t.Fatalf("staff patch=%v", err)
	}
	unlisted, err := svc.PatchClub(ctx, "u1", club.ID, PatchInput{Listed: &listed})
	if err != nil || unlisted.Listed {
		t.Fatalf("unlist=%+v %v", unlisted, err)
	}
	if _, err := svc.GetClub(ctx, "", club.ID); !errors.Is(err, auth.ErrNotFound) {
		t.Fatalf("unlisted public=%v", err)
	}
	empty, err := svc.ListClubs(ctx, ListFilter{Limit: 20})
	if err != nil || len(empty) != 0 {
		t.Fatalf("unlisted dir=%+v %v", empty, err)
	}
	if err := svc.RecordPublishedEvent(ctx, club.ID, 1); err != nil {
		t.Fatal(err)
	}
	pub, err := svc.GetClub(ctx, "", club.ID)
	if err != nil || pub.PublishedUses != 1 {
		t.Fatalf("published club=%+v %v", pub, err)
	}
	again, err := svc.ListClubs(ctx, ListFilter{Limit: 20})
	if err != nil || len(again) != 1 {
		t.Fatalf("published dir=%+v %v", again, err)
	}
}

func TestPublishWithoutPin(t *testing.T) {
	if err := geo.RequirePin(nil, nil); !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("err=%v", err)
	}
}
