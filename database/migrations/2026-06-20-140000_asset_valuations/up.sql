CREATE TABLE asset_valuations (
    id BIGSERIAL PRIMARY KEY,
    asset_id BIGINT NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
    valued_at DATE NOT NULL,
    value_cents BIGINT NOT NULL,
    source VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT asset_valuations_value_nonneg CHECK (value_cents >= 0)
);

CREATE INDEX asset_valuations_asset_idx
    ON asset_valuations (asset_id, valued_at DESC)
    WHERE deleted_at IS NULL;

-- Seed history from each existing asset's current snapshot so trends start populated.
INSERT INTO asset_valuations (asset_id, valued_at, value_cents, source, created_at)
SELECT id, COALESCE(valued_at, created_at::date), value_cents, value_source, created_at
FROM assets
WHERE deleted_at IS NULL;
