CREATE TYPE category_mappings_match_type AS ENUM ('exact', 'regex');

CREATE TABLE IF NOT EXISTS category_mappings (
    id BIGSERIAL PRIMARY KEY,
    pattern VARCHAR(255) NOT NULL,
    match_type category_mappings_match_type NOT NULL DEFAULT 'exact',
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_category_mappings_pattern ON category_mappings (pattern);
CREATE INDEX IF NOT EXISTS idx_category_mappings_priority ON category_mappings (priority);
