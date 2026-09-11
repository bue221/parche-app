-- F11 event invites. event_members already exists from F08.
CREATE TABLE event_invites (
	id UUID PRIMARY KEY,
	event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
	email TEXT NOT NULL,
	invited_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
	role TEXT NOT NULL CHECK (role IN ('manager', 'door', 'metrics')),
	token_hash TEXT NOT NULL UNIQUE,
	expires_at TIMESTAMPTZ NOT NULL,
	accepted_at TIMESTAMPTZ,
	invited_by UUID NOT NULL REFERENCES users (id),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX event_invites_event_id_idx ON event_invites (event_id);
CREATE UNIQUE INDEX event_invites_pending_email_idx
	ON event_invites (event_id, email) WHERE accepted_at IS NULL;
