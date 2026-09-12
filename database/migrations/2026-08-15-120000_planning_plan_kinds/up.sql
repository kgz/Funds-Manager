-- Planning hub (#143): plan kinds + loan event fields on planned_spending.

ALTER TABLE planned_spending
    ADD COLUMN plan_kind VARCHAR(32) NOT NULL DEFAULT 'cashflow',
    ADD COLUMN liability_id BIGINT REFERENCES liabilities (id) ON DELETE SET NULL,
    ADD COLUMN financial_account_id BIGINT REFERENCES financial_accounts (id) ON DELETE SET NULL,
    ADD COLUMN new_liability_name VARCHAR(200),
    ADD COLUMN interest_rate_bps INTEGER,
    ADD COLUMN repayment_cents BIGINT;

ALTER TABLE planned_spending
    ADD CONSTRAINT planned_spending_plan_kind_check CHECK (
        plan_kind IN (
            'cashflow',
            'loan_redraw',
            'loan_refinance',
            'loan_repayment_change'
        )
    );

ALTER TABLE planned_spending
    ADD CONSTRAINT planned_spending_rate_bps_nonneg CHECK (
        interest_rate_bps IS NULL OR interest_rate_bps >= 0
    );

ALTER TABLE planned_spending
    ADD CONSTRAINT planned_spending_repayment_nonneg CHECK (
        repayment_cents IS NULL OR repayment_cents >= 0
    );

CREATE INDEX planned_spending_plan_kind_idx
    ON planned_spending (plan_kind)
    WHERE deleted_at IS NULL;
