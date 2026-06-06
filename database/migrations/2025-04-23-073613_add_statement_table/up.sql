-- Your SQL goes here
CREATE TABLE IF NOT EXISTS statement (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    account_id VARCHAR(25) NOT NULL,
    opening_balance INT NOT NULL DEFAULT 0,
    closing_balance INT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
