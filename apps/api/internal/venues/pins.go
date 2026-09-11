package venues

import (
	"context"
	"sort"
	"sync"

	"github.com/parche-app/backend/internal/geo"
)

// MapPin is a published event coordinate for GET /v1/events (bbox lives in F07; CRUD is F08).
type MapPin struct {
	ID          string  `json:"id"`
	Title       string  `json:"title,omitempty"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
	VenueID     string  `json:"venue_id,omitempty"`
	AddressText string  `json:"address_text,omitempty"`
}

// MapPins lists published pins. F08 GET /v1/events reads the events catalog instead.
type MapPins interface {
	PublishedPins(ctx context.Context) ([]MapPin, error)
}

// EmptyPins is the production catalog until F08.
type EmptyPins struct{}

func (EmptyPins) PublishedPins(context.Context) ([]MapPin, error) { return []MapPin{}, nil }

// MemoryPins is for tests.
type MemoryPins struct {
	mu    sync.Mutex
	Items []MapPin
}

func (m *MemoryPins) PublishedPins(context.Context) ([]MapPin, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]MapPin, len(m.Items))
	copy(out, m.Items)
	return out, nil
}

// VisiblePins drops unpublished-invalid coords and applies bbox. Caller paginates.
func VisiblePins(pins []MapPin, bbox *geo.BBox) []MapPin {
	out := make([]MapPin, 0, len(pins))
	for _, p := range pins {
		if geo.ValidLatLng(p.Lat, p.Lng) != nil {
			continue
		}
		if bbox != nil && !bbox.Contains(p.Lat, p.Lng) {
			continue
		}
		out = append(out, p)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID > out[j].ID })
	return out
}

func PagePins(pins []MapPin, cursor string, limit int) ([]MapPin, *string) {
	if limit < 1 {
		limit = 20
	}
	start := 0
	if cursor != "" {
		for i, p := range pins {
			if p.ID == cursor {
				start = i + 1
				break
			}
		}
	}
	if start > len(pins) {
		start = len(pins)
	}
	end := start + limit
	if end > len(pins) {
		end = len(pins)
	}
	page := pins[start:end]
	var next *string
	if end < len(pins) && len(page) > 0 {
		id := page[len(page)-1].ID
		next = &id
	}
	if page == nil {
		page = []MapPin{}
	}
	return page, next
}
