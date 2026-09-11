package events

import (
	"net/url"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/parche-app/backend/internal/auth"
)

// ParseSearch reads F22 query params. BBox and pagination stay in the HTTP layer (F07/F02).
func ParseSearch(q url.Values) (ListFilter, error) {
	f := ListFilter{
		Q:        q.Get("q"),
		ArtistID: strings.TrimSpace(q.Get("artist_id")),
		Genres:   append([]string(nil), q["genre"]...),
	}
	if raw := strings.TrimSpace(q.Get("from")); raw != "" {
		t, err := parseMetricsInstant(raw)
		if err != nil {
			return ListFilter{}, auth.Invalid{Fields: []auth.Field{{Name: "from", Issue: "invalid"}}}
		}
		f.From = &t
	}
	if raw := strings.TrimSpace(q.Get("to")); raw != "" {
		t, err := parseMetricsInstant(raw)
		if err != nil {
			return ListFilter{}, auth.Invalid{Fields: []auth.Field{{Name: "to", Issue: "invalid"}}}
		}
		f.To = &t
	}
	if err := normalizeSearch(&f); err != nil {
		return ListFilter{}, err
	}
	return f, nil
}

func normalizeSearch(f *ListFilter) error {
	f.Q = strings.TrimSpace(f.Q)
	if utf8.RuneCountInString(f.Q) > maxSearchQ {
		return auth.Invalid{Fields: []auth.Field{{Name: "q", Issue: "length"}}}
	}
	if f.From != nil && f.To != nil && f.To.Before(*f.From) {
		return auth.Invalid{Fields: []auth.Field{{Name: "to", Issue: "order"}}}
	}
	genres, err := normalizeGenres(f.Genres)
	if err != nil {
		return err
	}
	f.Genres = genres
	if f.ArtistID == "" {
		return nil
	}
	if _, err := uuid.Parse(f.ArtistID); err != nil {
		return auth.Invalid{Fields: []auth.Field{{Name: "artist_id", Issue: "uuid"}}}
	}
	return nil
}

func likePattern(q string) string {
	q = strings.ReplaceAll(q, `\`, `\\`)
	q = strings.ReplaceAll(q, `%`, `\%`)
	q = strings.ReplaceAll(q, `_`, `\_`)
	return "%" + q + "%"
}

func matchesQuery(e Event, q string) bool {
	if q == "" {
		return true
	}
	needle := strings.ToLower(q)
	return strings.Contains(strings.ToLower(e.Title), needle) || strings.Contains(strings.ToLower(e.Description), needle)
}

func overlapsGenres(have, want []string) bool {
	if len(want) == 0 {
		return true
	}
	set := make(map[string]struct{}, len(have))
	for _, g := range have {
		set[strings.ToLower(strings.TrimSpace(g))] = struct{}{}
	}
	for _, g := range want {
		if _, ok := set[g]; ok {
			return true
		}
	}
	return false
}

func inRestrictIDs(id string, ids []string) bool {
	if ids == nil {
		return true
	}
	for _, x := range ids {
		if x == id {
			return true
		}
	}
	return false
}

func startsInWindow(e Event, from, to *time.Time) bool {
	if from != nil && e.StartsAt.Before(*from) {
		return false
	}
	if to != nil && e.StartsAt.After(*to) {
		return false
	}
	return true
}
