-- F25 club directory is a view over venues (no second table).
-- listed=false until a published event or an explicit promoter list (POST /v1/clubs).
ALTER TABLE venues
	ADD COLUMN kind TEXT NOT NULL DEFAULT 'other' CHECK (kind IN ('club', 'other')),
	ADD COLUMN listed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX venues_clubs_directory_idx ON venues (id DESC)
	WHERE kind = 'club' AND (listed OR published_uses > 0);
