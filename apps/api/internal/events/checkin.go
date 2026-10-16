package events

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/parche-app/backend/internal/auth"
	"github.com/parche-app/backend/internal/broker"
	"github.com/parche-app/backend/internal/ticketsign"
)

const (
	ScanApproved   = "approved"
	ScanDuplicate  = "duplicate"
	ScanInvalid    = "invalid"
	ScanWrongEvent = "wrong_event"
	ScanExpired    = "expired"

	ticketUsedPrefix = "ticket:used:"
	doorUsedKeySuf   = ":door:used"
	doorRecentKeySuf = ":door:recent"
	doorRecentMax    = 20
	ticketUsedHold   = 7 * 24 * time.Hour

	// IncludeGuestName is the door/live query value for metrics/owner guest display names.
	IncludeGuestName = "guest_name"
)

// CheckInResult is POST /v1/events/{eventId}/check-in. HTTP 200 for scan outcomes.
type CheckInResult struct {
	Result    string    `json:"result"`
	TicketID  *string   `json:"ticket_id"`
	ScannedAt time.Time `json:"scanned_at"`
}

// TicketScanJob is the ticket.used broker payload. Worker persists used + scan log.
type TicketScanJob struct {
	TicketID      string    `json:"ticket_id"`
	EventID       string    `json:"event_id"`
	ScannerUserID string    `json:"scanner_user_id"`
	TS            time.Time `json:"ts"`
	Result        string    `json:"result"`
}

// TicketScanLog is one ticket_scan_logs row, including duplicates.
type TicketScanLog struct {
	ID            string
	TicketID      string
	EventID       string
	ScannerUserID string
	Result        string
	CreatedAt     time.Time
}

// DoorLive is GET /v1/events/{eventId}/door/live. Counts only; no revenue.
type DoorLive struct {
	Sold     int          `json:"sold"`
	Used     int          `json:"used"`
	Inside   int          `json:"inside"`
	Capacity int          `json:"capacity"`
	Recent   []DoorRecent `json:"recent"`
}

// DoorRecent is the last scans for the door tablet. guest_name is opt-in for metrics.
type DoorRecent struct {
	TS            time.Time `json:"ts"`
	ScannerUserID string    `json:"scanner_user_id"`
	Result        string    `json:"result"`
	GuestName     string    `json:"guest_name,omitempty"`
}

type doorRecentStored struct {
	TS            time.Time `json:"ts"`
	ScannerUserID string    `json:"scanner_user_id"`
	Result        string    `json:"result"`
	TicketID      string    `json:"ticket_id"`
}

// CheckIn verifies the QR in memory, gates on event.door.scan, and SETNX in Redis.
// Postgres is not on this path except ACL cache miss; persistence is async via ticket.used.
func (s *Service) CheckIn(ctx context.Context, scannerID, eventID, qrToken string) (CheckInResult, error) {
	now := s.now()
	out := CheckInResult{ScannedAt: now}
	eventID = strings.TrimSpace(eventID)
	qrToken = strings.TrimSpace(qrToken)
	if eventID == "" {
		return CheckInResult{}, auth.ErrNotFound
	}
	if qrToken == "" {
		return CheckInResult{}, auth.Invalid{Fields: []auth.Field{{Name: "qr_token", Issue: "required"}}}
	}
	ok, err := s.HasPermission(ctx, scannerID, eventID, PermDoorScan)
	if err != nil {
		return CheckInResult{}, err
	}
	if !ok {
		return CheckInResult{}, auth.ErrForbidden
	}

	claims, err := s.Tickets.Verify(qrToken, now)
	if errors.Is(err, ticketsign.ErrExpired) {
		out.Result = ScanExpired
		return out, nil
	}
	if err != nil {
		jti, ok := parseBarcodeJTI(qrToken)
		if !ok {
			out.Result = ScanInvalid
			return out, nil
		}
		claims, out, cont, err := s.claimsFromBarcode(ctx, now, jti, out)
		if err != nil || !cont {
			return out, err
		}
		return s.finishCheckIn(ctx, scannerID, eventID, claims, out, now)
	}
	return s.finishCheckIn(ctx, scannerID, eventID, claims, out, now)
}

func (s *Service) claimsFromBarcode(ctx context.Context, now time.Time, jti string, out CheckInResult) (ticketsign.Claims, CheckInResult, bool, error) {
	t, err := s.Store.TicketByJTI(ctx, jti)
	if err != nil {
		out.Result = ScanInvalid
		return ticketsign.Claims{}, out, false, nil
	}
	if t.Status != TicketValid && t.Status != TicketUsed {
		out.Result = ScanInvalid
		return ticketsign.Claims{}, out, false, nil
	}
	ev, err := s.Store.ByID(ctx, t.EventID)
	if err != nil {
		return ticketsign.Claims{}, CheckInResult{}, false, err
	}
	exp := ev.EndsAt.UTC().Add(ticketQRGrace)
	if !exp.After(now) {
		out.Result = ScanExpired
		out.TicketID = strPtr(t.ID)
		return ticketsign.Claims{}, out, false, nil
	}
	return ticketsign.Claims{
		TicketID:  t.ID,
		EventID:   t.EventID,
		JWTID:     t.JTI,
		ExpiresAt: exp,
	}, out, true, nil
}

func (s *Service) finishCheckIn(ctx context.Context, scannerID, eventID string, claims ticketsign.Claims, out CheckInResult, now time.Time) (CheckInResult, error) {
	out.TicketID = strPtr(claims.TicketID)
	if claims.EventID != eventID {
		out.Result = ScanWrongEvent
		return out, nil
	}
	denied, err := s.TicketJTIDenied(ctx, claims.JWTID)
	if err != nil {
		return CheckInResult{}, err
	}
	if denied {
		out.Result = ScanInvalid
		return out, nil
	}
	if s.Cache == nil {
		return CheckInResult{}, errors.New("check-in cache unavailable")
	}
	ttl := ticketUsedTTL(claims.ExpiresAt, now)
	won, err := s.Cache.SetNX(ctx, ticketUsedKey(claims.TicketID), "1", ttl)
	if err != nil {
		return CheckInResult{}, err
	}
	if won {
		out.Result = ScanApproved
		if _, err := s.Cache.Incr(ctx, doorUsedKey(eventID), ttl); err != nil {
			return CheckInResult{}, err
		}
	} else {
		out.Result = ScanDuplicate
	}
	s.recordDoorRecent(ctx, eventID, claims.TicketID, scannerID, out.Result, now, ttl)
	s.enqueueTicketScan(ctx, TicketScanJob{
		TicketID: claims.TicketID, EventID: eventID, ScannerUserID: scannerID,
		TS: now, Result: out.Result,
	})
	return out, nil
}

// DoorLive is GET /v1/events/{eventId}/door/live. door.live or metrics.read.
func (s *Service) DoorLive(ctx context.Context, userID, eventID string, includeGuest bool) (DoorLive, error) {
	eventID = strings.TrimSpace(eventID)
	liveOK, err := s.HasPermission(ctx, userID, eventID, PermDoorLive)
	if err != nil {
		return DoorLive{}, err
	}
	metricsOK, err := s.HasPermission(ctx, userID, eventID, PermMetricsRead)
	if err != nil {
		return DoorLive{}, err
	}
	if !liveOK && !metricsOK {
		return DoorLive{}, auth.ErrForbidden
	}
	sold, capacity, pgUsed, err := s.Store.DoorInventory(ctx, eventID)
	if err != nil {
		return DoorLive{}, err
	}
	used := pgUsed
	if s.Cache != nil {
		if raw, ok, err := s.Cache.Get(ctx, doorUsedKey(eventID)); err != nil {
			return DoorLive{}, err
		} else if ok {
			if n, conv := strconv.Atoi(raw); conv == nil {
				used = n
			}
		}
	}
	recent, err := s.doorRecent(ctx, eventID, includeGuest && metricsOK)
	if err != nil {
		return DoorLive{}, err
	}
	if recent == nil {
		recent = []DoorRecent{}
	}
	return DoorLive{Sold: sold, Used: used, Inside: used, Capacity: capacity, Recent: recent}, nil
}

// ApplyTicketScan is the F19 worker: mark used on approved, always insert the scan log.
func (s *Service) ApplyTicketScan(ctx context.Context, job TicketScanJob) error {
	if err := PersistTicketScan(ctx, s.Store, job); err != nil {
		return err
	}
	s.invalidateEventMetrics(ctx, job.EventID)
	return nil
}

// PersistTicketScan writes the scan without requiring a full Service (worker path).
func PersistTicketScan(ctx context.Context, store Store, job TicketScanJob) error {
	return applyTicketScan(ctx, store, job)
}

func applyTicketScan(ctx context.Context, store Store, job TicketScanJob) error {
	if strings.TrimSpace(job.TicketID) == "" || strings.TrimSpace(job.EventID) == "" {
		return nil
	}
	now := job.TS
	if now.IsZero() {
		now = time.Now().UTC()
	}
	if job.Result == ScanApproved {
		if err := store.MarkTicketUsed(ctx, job.TicketID, now); err != nil {
			return err
		}
	}
	id, err := newID()
	if err != nil {
		return err
	}
	return store.InsertScanLog(ctx, TicketScanLog{
		ID: id, TicketID: job.TicketID, EventID: job.EventID,
		ScannerUserID: job.ScannerUserID, Result: job.Result, CreatedAt: now,
	})
}

func (s *Service) enqueueTicketScan(ctx context.Context, job TicketScanJob) {
	body, err := json.Marshal(job)
	if err != nil {
		return
	}
	if s.Publisher != nil {
		_ = s.Publisher.Publish(ctx, broker.SubjectTicketUsed, body)
		return
	}
	_ = s.ApplyTicketScan(ctx, job)
}

func (s *Service) recordDoorRecent(ctx context.Context, eventID, ticketID, scannerID, result string, ts time.Time, ttl time.Duration) {
	if s.Cache == nil {
		return
	}
	raw, err := json.Marshal(doorRecentStored{
		TS: ts.UTC(), ScannerUserID: scannerID, Result: result, TicketID: ticketID,
	})
	if err != nil {
		return
	}
	_ = s.Cache.LPushTrim(ctx, doorRecentKey(eventID), string(raw), doorRecentMax, ttl)
}

func (s *Service) doorRecent(ctx context.Context, eventID string, withGuest bool) ([]DoorRecent, error) {
	if s.Cache != nil {
		raws, err := s.Cache.LRange(ctx, doorRecentKey(eventID), 0, int64(doorRecentMax-1))
		if err != nil {
			return nil, err
		}
		if len(raws) > 0 {
			out := make([]DoorRecent, 0, len(raws))
			for _, raw := range raws {
				var stored doorRecentStored
				if json.Unmarshal([]byte(raw), &stored) != nil {
					continue
				}
				out = append(out, s.decorateRecent(ctx, stored, withGuest))
			}
			return out, nil
		}
	}
	rows, err := s.Store.ListRecentScanLogs(ctx, eventID, doorRecentMax)
	if err != nil {
		return nil, err
	}
	out := make([]DoorRecent, 0, len(rows))
	for _, row := range rows {
		out = append(out, s.decorateRecent(ctx, doorRecentStored{
			TS: row.CreatedAt, ScannerUserID: row.ScannerUserID, Result: row.Result, TicketID: row.TicketID,
		}, withGuest))
	}
	return out, nil
}

func (s *Service) decorateRecent(ctx context.Context, stored doorRecentStored, withGuest bool) DoorRecent {
	item := DoorRecent{
		TS: stored.TS.UTC(), ScannerUserID: stored.ScannerUserID, Result: stored.Result,
	}
	if !withGuest || stored.TicketID == "" || s.Tenancy == nil {
		return item
	}
	t, err := s.Store.TicketByID(ctx, stored.TicketID)
	if err != nil {
		return item
	}
	u, err := s.Tenancy.UserByID(ctx, t.UserID)
	if err != nil {
		return item
	}
	item.GuestName = u.DisplayName
	return item
}

func ticketUsedKey(ticketID string) string { return ticketUsedPrefix + ticketID }

func doorUsedKey(eventID string) string { return aclKeyPref + eventID + doorUsedKeySuf }

func doorRecentKey(eventID string) string { return aclKeyPref + eventID + doorRecentKeySuf }

func ticketUsedTTL(qrExp, now time.Time) time.Duration {
	until := qrExp.UTC().Add(ticketUsedHold - ticketQRGrace)
	ttl := until.Sub(now.UTC())
	if ttl < time.Second {
		ttl = time.Second
	}
	return ttl
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	v := s
	return &v
}
