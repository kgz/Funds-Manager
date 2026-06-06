-- Create the main categories table with support for subcategories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- Ensure category names are unique
    description TEXT NULL,             -- Optional description
    parent_category_id BIGINT UNSIGNED NULL, -- Reference to the parent category's ID
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    -- Foreign key constraint for the parent-child relationship
    FOREIGN KEY (parent_category_id) REFERENCES categories(id) ON DELETE SET NULL
    -- ON DELETE SET NULL: If a parent category is deleted, its children become top-level categories.
    -- Alternatively, use ON DELETE CASCADE if you want subcategories to be deleted when the parent is.
);

-- Create the join table to link transactions and categories (remains the same)
CREATE TABLE IF NOT EXISTS transaction_categories (
    id SERIAL PRIMARY KEY,
    transaction_id BIGINT UNSIGNED NOT NULL, -- Matches the type in transaction_data
    category_id BIGINT UNSIGNED NOT NULL,    -- Matches the type in categories
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints to ensure data integrity
    FOREIGN KEY (transaction_id) REFERENCES transaction_data(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,

    -- Ensure a transaction isn't linked to the same category multiple times
    UNIQUE (transaction_id, category_id)
);
