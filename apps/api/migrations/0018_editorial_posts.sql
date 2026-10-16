-- F23 editorial posts: public techno culture content, optional F03 cover.
CREATE TABLE posts (
	id UUID PRIMARY KEY,
	slug TEXT NOT NULL UNIQUE,
	title TEXT NOT NULL,
	body_md TEXT NOT NULL DEFAULT '',
	cover_asset_id UUID,
	status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
	author_id UUID NOT NULL REFERENCES users (id),
	published_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX posts_published_idx ON posts (published_at DESC, id DESC) WHERE status = 'published';

ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_owner_type_check;
ALTER TABLE assets ADD CONSTRAINT assets_owner_type_check
	CHECK (owner_type IN ('event', 'user', 'artist', 'post'));

ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_kind_check;
ALTER TABLE assets ADD CONSTRAINT assets_kind_check
	CHECK (kind IN ('flyer', 'gallery', 'avatar', 'audio', 'cover'));

ALTER TABLE posts
	ADD CONSTRAINT posts_cover_asset_id_fkey
	FOREIGN KEY (cover_asset_id) REFERENCES assets (id) ON DELETE SET NULL;

ALTER TABLE upload_intents
	ADD COLUMN post_id UUID REFERENCES posts (id) ON DELETE CASCADE;
