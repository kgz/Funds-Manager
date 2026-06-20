CREATE TABLE income_stream_profiles (
    stream_key VARCHAR(255) PRIMARY KEY,
    display_label VARCHAR(255),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    gross_monthly_dollars DOUBLE PRECISION,
    merged_into_key VARCHAR(255) REFERENCES income_stream_profiles (stream_key) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX income_stream_profiles_primary_idx
    ON income_stream_profiles (is_primary)
    WHERE is_primary = TRUE;
