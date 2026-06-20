CREATE TABLE liabilities (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    kind VARCHAR(32) NOT NULL,
    lender VARCHAR(200),
    balance_cents BIGINT NOT NULL,
    credit_limit_cents BIGINT,
    original_amount_cents BIGINT,
    interest_rate_bps INTEGER,
    rate_type VARCHAR(16),
    repayment_cents BIGINT,
    repayment_frequency VARCHAR(16),
    term_months INTEGER,
    financial_account_id BIGINT REFERENCES financial_accounts (id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT liabilities_kind_check CHECK (
        kind IN ('home_loan', 'car_loan', 'personal_loan', 'credit_card', 'bnpl', 'hecs', 'other')
    ),
    CONSTRAINT liabilities_rate_type_check CHECK (
        rate_type IS NULL OR rate_type IN ('fixed', 'variable')
    ),
    CONSTRAINT liabilities_frequency_check CHECK (
        repayment_frequency IS NULL OR repayment_frequency IN ('weekly', 'fortnightly', 'monthly')
    ),
    CONSTRAINT liabilities_balance_nonneg CHECK (balance_cents >= 0),
    CONSTRAINT liabilities_credit_limit_nonneg CHECK (credit_limit_cents IS NULL OR credit_limit_cents >= 0),
    CONSTRAINT liabilities_original_nonneg CHECK (original_amount_cents IS NULL OR original_amount_cents >= 0),
    CONSTRAINT liabilities_repayment_nonneg CHECK (repayment_cents IS NULL OR repayment_cents >= 0),
    CONSTRAINT liabilities_rate_nonneg CHECK (interest_rate_bps IS NULL OR interest_rate_bps >= 0),
    CONSTRAINT liabilities_term_nonneg CHECK (term_months IS NULL OR term_months >= 0)
);

CREATE INDEX liabilities_active_idx
    ON liabilities (kind, name)
    WHERE deleted_at IS NULL;
