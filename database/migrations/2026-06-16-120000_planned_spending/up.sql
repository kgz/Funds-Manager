CREATE TABLE planned_spending (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    amount_cents INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    category_id BIGINT REFERENCES categories (id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT planned_spending_amount_nonzero CHECK (amount_cents <> 0),
    CONSTRAINT planned_spending_date_order CHECK (
        end_date IS NULL OR end_date >= start_date
    )
);

CREATE INDEX planned_spending_active_dates_idx
    ON planned_spending (start_date, end_date)
    WHERE deleted_at IS NULL;
