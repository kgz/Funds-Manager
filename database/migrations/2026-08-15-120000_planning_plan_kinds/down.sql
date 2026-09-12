DROP INDEX IF EXISTS planned_spending_plan_kind_idx;

ALTER TABLE planned_spending
    DROP CONSTRAINT IF EXISTS planned_spending_repayment_nonneg,
    DROP CONSTRAINT IF EXISTS planned_spending_rate_bps_nonneg,
    DROP CONSTRAINT IF EXISTS planned_spending_plan_kind_check;

ALTER TABLE planned_spending
    DROP COLUMN IF EXISTS repayment_cents,
    DROP COLUMN IF EXISTS interest_rate_bps,
    DROP COLUMN IF EXISTS new_liability_name,
    DROP COLUMN IF EXISTS financial_account_id,
    DROP COLUMN IF EXISTS liability_id,
    DROP COLUMN IF EXISTS plan_kind;
