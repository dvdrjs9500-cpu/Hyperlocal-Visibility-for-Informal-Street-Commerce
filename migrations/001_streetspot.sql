CREATE TABLE IF NOT EXISTS streetspot_profiles (
    user_id TEXT PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'consumer'
        CHECK (role IN ('consumer', 'vendor')),
    display_name TEXT NOT NULL DEFAULT 'StreetSpot User',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS streetspot_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Street Food',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    is_live BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ,
    avatar TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS streetspot_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL
        REFERENCES streetspot_vendors(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS streetspot_vendor_live_idx
ON streetspot_vendors (is_live, expires_at);

CREATE INDEX IF NOT EXISTS streetspot_items_vendor_idx
ON streetspot_items (vendor_id);
