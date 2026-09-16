-- F28 passwordless OTP, F29 Google identities, F30 event saves.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE auth_otp_challenges (
	email TEXT PRIMARY KEY,
	code_hash TEXT NOT NULL,
	expires_at TIMESTAMPTZ NOT NULL,
	attempts INT NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auth_identities (
	user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	provider TEXT NOT NULL,
	subject TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	PRIMARY KEY (provider, subject)
);

CREATE INDEX auth_identities_user_id_idx ON auth_identities (user_id);

CREATE TABLE event_saves (
	user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	PRIMARY KEY (user_id, event_id)
);

CREATE INDEX event_saves_user_created_idx ON event_saves (user_id, created_at DESC);
