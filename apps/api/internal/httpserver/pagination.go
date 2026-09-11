package httpserver

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/parche-app/backend/internal/apierr"
)

const (
	defaultPageLimit = 20
	maxPageLimit     = 50
	maxCursorLen     = 512
)

// Page is cursor pagination for list endpoints (?cursor=&limit=).
type Page struct {
	Cursor string
	Limit  int
}

// ParsePage reads query params. Invalid limit/cursor is a validation error for the handler to write.
func ParsePage(r *http.Request) (Page, []apierr.Detail) {
	q := r.URL.Query()
	cursor := q.Get("cursor")
	if len(cursor) > maxCursorLen {
		return Page{}, []apierr.Detail{{Field: "cursor", Issue: "length"}}
	}

	raw := strings.TrimSpace(q.Get("limit"))
	if raw == "" {
		return Page{Cursor: cursor, Limit: defaultPageLimit}, nil
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 1 {
		return Page{}, []apierr.Detail{{Field: "limit", Issue: "range"}}
	}
	if n > maxPageLimit {
		return Page{}, []apierr.Detail{{Field: "limit", Issue: "max"}}
	}
	return Page{Cursor: cursor, Limit: n}, nil
}

// ListEnvelope is the JSON shape for cursor pages.
type ListEnvelope[T any] struct {
	Items      []T     `json:"items"`
	NextCursor *string `json:"next_cursor"`
}
