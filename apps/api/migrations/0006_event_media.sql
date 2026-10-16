-- F09 event image media: upload intents, assets, flyer FK.
CREATE TABLE upload_intents (
	key TEXT PRIMARY KEY,
	user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	kind TEXT NOT NULL,
	event_id UUID REFERENCES events (id) ON DELETE CASCADE,
	content_type TEXT NOT NULL,
	byte_size BIGINT NOT NULL,
	expires_at TIMESTAMPTZ NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX upload_intents_user_id_idx ON upload_intents (user_id);
CREATE INDEX upload_intents_expires_at_idx ON upload_intents (expires_at);

CREATE TABLE assets (
	id UUID PRIMARY KEY,
	tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
	owner_type TEXT NOT NULL CHECK (owner_type IN ('event', 'user', 'artist')),
	owner_id UUID NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('flyer', 'gallery', 'avatar', 'audio')),
	key TEXT NOT NULL UNIQUE,
	thumb_key TEXT NOT NULL DEFAULT '',
	mime TEXT NOT NULL,
	bytes BIGINT NOT NULL DEFAULT 0,
	width INT NOT NULL DEFAULT 0,
	height INT NOT NULL DEFAULT 0,
	status TEXT NOT NULL CHECK (status IN ('processing', 'ready', 'failed')),
	created_by UUID NOT NULL REFERENCES users (id),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX assets_owner_idx ON assets (owner_type, owner_id);
CREATE INDEX assets_tenant_id_idx ON assets (tenant_id);

ALTER TABLE events
	ADD CONSTRAINT events_flyer_asset_id_fkey
	FOREIGN KEY (flyer_asset_id) REFERENCES assets (id) ON DELETE SET NULL;
