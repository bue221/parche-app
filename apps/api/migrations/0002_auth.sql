-- F04 session: users, rotating refresh, and a tenant stub so promoter register works before F06.
CREATE TABLE users (
	id UUID PRIMARY KEY,
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	display_name TEXT NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
	id UUID PRIMARY KEY,
	user_id UUID NOT NULL REFERENCES users (id),
	family_id UUID NOT NULL,
	token_hash TEXT NOT NULL UNIQUE,
	expires_at TIMESTAMPTZ NOT NULL,
	revoked_at TIMESTAMPTZ,
	replaced_by UUID REFERENCES refresh_tokens (id),
	user_agent TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_family_id_idx ON refresh_tokens (family_id);
CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);

CREATE TABLE tenants (
	id UUID PRIMARY KEY,
	slug TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	currency TEXT NOT NULL DEFAULT 'COP',
	status TEXT NOT NULL DEFAULT 'active',
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_profiles (
	user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	profile TEXT NOT NULL CHECK (profile IN ('attendee', 'promoter', 'artist', 'platform_admin')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	PRIMARY KEY (user_id, profile)
);

CREATE TABLE tenant_members (
	tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX tenant_members_user_id_idx ON tenant_members (user_id);
