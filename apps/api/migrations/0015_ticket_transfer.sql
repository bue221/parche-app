-- F18: cap cesiones and pending claims for emails without an account.
ALTER TABLE tickets
	ADD COLUMN transfer_count INTEGER NOT NULL DEFAULT 0
		CHECK (transfer_count >= 0 AND transfer_count <= 3);

CREATE TABLE ticket_claims (
	id UUID PRIMARY KEY,
	ticket_id UUID NOT NULL REFERENCES tickets (id) ON DELETE CASCADE,
	from_user_id UUID NOT NULL REFERENCES users (id),
	to_email TEXT NOT NULL,
	token_hash TEXT NOT NULL UNIQUE,
	expires_at TIMESTAMPTZ NOT NULL,
	accepted_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ticket_claims_ticket_id_idx ON ticket_claims (ticket_id);
CREATE UNIQUE INDEX ticket_claims_pending_ticket_uidx
	ON ticket_claims (ticket_id) WHERE accepted_at IS NULL;
