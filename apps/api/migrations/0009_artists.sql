-- F12 public artist profiles and event lineup.
CREATE TABLE artists (
	id UUID PRIMARY KEY,
	user_id UUID UNIQUE REFERENCES users (id) ON DELETE SET NULL,
	tenant_id UUID REFERENCES tenants (id) ON DELETE SET NULL,
	name TEXT NOT NULL,
	bio TEXT NOT NULL DEFAULT '',
	avatar_asset_id UUID,
	links JSONB NOT NULL DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX artists_tenant_id_idx ON artists (tenant_id);

CREATE TABLE event_artists (
	event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
	artist_id UUID NOT NULL REFERENCES artists (id) ON DELETE CASCADE,
	billing_order INT NOT NULL DEFAULT 0,
	starts_at TIMESTAMPTZ,
	PRIMARY KEY (event_id, artist_id)
);

CREATE INDEX event_artists_artist_id_idx ON event_artists (artist_id);
CREATE INDEX event_artists_event_order_idx ON event_artists (event_id, billing_order);

ALTER TABLE artists
	ADD CONSTRAINT artists_avatar_asset_id_fkey
	FOREIGN KEY (avatar_asset_id) REFERENCES assets (id) ON DELETE SET NULL;

-- Artist (and later user) avatars are not always tenant-scoped.
ALTER TABLE assets
	ALTER COLUMN tenant_id DROP NOT NULL;

ALTER TABLE upload_intents
	ADD COLUMN artist_id UUID REFERENCES artists (id) ON DELETE CASCADE;
