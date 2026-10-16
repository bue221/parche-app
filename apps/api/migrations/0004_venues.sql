-- F07 venues: WGS84 pin + optional GeoJSON. Public visibility is published_uses (F08 increments).
-- Numeric lat/lng index (no PostGIS / no Google).
CREATE TABLE venues (
	id UUID PRIMARY KEY,
	tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	address_text TEXT NOT NULL DEFAULT '',
	lat DOUBLE PRECISION NOT NULL,
	lng DOUBLE PRECISION NOT NULL,
	geojson JSONB,
	source TEXT NOT NULL DEFAULT 'user_pin' CHECK (source = 'user_pin'),
	published_uses INTEGER NOT NULL DEFAULT 0 CHECK (published_uses >= 0),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CHECK (lat BETWEEN -90 AND 90),
	CHECK (lng BETWEEN -180 AND 180)
);

CREATE INDEX venues_tenant_id_idx ON venues (tenant_id);
CREATE INDEX venues_lat_lng_idx ON venues (lat, lng);
CREATE INDEX venues_published_uses_idx ON venues (published_uses) WHERE published_uses > 0;
