DROP INDEX IF EXISTS planned_spending_unresolved_idx;

DROP TABLE IF EXISTS planned_spending_dismissed_matches;

ALTER TABLE planned_spending
    DROP COLUMN IF EXISTS matched_transaction_id,
    DROP COLUMN IF EXISTS resolved_at;
