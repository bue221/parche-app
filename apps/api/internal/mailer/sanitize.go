package mailer

import "strings"

var forbiddenVars = map[string]struct{}{
	"password":      {},
	"password_hash": {},
	"qr_token":      {},
	"qr":            {},
	"secret":        {},
	"refresh_token": {},
	"access_token":  {},
}

// SanitizeVars drops secrets so they never reach SMTP or logs.
func SanitizeVars(vars map[string]string) map[string]string {
	if vars == nil {
		return nil
	}
	out := make(map[string]string, len(vars))
	for k, v := range vars {
		key := strings.ToLower(strings.TrimSpace(k))
		if _, bad := forbiddenVars[key]; bad {
			continue
		}
		if strings.Contains(key, "password") || strings.Contains(key, "qr_token") {
			continue
		}
		out[k] = v
	}
	return out
}
