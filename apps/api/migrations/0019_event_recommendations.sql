-- F24 materialized recommendations. Worker recs.refresh writes top 50 per user; GET returns at most 20.
CREATE TABLE event_recommendations (
	user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
	score INTEGER NOT NULL,
	reason TEXT NOT NULL CHECK (reason IN ('follow', 'genre', 'popular')),
	rank INTEGER NOT NULL CHECK (rank >= 1),
	computed_at TIMESTAMPTZ NOT NULL,
	PRIMARY KEY (user_id, event_id)
);

CREATE INDEX event_recommendations_user_rank_idx ON event_recommendations (user_id, rank);
