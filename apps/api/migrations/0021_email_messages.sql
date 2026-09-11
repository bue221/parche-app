-- F26 transactional email outbox. SMTP lives in the worker, not handlers.
CREATE TABLE email_messages (
	id UUID PRIMARY KEY,
	template TEXT NOT NULL,
	to_user_id UUID REFERENCES users (id),
	status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
	provider_id TEXT NOT NULL DEFAULT '',
	idempotency_key TEXT NOT NULL UNIQUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX email_messages_status_idx ON email_messages (status, created_at);
