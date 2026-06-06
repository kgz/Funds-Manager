-- Your SQL goes here
CREATE TABLE IF NOT EXISTS transaction_data (
	id SERIAL PRIMARY KEY,
	statement_id INT NOT NULL,
	category_id INT NULL, -- Added category_id, allowing NULL for now
	description TEXT NOT NULL,
	amount INT NOT NULL,
	transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	deleted_at TIMESTAMP NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	status VARCHAR(50) NOT NULL

);

-- Optional: Add a foreign key constraint if a 'categories' table exists
-- ALTER TABLE transaction_data
-- ADD CONSTRAINT fk_category
-- FOREIGN KEY (category_id) REFERENCES categories(id);
