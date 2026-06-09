CREATE TABLE financial_accounts (
    id BIGSERIAL PRIMARY KEY,
    bank_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    account_number VARCHAR(25) NOT NULL,
    parser_name VARCHAR(50) NOT NULL,
    account_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE UNIQUE INDEX financial_accounts_parser_account_active_idx
    ON financial_accounts (parser_name, account_number)
    WHERE deleted_at IS NULL;

ALTER TABLE statement
    ADD COLUMN financial_account_id BIGINT REFERENCES financial_accounts (id);

INSERT INTO financial_accounts (bank_name, display_name, account_number, parser_name, created_at)
SELECT
    'Heritage',
    'Heritage ' || RIGHT(s.account_id, 4),
    s.account_id,
    'heritage',
    MIN(s.created_at)
FROM statement s
GROUP BY s.account_id;

UPDATE statement s
SET financial_account_id = fa.id
FROM financial_accounts fa
WHERE fa.account_number = s.account_id
  AND fa.parser_name = 'heritage';
