-- Your SQL goes here

-- Add the 'balance' column to the transaction_data table
ALTER TABLE transaction_data
ADD COLUMN balance INT NOT NULL DEFAULT 0;

-- Update all existing rows to set the default balance to 0
UPDATE transaction_data
SET balance = 0
WHERE balance IS NULL;
