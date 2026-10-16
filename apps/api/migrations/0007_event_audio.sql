-- F10 event audio: preview metadata on assets, ordered tracks per event.
ALTER TABLE assets
	ADD COLUMN duration_ms INT NOT NULL DEFAULT 0,
	ADD COLUMN preview_key TEXT NOT NULL DEFAULT '',
	ADD COLUMN transcode_status TEXT NOT NULL DEFAULT ''
		CHECK (transcode_status IN ('', 'pending', 'ready', 'failed'));

CREATE TABLE event_tracks (
	id UUID PRIMARY KEY,
	event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
	asset_id UUID NOT NULL REFERENCES assets (id) ON DELETE RESTRICT,
	title TEXT NOT NULL,
	position INT NOT NULL,
	UNIQUE (event_id, position)
);

CREATE INDEX event_tracks_event_id_idx ON event_tracks (event_id);
CREATE INDEX event_tracks_asset_id_idx ON event_tracks (asset_id);
