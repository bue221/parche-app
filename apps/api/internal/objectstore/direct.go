package objectstore

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"strings"
)

type directTicket struct {
	V   int    `json:"v"`
	Op  string `json:"op"`
	Key string `json:"key"`
	CT  string `json:"ct,omitempty"`
	Max int64  `json:"max,omitempty"`
	Exp int64  `json:"exp"`
}

func signDirectTicket(secret []byte, t directTicket) (string, error) {
	raw, err := json.Marshal(t)
	if err != nil {
		return "", err
	}
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write(raw)
	return base64.RawURLEncoding.EncodeToString(raw) + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil)), nil
}

func parseDirectTicket(secret []byte, token string) (directTicket, error) {
	payloadB64, sigB64, ok := strings.Cut(token, ".")
	if !ok {
		return directTicket{}, ErrPresignToken
	}
	raw, err := base64.RawURLEncoding.DecodeString(payloadB64)
	if err != nil {
		return directTicket{}, ErrPresignToken
	}
	sig, err := base64.RawURLEncoding.DecodeString(sigB64)
	if err != nil {
		return directTicket{}, ErrPresignToken
	}
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write(raw)
	if !hmac.Equal(mac.Sum(nil), sig) {
		return directTicket{}, ErrPresignToken
	}
	var t directTicket
	if err := json.Unmarshal(raw, &t); err != nil {
		return directTicket{}, ErrPresignToken
	}
	return t, nil
}

// clientReachableObjectHost is true when a browser or phone can PUT to the object endpoint.
// Docker DNS names (minio:9000) and loopback are not reachable, so uploads go through /v1/uploads/direct.
func clientReachableObjectHost(endpoint string) bool {
	host := objectEndpointHost(endpoint)
	if host == "" || host == "minio" || host == "localhost" || host == "127.0.0.1" || host == "0.0.0.0" {
		return false
	}
	if strings.HasSuffix(host, ".internal") || strings.HasSuffix(host, ".local") {
		return false
	}
	return strings.Contains(host, ".")
}

func objectEndpointHost(endpoint string) string {
	e := strings.TrimSpace(endpoint)
	e = strings.TrimPrefix(e, "http://")
	e = strings.TrimPrefix(e, "https://")
	host, _, _ := strings.Cut(e, "/")
	host, _, _ = strings.Cut(host, ":")
	return strings.ToLower(host)
}
