package httpserver

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/parche-app/backend/internal/apierr"
	"github.com/parche-app/backend/internal/events"
	"github.com/parche-app/backend/internal/payments"
)

type createOrderBody struct {
	Items []events.OrderItemInput `json:"items"`
}

type simulatePayBody struct {
	OrderID string `json:"order_id"`
	Status  string `json:"status"`
}

func registerOrderRoutes(mux *http.ServeMux, routes Routes) {
	access := routes.Access
	if access == nil {
		access = RejectAccess{}
	}
	h := orderHandler{
		svc:    routes.Catalog,
		access: access,
		pay:    routes.Payments,
		secret: routes.WebhookSecret,
		dev:    strings.EqualFold(strings.TrimSpace(routes.AppEnv), "dev"),
		now:    func() time.Time { return time.Now().UTC() },
	}
	mux.HandleFunc("POST /v1/events/{id}/orders", h.createOrder)
	mux.HandleFunc("GET /v1/orders/{id}", h.getOrder)
	mux.HandleFunc("POST /v1/payments/webhook", h.webhook)
	if h.dev {
		mux.HandleFunc("GET /v1/dev/pay/{id}", h.devPay)
		mux.HandleFunc("POST /v1/dev/payments/simulate", h.simulate)
	}
}

type orderHandler struct {
	svc    *events.Service
	access Access
	pay    payments.Provider
	secret string
	dev    bool
	now    func() time.Time
}

func (h orderHandler) createOrder(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	var req createOrderBody
	if !decodeJSON(w, r, &req) {
		return
	}
	key := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	out, err := h.svc.CreateOrder(r.Context(), p.UserID, r.PathValue("id"), key, req.Items)
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	out.CheckoutURL = absoluteUploadURL(r, out.CheckoutURL)
	apierr.WriteJSON(w, http.StatusCreated, out)
}

func (h orderHandler) getOrder(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.NotFound, "", nil)
		return
	}
	p, err := h.access.Authenticate(r)
	if err != nil {
		writeAccessError(w, r, err)
		return
	}
	view, err := h.svc.GetOrder(r.Context(), p.UserID, r.PathValue("id"))
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, view)
}

func (h orderHandler) webhook(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		apierr.Write(w, r, apierr.Validation, "", []apierr.Detail{{Field: "body", Issue: "json"}})
		return
	}
	now := time.Now().UTC()
	if h.now != nil {
		now = h.now()
	}
	if err := payments.Verify(h.secret, now, r.Header.Get(payments.HeaderSignature), raw); err != nil {
		if errors.Is(err, payments.ErrReplay) {
			apierr.Write(w, r, apierr.Unauthorized, "", nil)
			return
		}
		apierr.Write(w, r, apierr.Unauthorized, "", nil)
		return
	}
	ev, err := payments.ParseEvent(raw)
	if err != nil {
		apierr.Write(w, r, apierr.Validation, "", []apierr.Detail{{Field: "body", Issue: "json"}})
		return
	}
	provider := "fake"
	if h.pay != nil {
		provider = h.pay.Name()
	}
	if err := h.svc.ApplyWebhook(r.Context(), ev, provider, payments.HashPayload(raw), payments.TruncatePayload(raw)); err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h orderHandler) devPay(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil || h.svc.Store == nil {
		apierr.Write(w, r, apierr.NotFound, "", nil)
		return
	}
	o, err := h.svc.Store.OrderByID(r.Context(), r.PathValue("id"))
	if err != nil {
		writeEventErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, map[string]any{
		"order_id":     o.ID,
		"status":       o.Status,
		"amount_cents": o.AmountCents,
		"simulate":     "/v1/dev/payments/simulate",
	})
}

func (h orderHandler) simulate(w http.ResponseWriter, r *http.Request) {
	var req simulatePayBody
	if !decodeJSON(w, r, &req) {
		return
	}
	status := strings.ToLower(strings.TrimSpace(req.Status))
	if status == "" {
		status = "success"
	}
	eid, err := uuid.NewV7()
	if err != nil {
		eid = uuid.New()
	}
	body, err := json.Marshal(map[string]string{
		"provider_event_id": eid.String(),
		"order_id":          strings.TrimSpace(req.OrderID),
		"status":            status,
	})
	if err != nil {
		apierr.Write(w, r, apierr.Internal, "", nil)
		return
	}
	now := time.Now().UTC()
	if h.now != nil {
		now = h.now()
	}
	r2 := r.Clone(r.Context())
	r2.Body = io.NopCloser(strings.NewReader(string(body)))
	r2.Header.Set(payments.HeaderSignature, payments.Sign(h.secret, now, body))
	r2.ContentLength = int64(len(body))
	h.webhook(w, r2)
}
