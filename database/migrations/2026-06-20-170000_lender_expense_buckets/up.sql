CREATE TABLE lender_expense_buckets (
    bucket_key VARCHAR(64) PRIMARY KEY,
    label VARCHAR(120) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO lender_expense_buckets (bucket_key, label, sort_order) VALUES
    ('groceries', 'Groceries', 10),
    ('utilities', 'Utilities & communications', 20),
    ('transport', 'Transport', 30),
    ('insurance', 'Insurance', 40),
    ('childcare_education', 'Childcare & education', 50),
    ('healthcare', 'Healthcare', 60),
    ('housing', 'Housing costs', 70),
    ('recreation', 'Recreation & entertainment', 80),
    ('clothing_personal', 'Clothing & personal care', 90),
    ('other', 'Other living expenses', 100);

CREATE TABLE category_lender_mappings (
    category_id BIGINT PRIMARY KEY REFERENCES categories (id) ON DELETE CASCADE,
    bucket_key VARCHAR(64) NOT NULL REFERENCES lender_expense_buckets (bucket_key),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_category_lender_mappings_bucket_key ON category_lender_mappings (bucket_key);
