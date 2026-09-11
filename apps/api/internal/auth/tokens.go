package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	// Issuer is the access JWT iss claim.
	Issuer = "parche-api"
	// AccessTTL is under the F04 15-minute ceiling.
	AccessTTL = 10 * time.Minute
	// RefreshTTL is the rotating refresh lifetime.
	RefreshTTL = 14 * 24 * time.Hour
	// PasswordResetTTL is the one-use mail token lifetime (F05).
	PasswordResetTTL = 30 * time.Minute
	// EmailChangeTTL is the one-use F14 email-change mail token lifetime.
	EmailChangeTTL = 30 * time.Minute
	leeway         = 30 * time.Second
)

// Tokens issues access JWTs (HS256) and hashes opaque refresh values.
// JWT_REFRESH_SECRET peppers refresh hashes so a DB dump is not enough to mint sessions.
type Tokens struct {
	AccessSecret  []byte
	RefreshPepper []byte
	Now           func() time.Time
	AccessTTL     time.Duration
	RefreshTTL    time.Duration
}

// AccessClaims is the verified access JWT. Event roles are never included.
type AccessClaims struct {
	Subject  string
	JWTID    string
	Profiles []string
	Epoch    int
}

func (t *Tokens) now() time.Time {
	if t != nil && t.Now != nil {
		return t.Now().UTC()
	}
	return time.Now().UTC()
}

func (t *Tokens) accessTTL() time.Duration {
	if t != nil && t.AccessTTL > 0 {
		return t.AccessTTL
	}
	return AccessTTL
}

func (t *Tokens) refreshTTL() time.Duration {
	if t != nil && t.RefreshTTL > 0 {
		return t.RefreshTTL
	}
	return RefreshTTL
}

// IssueAccess returns a compact HS256 JWT and its expiry. epoch is users.session_epoch.
func (t *Tokens) IssueAccess(userID string, profiles []string, epoch int) (token string, exp time.Time, err error) {
	if t == nil || len(t.AccessSecret) == 0 {
		return "", time.Time{}, fmt.Errorf("jwt access secret missing")
	}
	now := t.now()
	exp = now.Add(t.accessTTL())
	jti, err := newID()
	if err != nil {
		return "", time.Time{}, err
	}
	claims := map[string]any{
		"sub":   userID,
		"iss":   Issuer,
		"jti":   jti,
		"iat":   now.Unix(),
		"exp":   exp.Unix(),
		"epoch": epoch,
	}
	if len(profiles) > 0 {
		claims["profiles"] = profiles
	}
	token, err = signHS256(t.AccessSecret, claims)
	return token, exp, err
}

// ParseAccess verifies signature, issuer, and expiry. It does not load the user.
func (t *Tokens) ParseAccess(token string) (AccessClaims, error) {
	if t == nil || len(t.AccessSecret) == 0 || strings.TrimSpace(token) == "" {
		return AccessClaims{}, ErrUnauthorized
	}
	return parseHS256(t.AccessSecret, token, t.now())
}

// NewRefresh returns a 256-bit opaque token (plain value for the client only).
func NewRefresh() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("refresh token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// HashRefresh HMAC-SHA256s the opaque refresh with JWT_REFRESH_SECRET. Never store the plain value.
func HashRefresh(pepper []byte, raw string) string {
	mac := hmac.New(sha256.New, pepper)
	_, _ = mac.Write([]byte(raw))
	return hex.EncodeToString(mac.Sum(nil))
}

func (t *Tokens) hashRefresh(raw string) string {
	var pepper []byte
	if t != nil {
		pepper = t.RefreshPepper
	}
	return HashRefresh(pepper, raw)
}

func newID() (string, error) {
	id, err := uuid.NewV7()
	if err != nil {
		return uuid.NewString(), nil
	}
	return id.String(), nil
}

func signHS256(secret []byte, claims any) (string, error) {
	header, err := json.Marshal(map[string]string{"alg": "HS256", "typ": "JWT"})
	if err != nil {
		return "", err
	}
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	unsigned := b64(header) + "." + b64(payload)
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(unsigned))
	return unsigned + "." + b64(mac.Sum(nil)), nil
}

func parseHS256(secret []byte, token string, now time.Time) (AccessClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return AccessClaims{}, ErrUnauthorized
	}
	headerJSON, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return AccessClaims{}, ErrUnauthorized
	}
	var header struct {
		Alg string `json:"alg"`
	}
	if json.Unmarshal(headerJSON, &header) != nil || header.Alg != "HS256" {
		return AccessClaims{}, ErrUnauthorized
	}
	unsigned := parts[0] + "." + parts[1]
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return AccessClaims{}, ErrUnauthorized
	}
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(unsigned))
	if !hmac.Equal(mac.Sum(nil), sig) {
		return AccessClaims{}, ErrUnauthorized
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return AccessClaims{}, ErrUnauthorized
	}
	var c struct {
		Sub      string   `json:"sub"`
		Iss      string   `json:"iss"`
		Jti      string   `json:"jti"`
		Exp      int64    `json:"exp"`
		Epoch    int      `json:"epoch"`
		Profiles []string `json:"profiles"`
	}
	if json.Unmarshal(payload, &c) != nil {
		return AccessClaims{}, ErrUnauthorized
	}
	if c.Iss != Issuer || c.Sub == "" {
		return AccessClaims{}, ErrUnauthorized
	}
	if now.Add(-leeway).Unix() >= c.Exp {
		return AccessClaims{}, ErrUnauthorized
	}
	return AccessClaims{Subject: c.Sub, JWTID: c.Jti, Profiles: c.Profiles, Epoch: c.Epoch}, nil
}

func b64(b []byte) string {
	return base64.RawURLEncoding.EncodeToString(b)
}
