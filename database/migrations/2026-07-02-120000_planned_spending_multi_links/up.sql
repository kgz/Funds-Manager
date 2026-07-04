CREATE TABLE planned_spending_links (
    id BIGSERIAL PRIMARY KEY,
    planned_spending_id BIGINT NOT NULL REFERENCES planned_spending (id) ON DELETE CASCADE,
    transaction_id BIGINT NOT NULL REFERENCES transaction_data (id) ON DELETE CASCADE,
    linked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT planned_spending_links_pair_unique UNIQUE (planned_spending_id, transaction_id),
    CONSTRAINT planned_spending_links_transaction_unique UNIQUE (transaction_id)
);

INSERT INTO planned_spending_links (planned_spending_id, transaction_id, linked_at)
SELECT id, matched_transaction_id, COALESCE(resolved_at, NOW())
FROM planned_spending
WHERE matched_transaction_id IS NOT NULL;

ALTER TABLE planned_spending
    DROP COLUMN matched_transaction_id;
