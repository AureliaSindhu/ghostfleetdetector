CREATE TABLE ais_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mmsi TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  sog DOUBLE PRECISION,
  cog DOUBLE PRECISION,
  ship_type INTEGER,
  ship_name TEXT,
  flag TEXT,
  upload_batch_id UUID REFERENCES upload_batches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
