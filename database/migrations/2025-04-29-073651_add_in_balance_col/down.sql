-- Remove the 'balance' column from the transaction_data table
ALTER TABLE transaction_data
DROP COLUMN balance;
-- This file should undo anything in `up.sql`
