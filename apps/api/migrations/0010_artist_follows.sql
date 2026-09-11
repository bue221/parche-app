-- F13 artist follows. Composite PK makes duplicate follows a no-op via ON CONFLICT.
CREATE TABLE artist_follows (
	user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	artist_id UUID NOT NULL REFERENCES artists (id) ON DELETE CASCADE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	PRIMARY KEY (user_id, artist_id)
);

CREATE INDEX artist_follows_user_created_idx ON artist_follows (user_id, created_at DESC, artist_id DESC);
CREATE INDEX artist_follows_artist_id_idx ON artist_follows (artist_id);
