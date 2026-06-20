CREATE TABLE assets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    kind VARCHAR(32) NOT NULL,
    value_cents BIGINT NOT NULL,
    valued_at DATE,
    value_source VARCHAR(200),
    liability_id BIGINT REFERENCES liabilities (id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT assets_kind_check CHECK (
        kind IN ('property', 'vehicle', 'super', 'savings', 'investment', 'other')
    ),
    CONSTRAINT assets_value_nonneg CHECK (value_cents >= 0)
);

CREATE INDEX assets_active_idx
    ON assets (kind, name)
    WHERE deleted_at IS NULL;
