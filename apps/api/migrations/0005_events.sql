-- F08 events lifecycle. flyer_asset_id has no FK until F09 assets.
-- event_members.owner is inserted on create (F11 expands invites).
CREATE TABLE events (
	id UUID PRIMARY KEY,
	tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
	title TEXT NOT NULL,
	slug TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	starts_at TIMESTAMPTZ NOT NULL,
	ends_at TIMESTAMPTZ NOT NULL,
	venue_id UUID NOT NULL REFERENCES venues (id),
	status TEXT NOT NULL CHECK (status IN (
		'draft', 'pending_review', 'published', 'rejected', 'cancelled', 'archived'
	)),
	flyer_asset_id UUID,
	genres TEXT[] NOT NULL DEFAULT '{}',
	age_policy TEXT NOT NULL DEFAULT '',
	created_by UUID NOT NULL REFERENCES users (id),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CHECK (ends_at > starts_at),
	UNIQUE (tenant_id, slug)
);

CREATE INDEX events_status_starts_at_idx ON events (status, starts_at);
CREATE INDEX events_tenant_id_idx ON events (tenant_id);
CREATE INDEX events_venue_id_idx ON events (venue_id);

CREATE TABLE event_members (
	event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'door', 'metrics')),
	status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	PRIMARY KEY (event_id, user_id)
);

CREATE INDEX event_members_user_id_idx ON event_members (user_id);
CREATE INDEX event_members_active_idx ON event_members (event_id) WHERE status = 'active';
