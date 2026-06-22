CREATE TABLE category_lender_exclusions (
    category_id BIGINT PRIMARY KEY REFERENCES categories (id) ON DELETE CASCADE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_category_lender_exclusions_updated_at ON category_lender_exclusions (updated_at);
