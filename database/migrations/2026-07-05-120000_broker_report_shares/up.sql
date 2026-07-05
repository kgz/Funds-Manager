CREATE TABLE broker_report_shares (
    id BIGSERIAL PRIMARY KEY,
    snapshot_id BIGINT NOT NULL REFERENCES broker_report_snapshots (id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    redaction TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP
);

CREATE INDEX broker_report_shares_snapshot_idx
    ON broker_report_shares (snapshot_id)
    WHERE revoked_at IS NULL;

CREATE TABLE broker_report_annotations (
    id BIGSERIAL PRIMARY KEY,
    snapshot_id BIGINT NOT NULL REFERENCES broker_report_snapshots (id) ON DELETE CASCADE,
    transaction_id BIGINT NOT NULL REFERENCES transaction_data (id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    exclude_from_analysis BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX broker_report_annotations_snapshot_idx
    ON broker_report_annotations (snapshot_id)
    WHERE deleted_at IS NULL;
