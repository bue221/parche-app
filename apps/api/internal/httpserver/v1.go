package httpserver

import (
	"net/http"
	"strings"

	"github.com/parche-app/backend/internal/apierr"
)

// v1Mux serves registered routes and writes the product 404 envelope for unknown /v1 paths.
type v1Mux struct {
	inner *http.ServeMux
}

func (m *v1Mux) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, "/v1") {
		_, pattern := m.inner.Handler(r)
		if pattern == "" {
			apierr.Write(w, r, apierr.NotFound, "", nil)
			return
		}
	}
	m.inner.ServeHTTP(w, r)
}
