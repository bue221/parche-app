package payments

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	mpconfig "github.com/mercadopago/sdk-go/pkg/config"
	"github.com/mercadopago/sdk-go/pkg/oauth"
	"github.com/mercadopago/sdk-go/pkg/user"
)

const (
	oauthTokenURL = "https://api.mercadopago.com/oauth/token"
	stateTTL      = 10 * time.Minute
)

// OAuth is Mercado Pago authorization-code + refresh for promoters.
type OAuth struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	StateKey     []byte
	HTTP         *http.Client
	Now          func() time.Time
}

func (o OAuth) Enabled() bool {
	return strings.TrimSpace(o.ClientID) != "" && strings.TrimSpace(o.ClientSecret) != "" && strings.TrimSpace(o.RedirectURL) != ""
}

func (o OAuth) now() time.Time {
	if o.Now != nil {
		return o.Now().UTC()
	}
	return time.Now().UTC()
}

func (o OAuth) httpc() *http.Client {
	if o.HTTP != nil {
		return o.HTTP
	}
	return http.DefaultClient
}

// AuthorizationURL is the page the promoter opens to grant Parche access.
func (o OAuth) AuthorizationURL(state string) (string, error) {
	if !o.Enabled() {
		return "", fmt.Errorf("mercadopago oauth is not configured")
	}
	cfg, err := mpconfig.New(o.ClientSecret)
	if err != nil {
		return "", err
	}
	return oauth.NewClient(cfg).GetAuthorizationURL(o.ClientID, o.RedirectURL, state), nil
}

// SignState binds tenant + promoter into a CSRF-safe OAuth state.
func (o OAuth) SignState(tenantID, userID string) string {
	exp := strconv.FormatInt(o.now().Add(stateTTL).Unix(), 10)
	payload := strings.TrimSpace(tenantID) + "|" + strings.TrimSpace(userID) + "|" + exp
	mac := hmac.New(sha256.New, o.StateKey)
	_, _ = mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString([]byte(payload + "." + hex.EncodeToString(mac.Sum(nil))))
}

// ParseState returns tenant and user after verifying HMAC and expiry.
func (o OAuth) ParseState(state string) (tenantID, userID string, err error) {
	raw, err := base64.RawURLEncoding.DecodeString(strings.TrimSpace(state))
	if err != nil {
		return "", "", fmt.Errorf("invalid state")
	}
	payload, sig, ok := strings.Cut(string(raw), ".")
	if !ok {
		return "", "", fmt.Errorf("invalid state")
	}
	mac := hmac.New(sha256.New, o.StateKey)
	_, _ = mac.Write([]byte(payload))
	want := mac.Sum(nil)
	got, err := hex.DecodeString(sig)
	if err != nil || !hmac.Equal(want, got) {
		return "", "", fmt.Errorf("invalid state")
	}
	parts := strings.Split(payload, "|")
	if len(parts) != 3 {
		return "", "", fmt.Errorf("invalid state")
	}
	exp, err := strconv.ParseInt(parts[2], 10, 64)
	if err != nil || o.now().Unix() > exp {
		return "", "", fmt.Errorf("expired state")
	}
	return parts[0], parts[1], nil
}

// Exchange trades the authorization code for seller tokens.
func (o OAuth) Exchange(ctx context.Context, code string) (TokenSet, error) {
	tok, err := o.token(ctx, map[string]string{
		"client_id":     o.ClientID,
		"client_secret": o.ClientSecret,
		"grant_type":    "authorization_code",
		"code":          strings.TrimSpace(code),
		"redirect_uri":  o.RedirectURL,
	})
	if err != nil {
		return TokenSet{}, err
	}
	return o.withUserID(ctx, tok)
}

// Refresh implements Refresher.
func (o OAuth) Refresh(ctx context.Context, refreshToken string) (TokenSet, error) {
	tok, err := o.token(ctx, map[string]string{
		"client_id":     o.ClientID,
		"client_secret": o.ClientSecret,
		"grant_type":    "refresh_token",
		"refresh_token": strings.TrimSpace(refreshToken),
	})
	if err != nil {
		return TokenSet{}, err
	}
	return o.withUserID(ctx, tok)
}

type oauthJSON struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	PublicKey    string `json:"public_key"`
	UserID       int64  `json:"user_id"`
	ExpiresIn    int    `json:"expires_in"`
	Error        string `json:"error"`
	Message      string `json:"message"`
}

func (o OAuth) token(ctx context.Context, body map[string]string) (TokenSet, error) {
	raw, err := json.Marshal(body)
	if err != nil {
		return TokenSet{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, oauthTokenURL, bytes.NewReader(raw))
	if err != nil {
		return TokenSet{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	res, err := o.httpc().Do(req)
	if err != nil {
		return TokenSet{}, err
	}
	defer res.Body.Close()
	payload, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return TokenSet{}, err
	}
	var parsed oauthJSON
	if err := json.Unmarshal(payload, &parsed); err != nil {
		return TokenSet{}, fmt.Errorf("oauth token: invalid json")
	}
	if res.StatusCode >= 300 || parsed.AccessToken == "" {
		msg := strings.TrimSpace(parsed.Message)
		if msg == "" {
			msg = strings.TrimSpace(parsed.Error)
		}
		if msg == "" {
			msg = "token exchange failed"
		}
		return TokenSet{}, fmt.Errorf("oauth token: %s", msg)
	}
	exp := o.now().Add(180 * 24 * time.Hour)
	if parsed.ExpiresIn > 0 {
		exp = o.now().Add(time.Duration(parsed.ExpiresIn) * time.Second)
	}
	userID := ""
	if parsed.UserID != 0 {
		userID = strconv.FormatInt(parsed.UserID, 10)
	}
	return TokenSet{
		AccessToken:  parsed.AccessToken,
		RefreshToken: parsed.RefreshToken,
		PublicKey:    parsed.PublicKey,
		UserID:       userID,
		ExpiresAt:    exp,
	}, nil
}

func (o OAuth) withUserID(ctx context.Context, tok TokenSet) (TokenSet, error) {
	if tok.UserID != "" {
		return tok, nil
	}
	cfg, err := mpconfig.New(tok.AccessToken)
	if err != nil {
		return tok, nil
	}
	me, err := user.NewClient(cfg).Get(ctx)
	if err != nil || me == nil || me.ID == 0 {
		return tok, nil
	}
	tok.UserID = strconv.Itoa(me.ID)
	return tok, nil
}
