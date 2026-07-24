ALTER TABLE planned_spending
    DROP CONSTRAINT IF EXISTS planned_spending_amount_positive;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'planned_spending_amount_nonzero'
    ) THEN
        ALTER TABLE planned_spending
            ADD CONSTRAINT planned_spending_amount_nonzero CHECK (amount_cents <> 0);
    END IF;
END $$;
