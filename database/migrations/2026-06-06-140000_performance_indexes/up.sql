CREATE INDEX IF NOT EXISTS idx_transaction_data_active_date_id
    ON transaction_data (transaction_date DESC, id DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_data_active_spending
    ON transaction_data (category_id, transaction_date DESC)
    WHERE deleted_at IS NULL AND amount < 0;

CREATE INDEX IF NOT EXISTS idx_statement_active_date_id
    ON statement (date DESC, id DESC)
    WHERE deleted_at IS NULL;
