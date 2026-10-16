-- F16 Mercado Pago marketplace: one OAuth seller (promoter) per tenant.
CREATE TABLE tenant_mp_accounts (
	tenant_id UUID PRIMARY KEY REFERENCES tenants (id) ON DELETE CASCADE,
	mp_user_id TEXT NOT NULL,
	access_token_enc BYTEA NOT NULL,
	refresh_token_enc BYTEA NOT NULL,
	public_key TEXT NOT NULL DEFAULT '',
	expires_at TIMESTAMPTZ NOT NULL,
	connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
