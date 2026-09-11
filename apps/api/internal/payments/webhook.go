package payments

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"
)

const (
	HeaderSignature = "X-Payment-Signature"
	replayWindow    = 5 * time.Minute
	maxPayloadKeep  = 512
)

var (
	ErrBadSignature = errors.New("bad payment signature")
	ErrReplay       = errors.New("payment timestamp outside replay window")
	ErrPayload      = errors.New("invalid payment payload")
)

// Event is the verified webhook body. Log status and ids, never the raw body.
type Event struct {
	ProviderEventID string `json:"provider_event_id"`
	OrderID         string `json:"order_id"`
	Status          string `json:"status"`
}

// Sign produces X-Payment-Signature for the fake provider and tests.
func Sign(secret string, ts time.Time, body []byte) string {
	t := strconv.FormatInt(ts.UTC().Unix(), 10)
	return "t=" + t + ",v1=" + hex.EncodeToString(mac(secret, t, body))
}

// Verify checks HMAC and the ±5 minute replay window. secret must not be logged.
func Verify(secret string, now time.Time, header string, body []byte) error {
	if strings.TrimSpace(secret) == "" {
		return ErrBadSignature
	}
	ts, v1, ok := parseSignature(header)
	if !ok || v1 == "" {
		return ErrBadSignature
	}
	if now.Sub(ts) > replayWindow || ts.Sub(now) > replayWindow {
		return ErrReplay
	}
	want := mac(secret, strconv.FormatInt(ts.Unix(), 10), body)
	got, err := hex.DecodeString(v1)
	if err != nil {
		return ErrBadSignature
	}
	if !hmac.Equal(want, got) {
		return ErrBadSignature
	}
	return nil
}

// ParseEvent reads the JSON after Verify. Unknown extra fields are ignored.
func ParseEvent(body []byte) (Event, error) {
	var ev Event
	if err := json.Unmarshal(body, &ev); err != nil {
		return Event{}, ErrPayload
	}
	ev.ProviderEventID = strings.TrimSpace(ev.ProviderEventID)
	ev.OrderID = strings.TrimSpace(ev.OrderID)
	ev.Status = strings.ToLower(strings.TrimSpace(ev.Status))
	if ev.ProviderEventID == "" || ev.OrderID == "" {
		return Event{}, ErrPayload
	}
	switch ev.Status {
	case "success", "failed":
		return ev, nil
	default:
		return Event{}, ErrPayload
	}
}

// TruncatePayload is what we persist. Full bodies stay out of stdout logs.
func TruncatePayload(body []byte) string {
	s := string(body)
	if len(s) <= maxPayloadKeep {
		return s
	}
	return s[:maxPayloadKeep]
}

// HashPayload is SHA-256 hex of the raw body.
func HashPayload(body []byte) string {
	sum := sha256.Sum256(body)
	return hex.EncodeToString(sum[:])
}

func mac(secret, ts string, body []byte) []byte {
	h := hmac.New(sha256.New, []byte(secret))
	_, _ = h.Write([]byte(ts))
	_, _ = h.Write([]byte("."))
	_, _ = h.Write(body)
	return h.Sum(nil)
}

func parseSignature(header string) (time.Time, string, bool) {
	var ts int64
	var v1 string
	for _, part := range strings.Split(header, ",") {
		k, v, ok := strings.Cut(strings.TrimSpace(part), "=")
		if !ok {
			continue
		}
		switch k {
		case "t":
			n, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return time.Time{}, "", false
			}
			ts = n
		case "v1":
			v1 = strings.TrimSpace(v)
		}
	}
	if ts == 0 || v1 == "" {
		return time.Time{}, "", false
	}
	return time.Unix(ts, 0).UTC(), v1, true
}
