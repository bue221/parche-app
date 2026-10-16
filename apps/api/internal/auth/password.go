package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
)

// Argon2 hashes passwords. Never log the plaintext or the encoded hash in access logs.
type Argon2 struct {
	Time    uint32
	Memory  uint32
	Threads uint8
	KeyLen  uint32
	SaltLen int
}

// DefaultArgon2 follows OWASP-ish interactive params (≈19 MiB, t=2, p=1).
func DefaultArgon2() Argon2 {
	return Argon2{Time: 2, Memory: 19 * 1024, Threads: 1, KeyLen: 32, SaltLen: 16}
}

// FastArgon2 is for tests only.
func FastArgon2() Argon2 {
	return Argon2{Time: 1, Memory: 8 * 1024, Threads: 1, KeyLen: 16, SaltLen: 8}
}

// Hash returns a PHC-style argon2id string.
func (a Argon2) Hash(password string) (string, error) {
	if a.SaltLen < 8 {
		a.SaltLen = 16
	}
	if a.KeyLen == 0 {
		a.KeyLen = 32
	}
	if a.Threads == 0 {
		a.Threads = 1
	}
	if a.Time == 0 {
		a.Time = 1
	}
	if a.Memory == 0 {
		a.Memory = 19 * 1024
	}
	salt := make([]byte, a.SaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("argon2 salt: %w", err)
	}
	sum := argon2.IDKey([]byte(password), salt, a.Time, a.Memory, a.Threads, a.KeyLen)
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, a.Memory, a.Time, a.Threads,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(sum),
	), nil
}

// VerifyPassword compares password to a PHC argon2id hash. Unknown encodings fail closed.
func VerifyPassword(password, encoded string) bool {
	salt, want, time, memory, threads, keyLen, ok := parseArgon2(encoded)
	if !ok {
		return false
	}
	got := argon2.IDKey([]byte(password), salt, time, memory, threads, keyLen)
	return subtle.ConstantTimeCompare(got, want) == 1
}

func parseArgon2(encoded string) (salt, hash []byte, time, memory uint32, threads uint8, keyLen uint32, ok bool) {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return nil, nil, 0, 0, 0, 0, false
	}
	if parts[2] != "v="+strconv.Itoa(argon2.Version) {
		return nil, nil, 0, 0, 0, 0, false
	}
	var t, m uint32
	var p uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &m, &t, &p); err != nil {
		return nil, nil, 0, 0, 0, 0, false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return nil, nil, 0, 0, 0, 0, false
	}
	hash, err = base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil || len(hash) == 0 {
		return nil, nil, 0, 0, 0, 0, false
	}
	return salt, hash, t, m, p, uint32(len(hash)), true
}
