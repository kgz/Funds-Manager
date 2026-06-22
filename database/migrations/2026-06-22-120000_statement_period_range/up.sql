ALTER TABLE statement
    ADD COLUMN IF NOT EXISTS period_start DATE,
    ADD COLUMN IF NOT EXISTS period_end DATE;

UPDATE statement s
SET
    period_start = COALESCE(
        (
            SELECT MIN(t.transaction_date::date)
            FROM transaction_data t
            WHERE t.statement_id = s.id
              AND t.deleted_at IS NULL
        ),
        date_trunc('month', s.date)::date
    ),
    period_end = COALESCE(
        (
            SELECT MAX(t.transaction_date::date)
            FROM transaction_data t
            WHERE t.statement_id = s.id
              AND t.deleted_at IS NULL
        ),
        s.date
    )
WHERE s.period_start IS NULL OR s.period_end IS NULL;
