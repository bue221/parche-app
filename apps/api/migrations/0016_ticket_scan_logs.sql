-- F19 door check-in: async scan log; tickets.status=used is applied by the worker.
CREATE TABLE ticket_scan_logs (
	id UUID PRIMARY KEY,
	ticket_id UUID NOT NULL REFERENCES tickets (id),
	event_id UUID NOT NULL REFERENCES events (id),
	scanner_user_id UUID NOT NULL REFERENCES users (id),
	result TEXT NOT NULL CHECK (result IN (
		'approved', 'duplicate', 'invalid', 'wrong_event', 'expired'
	)),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ticket_scan_logs_event_created_idx ON ticket_scan_logs (event_id, created_at DESC);
CREATE INDEX ticket_scan_logs_ticket_id_idx ON ticket_scan_logs (ticket_id);
