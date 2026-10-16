package editorial

import (
	"encoding/base64"
	"strings"
	"time"

	"github.com/parche-app/backend/internal/auth"
)

func encodeCursor(ts time.Time, id string) string {
	raw := ts.UTC().Format(time.RFC3339Nano) + "|" + id
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

func decodeCursor(cur string) (time.Time, string, error) {
	if strings.TrimSpace(cur) == "" {
		return time.Time{}, "", nil
	}
	b, err := base64.RawURLEncoding.DecodeString(cur)
	if err != nil {
		return time.Time{}, "", auth.Invalid{Fields: []auth.Field{{Name: "cursor", Issue: "invalid"}}}
	}
	parts := strings.SplitN(string(b), "|", 2)
	if len(parts) != 2 {
		return time.Time{}, "", auth.Invalid{Fields: []auth.Field{{Name: "cursor", Issue: "invalid"}}}
	}
	ts, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return time.Time{}, "", auth.Invalid{Fields: []auth.Field{{Name: "cursor", Issue: "invalid"}}}
	}
	return ts, parts[1], nil
}
