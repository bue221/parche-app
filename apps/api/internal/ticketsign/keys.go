package ticketsign

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	// MinKeyBytes is the HS256 floor from F17 (distinct from session JWTs).
	MinKeyBytes = 32
	leeway      = 30 * time.Second
	defaultKid  = "v1"
)

var (
	// ErrMissingKey means neither TICKET_SIGNING_KEY nor TICKET_SIGNING_KEYS is usable.
	ErrMissingKey = errors.New("ticket signing key missing")
	// ErrShortKey means an HS256 secret is under 32 bytes.
	ErrShortKey = errors.New("ticket signing key must be at least 32 bytes")
	// ErrInvalidToken is a malformed or wrongly signed ticket JWS.
	ErrInvalidToken = errors.New("invalid ticket token")
	// ErrExpired is a correctly signed token past exp (F19 door path).
	ErrExpired = errors.New("expired ticket token")
)

// Keys is an in-memory JWKS: one active kid for Sign, all kids for Verify.
type Keys struct {
	activeKid string
	byKid     map[string][]byte
}

// Claims are the F17 QR payload. Not an access JWT.
type Claims struct {
	TicketID  string
	EventID   string
	JWTID     string
	IssuedAt  time.Time
	ExpiresAt time.Time
	Kid       string
}

type keyRow struct {
	Kid string `json:"kid"`
	Key string `json:"key"`
}

type jwtHeader struct {
	Alg string `json:"alg"`
	Kid string `json:"kid"`
	Typ string `json:"typ"`
}

type jwtPayload struct {
	TID string `json:"tid"`
	EID string `json:"eid"`
	JTI string `json:"jti"`
	IAT int64  `json:"iat"`
	EXP int64  `json:"exp"`
}

// Parse builds a keyring from TICKET_SIGNING_KEY and optional TICKET_SIGNING_KEYS JSON.
// JSON form: [{"kid":"v2","key":"…"},{"kid":"v1","key":"…"}] — first row is active.
func Parse(activeKey, keysJSON string) (Keys, error) {
	activeKey = strings.TrimSpace(activeKey)
	keysJSON = strings.TrimSpace(keysJSON)
	k := Keys{byKid: map[string][]byte{}}
	if keysJSON != "" {
		var rows []keyRow
		if err := json.Unmarshal([]byte(keysJSON), &rows); err != nil {
			return Keys{}, fmt.Errorf("TICKET_SIGNING_KEYS: %w", err)
		}
		if len(rows) == 0 {
			return Keys{}, ErrMissingKey
		}
		for i, row := range rows {
			kid := strings.TrimSpace(row.Kid)
			if kid == "" {
				return Keys{}, fmt.Errorf("TICKET_SIGNING_KEYS[%d].kid required", i)
			}
			secret := []byte(row.Key)
			if len(secret) < MinKeyBytes {
				return Keys{}, ErrShortKey
			}
			k.byKid[kid] = secret
			if i == 0 {
				k.activeKid = kid
			}
		}
		return k, nil
	}
	if activeKey == "" {
		return Keys{}, ErrMissingKey
	}
	if len(activeKey) < MinKeyBytes {
		return Keys{}, ErrShortKey
	}
	k.activeKid = defaultKid
	k.byKid[defaultKid] = []byte(activeKey)
	return k, nil
}

// ActiveKid is the header kid used on newly signed tokens.
func (k Keys) ActiveKid() string { return k.activeKid }

// ActiveSecret is the current signing material (never log this).
func (k Keys) ActiveSecret() []byte {
	if k.byKid == nil {
		return nil
	}
	return k.byKid[k.activeKid]
}

// Sign returns a compact HS256 JWS. iat/exp must be stable so GET re-signs the same QR.
func (k Keys) Sign(c Claims) (string, error) {
	secret := k.ActiveSecret()
	if len(secret) < MinKeyBytes || k.activeKid == "" {
		return "", ErrMissingKey
	}
	if strings.TrimSpace(c.TicketID) == "" || strings.TrimSpace(c.EventID) == "" || strings.TrimSpace(c.JWTID) == "" {
		return "", ErrInvalidToken
	}
	header, err := json.Marshal(jwtHeader{Alg: "HS256", Kid: k.activeKid, Typ: "JWT"})
	if err != nil {
		return "", err
	}
	payload, err := json.Marshal(jwtPayload{
		TID: c.TicketID, EID: c.EventID, JTI: c.JWTID,
		IAT: c.IssuedAt.UTC().Unix(), EXP: c.ExpiresAt.UTC().Unix(),
	})
	if err != nil {
		return "", err
	}
	unsigned := b64(header) + "." + b64(payload)
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(unsigned))
	return unsigned + "." + b64(mac.Sum(nil)), nil
}

// Verify checks kid, HMAC, required claims, and exp. Used by F17 tests and F19 later.
func (k Keys) Verify(token string, now time.Time) (Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return Claims{}, ErrInvalidToken
	}
	headerJSON, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return Claims{}, ErrInvalidToken
	}
	var header jwtHeader
	if json.Unmarshal(headerJSON, &header) != nil || header.Alg != "HS256" || header.Kid == "" {
		return Claims{}, ErrInvalidToken
	}
	secret, ok := k.byKid[header.Kid]
	if !ok || len(secret) < MinKeyBytes {
		return Claims{}, ErrInvalidToken
	}
	unsigned := parts[0] + "." + parts[1]
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return Claims{}, ErrInvalidToken
	}
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(unsigned))
	if !hmac.Equal(mac.Sum(nil), sig) {
		return Claims{}, ErrInvalidToken
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return Claims{}, ErrInvalidToken
	}
	var p jwtPayload
	if json.Unmarshal(payload, &p) != nil || p.TID == "" || p.EID == "" || p.JTI == "" {
		return Claims{}, ErrInvalidToken
	}
	if now.IsZero() {
		now = time.Now()
	}
	now = now.UTC()
	if now.Add(-leeway).Unix() >= p.EXP {
		return Claims{}, ErrExpired
	}
	return Claims{
		TicketID: p.TID, EventID: p.EID, JWTID: p.JTI,
		IssuedAt: time.Unix(p.IAT, 0).UTC(), ExpiresAt: time.Unix(p.EXP, 0).UTC(),
		Kid: header.Kid,
	}, nil
}

func b64(b []byte) string {
	return base64.RawURLEncoding.EncodeToString(b)
}
