package payments

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/mercadopago/sdk-go/pkg/payment"
	"github.com/mercadopago/sdk-go/pkg/webhook"
)

// MPNotification is the Checkout Pro payment topic body. Confirm status via GET /v1/payments/{id}.
type MPNotification struct {
	ID     json.Number `json:"id"`
	Type   string      `json:"type"`
	Action string      `json:"action"`
	Data   struct {
		ID string `json:"id"`
	} `json:"data"`
}

// LooksLikeMercadoPago detects Checkout Pro IPN / webhook payloads (with or without x-signature).
func LooksLikeMercadoPago(r *http.Request, body []byte) bool {
	if r != nil {
		if strings.TrimSpace(r.Header.Get("x-signature")) != "" {
			return true
		}
		q := r.URL.Query()
		if strings.TrimSpace(q.Get("topic")) != "" || strings.TrimSpace(q.Get("data.id")) != "" {
			return true
		}
		if strings.EqualFold(strings.TrimSpace(q.Get("type")), "payment") {
			return true
		}
	}
	var n MPNotification
	if err := json.Unmarshal(body, &n); err != nil {
		return false
	}
	return strings.TrimSpace(n.Type) != "" || strings.TrimSpace(n.Data.ID) != "" || strings.TrimSpace(n.ID.String()) != ""
}

func MPDataID(r *http.Request, body []byte) string {
	if r != nil {
		if id := strings.TrimSpace(r.URL.Query().Get("data.id")); id != "" {
			return id
		}
	}
	var n MPNotification
	if err := json.Unmarshal(body, &n); err != nil {
		return ""
	}
	if id := strings.TrimSpace(n.Data.ID); id != "" {
		return id
	}
	return strings.TrimSpace(n.ID.String())
}

func MPType(r *http.Request, body []byte) string {
	if r != nil {
		if t := strings.TrimSpace(r.URL.Query().Get("type")); t != "" {
			return strings.ToLower(t)
		}
		if t := strings.TrimSpace(r.URL.Query().Get("topic")); t != "" {
			return strings.ToLower(t)
		}
	}
	var n MPNotification
	if err := json.Unmarshal(body, &n); err != nil {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(n.Type))
}

// VerifyMercadoPago checks x-signature with the official SDK (HMAC over id/request-id/ts).
func VerifyMercadoPago(secret string, r *http.Request, body []byte, now time.Time) error {
	if strings.TrimSpace(secret) == "" || r == nil {
		return ErrBadSignature
	}
	dataID := MPDataID(r, body)
	_ = now
	err := webhook.ValidateSignature(
		r.Header.Get("x-signature"),
		r.Header.Get("x-request-id"),
		dataID,
		secret,
	)
	if err != nil {
		var sig *webhook.SignatureError
		if errors.As(err, &sig) && sig.Reason == webhook.ReasonTimestampOutOfTolerance {
			return ErrReplay
		}
		return ErrBadSignature
	}
	return nil
}

func mapPaymentStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "approved":
		return "success"
	case "rejected", "cancelled", "canceled", "refunded", "charged_back":
		return "failed"
	default:
		return ""
	}
}

func EventFromPayment(p *payment.Response) (Event, error) {
	if p == nil {
		return Event{}, ErrPayload
	}
	status := mapPaymentStatus(p.Status)
	if status == "" {
		return Event{}, nil
	}
	orderID := strings.TrimSpace(p.ExternalReference)
	if orderID == "" {
		return Event{}, ErrPayload
	}
	id := strings.TrimSpace(strconv.Itoa(p.ID))
	if id == "" || id == "0" {
		return Event{}, ErrPayload
	}
	return Event{ProviderEventID: id, OrderID: orderID, Status: status}, nil
}

func IgnoreMPTopic(topic string) bool {
	switch strings.ToLower(strings.TrimSpace(topic)) {
	case "", "payment":
		return false
	default:
		return true
	}
}

func PaymentID(r *http.Request, body []byte) (string, error) {
	id := MPDataID(r, body)
	if id == "" {
		return "", fmt.Errorf("missing payment id")
	}
	return id, nil
}
