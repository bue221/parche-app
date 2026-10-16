package editorial

import (
	"strings"
	"unicode"
)

func postSlug(title, suffix string) string {
	var b strings.Builder
	prevDash := false
	for _, r := range strings.ToLower(strings.TrimSpace(title)) {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			b.WriteRune(r)
			prevDash = false
		case r == ' ' || r == '-' || r == '_':
			if !prevDash && b.Len() > 0 {
				b.WriteByte('-')
				prevDash = true
			}
		}
	}
	s := strings.Trim(b.String(), "-")
	if s == "" {
		s = "post"
	}
	if len(s) > 48 {
		s = s[:48]
		s = strings.Trim(s, "-")
	}
	if suffix != "" {
		s = s + "-" + suffix
	}
	if len(s) > maxSlugLen {
		s = s[:maxSlugLen]
		s = strings.Trim(s, "-")
	}
	return s
}

func slugSuffix(id string) string {
	s := strings.ReplaceAll(id, "-", "")
	if len(s) > 8 {
		return s[:8]
	}
	return s
}

func validSlug(s string) bool {
	if len(s) < 2 || len(s) > maxSlugLen {
		return false
	}
	for i, r := range s {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
		case r == '-' && i > 0 && i < len(s)-1:
		default:
			return false
		}
	}
	return true
}
