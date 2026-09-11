package auth

import (
	"net/mail"
	"strings"
	"unicode"
	"unicode/utf8"
)

const (
	minPasswordLen = 10
	maxDisplayName = 80
	maxUserBio     = 280
)

func normalizeDisplayName(name string) string {
	return strings.TrimSpace(name)
}

func normalizeBio(bio string) string {
	return strings.TrimSpace(bio)
}

func bioTooLong(bio string) bool {
	return utf8.RuneCountInString(bio) > maxUserBio
}

func validEmail(email string) bool {
	if email == "" || len(email) > 254 {
		return false
	}
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email {
		return false
	}
	return strings.Contains(email, ".")
}

func passwordIssues(password string) []Field {
	var fields []Field
	if len([]rune(password)) < minPasswordLen {
		fields = append(fields, Field{Name: "password", Issue: "min_length"})
	}
	if password != "" && isAllDigits(password) {
		fields = append(fields, Field{Name: "password", Issue: "not_numeric_only"})
	}
	return fields
}

func isAllDigits(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if !unicode.IsDigit(r) {
			return false
		}
	}
	return true
}

func parseProfile(raw string) (string, bool) {
	p := strings.ToLower(strings.TrimSpace(raw))
	switch p {
	case ProfileAttendee, ProfilePromoter:
		return p, true
	default:
		return "", false
	}
}

func slugify(name, suffix string) string {
	var b strings.Builder
	prevDash := false
	for _, r := range strings.ToLower(strings.TrimSpace(name)) {
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
		s = "tenant"
	}
	if len(s) > 48 {
		s = s[:48]
	}
	if suffix != "" {
		s = s + "-" + suffix
	}
	return s
}
