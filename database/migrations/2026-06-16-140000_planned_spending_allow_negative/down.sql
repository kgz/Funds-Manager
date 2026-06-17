ALTER TABLE planned_spending
    DROP CONSTRAINT IF EXISTS planned_spending_amount_nonzero;

ALTER TABLE planned_spending
    ADD CONSTRAINT planned_spending_amount_positive CHECK (amount_cents > 0);
