CREATE TABLE broker_report_snapshots (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    as_at DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    account_id BIGINT REFERENCES financial_accounts (id) ON DELETE SET NULL,
    rate_buffer_bps INTEGER NOT NULL DEFAULT 300,
    payload TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT broker_report_snapshots_date_order CHECK (start_date <= end_date)
);

CREATE INDEX broker_report_snapshots_active_idx
    ON broker_report_snapshots (created_at DESC)
    WHERE deleted_at IS NULL;
