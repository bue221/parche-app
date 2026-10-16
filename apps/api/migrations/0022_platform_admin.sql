-- F27 platform admin: email opt-out, audit log. Bootstrap is env BOOTSTRAP_ADMIN_EMAIL in the API process.
ALTER TABLE users
	ADD COLUMN email_opt_out BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE admin_audit (
	id UUID PRIMARY KEY,
	admin_id UUID NOT NULL REFERENCES users (id),
	action TEXT NOT NULL,
	target_type TEXT NOT NULL,
	target_id TEXT NOT NULL,
	payload JSONB NOT NULL DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admin_audit_admin_id_created_at_idx ON admin_audit (admin_id, created_at DESC);
CREATE INDEX admin_audit_target_idx ON admin_audit (target_type, target_id);
CREATE INDEX users_email_opt_out_idx ON users (email_opt_out) WHERE email_opt_out = FALSE;
