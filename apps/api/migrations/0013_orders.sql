-- F16 checkout: pending orders reserve aforo; webhooks and TTL release or convert to sold.
CREATE TABLE orders (
	id UUID PRIMARY KEY,
	user_id UUID NOT NULL REFERENCES users (id),
	event_id UUID NOT NULL REFERENCES events (id),
	status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
	amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
	currency TEXT NOT NULL,
	expires_at TIMESTAMPTZ NOT NULL,
	checkout_url TEXT NOT NULL DEFAULT '',
	idempotency_key TEXT NOT NULL,
	request_hash TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	UNIQUE (user_id, event_id, idempotency_key)
);

CREATE INDEX orders_event_pending_expires_idx ON orders (event_id, status, expires_at);
CREATE INDEX orders_user_id_idx ON orders (user_id);

CREATE TABLE order_items (
	id UUID PRIMARY KEY,
	order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
	ticket_type_id UUID NOT NULL REFERENCES ticket_types (id),
	quantity INTEGER NOT NULL CHECK (quantity >= 1),
	unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0)
);

CREATE INDEX order_items_order_id_idx ON order_items (order_id);

CREATE TABLE tickets (
	id UUID PRIMARY KEY,
	order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
	ticket_type_id UUID NOT NULL REFERENCES ticket_types (id),
	event_id UUID NOT NULL REFERENCES events (id),
	user_id UUID NOT NULL REFERENCES users (id),
	status TEXT NOT NULL CHECK (status IN (
		'reserved', 'valid', 'used', 'transferred', 'cancelled'
	)),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tickets_order_id_idx ON tickets (order_id);
CREATE INDEX tickets_user_id_idx ON tickets (user_id);

CREATE TABLE payment_transactions (
	id UUID PRIMARY KEY,
	order_id UUID NOT NULL REFERENCES orders (id),
	provider TEXT NOT NULL,
	provider_event_id TEXT NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
	raw_payload_hash TEXT NOT NULL,
	payload_truncated TEXT NOT NULL DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	UNIQUE (provider_event_id)
);

CREATE INDEX payment_transactions_order_id_idx ON payment_transactions (order_id);
