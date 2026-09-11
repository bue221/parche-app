package geo

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/parche-app/backend/internal/auth"
)

func TestValidLatLng(t *testing.T) {
	if err := ValidLatLng(4.65, -74.06); err != nil {
		t.Fatal(err)
	}
	if err := ValidLatLng(90, 180); err != nil {
		t.Fatal(err)
	}
	err := ValidLatLng(91, 0)
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("err=%v", err)
	}
	err = ValidLatLng(0, 181)
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("err=%v", err)
	}
}

func TestRequirePin(t *testing.T) {
	if err := RequirePin(nil, ptr(1.0)); !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("missing=%v", err)
	}
	lat, lng := 4.6, -74.0
	if err := RequirePin(&lat, &lng); err != nil {
		t.Fatal(err)
	}
}

func TestParseBBox(t *testing.T) {
	b, err := ParseBBox("", "", "", "")
	if err != nil || b != nil {
		t.Fatalf("empty bbox %+v %v", b, err)
	}
	_, err = ParseBBox("4", "-74", "", "-73")
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("incomplete=%v", err)
	}
	_, err = ParseBBox("5", "-74", "4", "-73")
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("inverted=%v", err)
	}
	_, err = ParseBBox("0", "0", "3", "0.1")
	if !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("span=%v", err)
	}
	got, err := ParseBBox("4.5", "-74.2", "4.8", "-74.0")
	if err != nil {
		t.Fatal(err)
	}
	if !got.Contains(4.65, -74.1) || got.Contains(4.9, -74.1) {
		t.Fatalf("contains %+v", got)
	}
	eq, err := ParseBBox("0", "0", "2", "2")
	if err != nil || eq == nil {
		t.Fatalf("inclusive 2deg: %v %+v", err, eq)
	}
}

func TestValidateGeoJSON(t *testing.T) {
	if err := ValidateGeoJSON(nil); err != nil {
		t.Fatal(err)
	}
	if err := ValidateGeoJSON(json.RawMessage("null")); err != nil {
		t.Fatal(err)
	}
	point := json.RawMessage(`{"type":"Point","coordinates":[-74.06,4.65]}`)
	if err := ValidateGeoJSON(point); err != nil {
		t.Fatal(err)
	}
	poly := json.RawMessage(`{"type":"Polygon","coordinates":[[[-74.1,4.6],[-74.0,4.6],[-74.0,4.7],[-74.1,4.7],[-74.1,4.6]]]}`)
	if err := ValidateGeoJSON(poly); err != nil {
		t.Fatal(err)
	}
	if err := ValidateGeoJSON(json.RawMessage(`{"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[0,0]}}`)); !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("feature=%v", err)
	}
	if err := ValidateGeoJSON(json.RawMessage(`{"type":"Point","coordinates":[200,0]}`)); !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("range=%v", err)
	}
	if err := ValidateGeoJSON(json.RawMessage(`{"type":"Polygon","coordinates":[[[-74,4],[-74,5]]]}`)); !errors.Is(err, auth.ErrValidation) {
		t.Fatalf("short ring=%v", err)
	}
}

func ptr(v float64) *float64 { return &v }

func TestNoGoogleMapsVendor(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("caller")
	}
	root := filepath.Join(filepath.Dir(file), "..", "..")
	for _, name := range []string{"go.mod", "go.sum"} {
		raw, err := os.ReadFile(filepath.Join(root, name))
		if err != nil {
			t.Fatal(err)
		}
		low := strings.ToLower(string(raw))
		for _, needle := range []string{"maps.googleapis", "googlemaps", "maps.google.com"} {
			if strings.Contains(low, needle) {
				t.Errorf("%s contains %q", name, needle)
			}
		}
	}
}
