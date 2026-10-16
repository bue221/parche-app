-- F14 personal profile: bio, avatar, and hashed one-use email-change tokens.
ALTER TABLE users
	ADD COLUMN bio TEXT NOT NULL DEFAULT '',
	ADD COLUMN avatar_asset_id UUID;

ALTER TABLE users
	ADD CONSTRAINT users_avatar_asset_id_fkey
	FOREIGN KEY (avatar_asset_id) REFERENCES assets (id) ON DELETE SET NULL;

CREATE TABLE email_change_tokens (
	id UUID PRIMARY KEY,
	user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	new_email TEXT NOT NULL,
	token_hash TEXT NOT NULL UNIQUE,
	expires_at TIMESTAMPTZ NOT NULL,
	used_at TIMESTAMPTZ
);

CREATE INDEX email_change_tokens_user_id_idx ON email_change_tokens (user_id);
