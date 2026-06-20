CREATE TABLE liability_balances (
    id BIGSERIAL PRIMARY KEY,
    liability_id BIGINT NOT NULL REFERENCES liabilities (id) ON DELETE CASCADE,
    balanced_at DATE NOT NULL,
    balance_cents BIGINT NOT NULL,
    source VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT liability_balances_balance_nonneg CHECK (balance_cents >= 0)
);

CREATE INDEX liability_balances_liability_idx
    ON liability_balances (liability_id, balanced_at DESC)
    WHERE deleted_at IS NULL;

INSERT INTO liability_balances (liability_id, balanced_at, balance_cents, source, created_at)
SELECT id, created_at::date, balance_cents, NULL, created_at
FROM liabilities
WHERE deleted_at IS NULL;
