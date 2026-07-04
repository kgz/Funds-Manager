ALTER TABLE planned_spending
    ADD COLUMN matched_transaction_id BIGINT REFERENCES transaction_data (id) ON DELETE SET NULL,
    ADD COLUMN resolved_at TIMESTAMP;

CREATE TABLE planned_spending_dismissed_matches (
    id BIGSERIAL PRIMARY KEY,
    planned_spending_id BIGINT NOT NULL REFERENCES planned_spending (id) ON DELETE CASCADE,
    transaction_id BIGINT NOT NULL REFERENCES transaction_data (id) ON DELETE CASCADE,
    dismissed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT planned_spending_dismissed_matches_unique UNIQUE (planned_spending_id, transaction_id)
);

CREATE INDEX planned_spending_unresolved_idx
    ON planned_spending (start_date)
    WHERE deleted_at IS NULL AND resolved_at IS NULL;
