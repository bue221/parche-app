-- F22 public event search: GIN genres, trigram title, starts_at. Venue lat/lng index is F07.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS events_genres_gin_idx ON events USING GIN (genres);
CREATE INDEX IF NOT EXISTS events_title_trgm_idx ON events USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS events_starts_at_idx ON events (starts_at);
