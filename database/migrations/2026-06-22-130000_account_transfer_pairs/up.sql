CREATE TABLE account_transfer_pairs (
    id BIGSERIAL PRIMARY KEY,
    out_transaction_id BIGINT NOT NULL REFERENCES transaction_data (id) ON DELETE CASCADE,
    in_transaction_id BIGINT NOT NULL REFERENCES transaction_data (id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL DEFAULT 'suggested',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT account_transfer_pairs_out_in_distinct CHECK (out_transaction_id <> in_transaction_id),
    CONSTRAINT account_transfer_pairs_status_check CHECK (status IN ('suggested', 'confirmed', 'dismissed'))
);

CREATE UNIQUE INDEX idx_account_transfer_pairs_out_txn ON account_transfer_pairs (out_transaction_id);
CREATE UNIQUE INDEX idx_account_transfer_pairs_in_txn ON account_transfer_pairs (in_transaction_id);
CREATE INDEX idx_account_transfer_pairs_status ON account_transfer_pairs (status);
