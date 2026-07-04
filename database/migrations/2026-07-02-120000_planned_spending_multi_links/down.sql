ALTER TABLE planned_spending
    ADD COLUMN matched_transaction_id BIGINT REFERENCES transaction_data (id) ON DELETE SET NULL;

UPDATE planned_spending ps
SET matched_transaction_id = link.transaction_id
FROM (
    SELECT DISTINCT ON (planned_spending_id)
        planned_spending_id,
        transaction_id
    FROM planned_spending_links
    ORDER BY planned_spending_id, linked_at DESC, id DESC
) AS link
WHERE ps.id = link.planned_spending_id;

DROP TABLE planned_spending_links;
