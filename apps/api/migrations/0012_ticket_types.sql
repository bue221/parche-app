-- F15 ticket type catalog. reserved_count/sold_count move in F16 checkout; the cap invariant holds here.
CREATE TABLE ticket_types (
	id UUID PRIMARY KEY,
	event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	price_cents INTEGER NOT NULL,
	currency TEXT NOT NULL,
	capacity INTEGER NOT NULL,
	sold_count INTEGER NOT NULL DEFAULT 0,
	reserved_count INTEGER NOT NULL DEFAULT 0,
	sales_starts_at TIMESTAMPTZ,
	sales_ends_at TIMESTAMPTZ,
	status TEXT NOT NULL CHECK (status IN (
		'draft', 'on_sale', 'paused', 'sold_out', 'archived'
	)),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CHECK (price_cents >= 0),
	CHECK (capacity >= 1),
	CHECK (sold_count >= 0),
	CHECK (reserved_count >= 0),
	CHECK (reserved_count + sold_count <= capacity),
	CHECK (
		sales_ends_at IS NULL
		OR sales_starts_at IS NULL
		OR sales_ends_at > sales_starts_at
	)
);

CREATE INDEX ticket_types_event_id_idx ON ticket_types (event_id);
