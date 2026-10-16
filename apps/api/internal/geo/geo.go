package geo

import (
	"encoding/json"
	"errors"
	"math"
	"strconv"
	"strings"

	"github.com/parche-app/backend/internal/auth"
)

const (
	// MaxBBoxSpanDeg rejects planet-wide scans (F07). Inclusive at 2.0.
	MaxBBoxSpanDeg = 2.0
	maxGeoJSON     = 16 << 10
)

// BBox is an inclusive WGS84 window: min/max lat and lng.
type BBox struct {
	MinLat float64
	MinLng float64
	MaxLat float64
	MaxLng float64
}

// ValidLatLng is WGS84. Zero is a real point, not “missing”.
func ValidLatLng(lat, lng float64) error {
	var fields []auth.Field
	if math.IsNaN(lat) || lat < -90 || lat > 90 {
		fields = append(fields, auth.Field{Name: "lat", Issue: "range"})
	}
	if math.IsNaN(lng) || lng < -180 || lng > 180 {
		fields = append(fields, auth.Field{Name: "lng", Issue: "range"})
	}
	if len(fields) > 0 {
		return auth.Invalid{Fields: fields}
	}
	return nil
}

// RequirePin is the F08 publish gate: a published event must have coords.
func RequirePin(lat, lng *float64) error {
	if lat == nil || lng == nil {
		return auth.Invalid{Fields: []auth.Field{{Name: "lat", Issue: "required"}, {Name: "lng", Issue: "required"}}}
	}
	return ValidLatLng(*lat, *lng)
}

// ParseBBox reads min_lat, min_lng, max_lat, max_lng. All empty means no filter.
func ParseBBox(minLat, minLng, maxLat, maxLng string) (*BBox, error) {
	a := strings.TrimSpace(minLat)
	b := strings.TrimSpace(minLng)
	c := strings.TrimSpace(maxLat)
	d := strings.TrimSpace(maxLng)
	empty := a == "" && b == "" && c == "" && d == ""
	if empty {
		return nil, nil
	}
	if a == "" || b == "" || c == "" || d == "" {
		return nil, auth.Invalid{Fields: []auth.Field{{Name: "bbox", Issue: "incomplete"}}}
	}
	minLa, err1 := strconv.ParseFloat(a, 64)
	minLn, err2 := strconv.ParseFloat(b, 64)
	maxLa, err3 := strconv.ParseFloat(c, 64)
	maxLn, err4 := strconv.ParseFloat(d, 64)
	if err1 != nil || err2 != nil || err3 != nil || err4 != nil {
		return nil, auth.Invalid{Fields: []auth.Field{{Name: "bbox", Issue: "number"}}}
	}
	if err := ValidLatLng(minLa, minLn); err != nil {
		return nil, remapPinErr(err, "min_lat", "min_lng")
	}
	if err := ValidLatLng(maxLa, maxLn); err != nil {
		return nil, remapPinErr(err, "max_lat", "max_lng")
	}
	var fields []auth.Field
	if minLa > maxLa {
		fields = append(fields, auth.Field{Name: "bbox", Issue: "inverted"})
	}
	if minLn > maxLn {
		fields = append(fields, auth.Field{Name: "bbox", Issue: "inverted"})
	}
	if maxLa-minLa > MaxBBoxSpanDeg {
		fields = append(fields, auth.Field{Name: "min_lat", Issue: "span"})
	}
	if maxLn-minLn > MaxBBoxSpanDeg {
		fields = append(fields, auth.Field{Name: "min_lng", Issue: "span"})
	}
	if len(fields) > 0 {
		return nil, auth.Invalid{Fields: fields}
	}
	return &BBox{MinLat: minLa, MinLng: minLn, MaxLat: maxLa, MaxLng: maxLn}, nil
}

func remapPinErr(err error, latField, lngField string) error {
	var inv auth.Invalid
	if !errors.As(err, &inv) {
		return err
	}
	out := make([]auth.Field, 0, len(inv.Fields))
	for _, f := range inv.Fields {
		switch f.Name {
		case "lat":
			out = append(out, auth.Field{Name: latField, Issue: f.Issue})
		case "lng":
			out = append(out, auth.Field{Name: lngField, Issue: f.Issue})
		default:
			out = append(out, f)
		}
	}
	return auth.Invalid{Fields: out}
}

// Contains is inclusive.
func (b BBox) Contains(lat, lng float64) bool {
	return lat >= b.MinLat && lat <= b.MaxLat && lng >= b.MinLng && lng <= b.MaxLng
}

// ValidateGeoJSON accepts optional Point or Polygon (RFC 7946). Empty/null is OK.
func ValidateGeoJSON(raw json.RawMessage) error {
	trim := strings.TrimSpace(string(raw))
	if trim == "" || trim == "null" {
		return nil
	}
	if len(raw) > maxGeoJSON {
		return auth.Invalid{Fields: []auth.Field{{Name: "geojson", Issue: "length"}}}
	}
	var g struct {
		Type        string          `json:"type"`
		Coordinates json.RawMessage `json:"coordinates"`
	}
	if err := json.Unmarshal(raw, &g); err != nil {
		return auth.Invalid{Fields: []auth.Field{{Name: "geojson", Issue: "json"}}}
	}
	switch g.Type {
	case "Point":
		return validPointCoords(g.Coordinates)
	case "Polygon":
		return validPolygonCoords(g.Coordinates)
	default:
		return auth.Invalid{Fields: []auth.Field{{Name: "geojson", Issue: "type"}}}
	}
}

func validPointCoords(raw json.RawMessage) error {
	var pos []float64
	if err := json.Unmarshal(raw, &pos); err != nil || len(pos) < 2 || len(pos) > 3 {
		return auth.Invalid{Fields: []auth.Field{{Name: "geojson", Issue: "coordinates"}}}
	}
	lng, lat := pos[0], pos[1]
	if err := ValidLatLng(lat, lng); err != nil {
		return auth.Invalid{Fields: []auth.Field{{Name: "geojson", Issue: "range"}}}
	}
	return nil
}

func validPolygonCoords(raw json.RawMessage) error {
	var rings [][][]float64
	if err := json.Unmarshal(raw, &rings); err != nil || len(rings) == 0 {
		return auth.Invalid{Fields: []auth.Field{{Name: "geojson", Issue: "coordinates"}}}
	}
	for _, ring := range rings {
		if len(ring) < 4 {
			return auth.Invalid{Fields: []auth.Field{{Name: "geojson", Issue: "ring"}}}
		}
		for _, pos := range ring {
			if len(pos) < 2 || len(pos) > 3 {
				return auth.Invalid{Fields: []auth.Field{{Name: "geojson", Issue: "coordinates"}}}
			}
			if err := ValidLatLng(pos[1], pos[0]); err != nil {
				return auth.Invalid{Fields: []auth.Field{{Name: "geojson", Issue: "range"}}}
			}
		}
		first, last := ring[0], ring[len(ring)-1]
		if first[0] != last[0] || first[1] != last[1] {
			return auth.Invalid{Fields: []auth.Field{{Name: "geojson", Issue: "closed"}}}
		}
	}
	return nil
}
