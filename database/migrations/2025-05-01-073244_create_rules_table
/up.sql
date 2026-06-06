-- Your SQL goes here
-- /mnt/dev/my_funds/database/migrations/YYYYMMDDHHMMSS_create_category_mappings/up.sql
-- Your SQL goes here
CREATE TABLE category_mappings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pattern VARCHAR(255) NOT NULL,
    -- 'exact' for direct string comparison, 'regex' for regular expression matching
    match_type ENUM('exact', 'regex') NOT NULL DEFAULT 'exact',
    -- Foreign key to the categories table
    category_id BIGINT UNSIGNED NOT NULL,
    -- Optional: Higher priority rules get checked first
    priority INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    -- Add an index for faster pattern lookups if needed, especially for exact matches
    INDEX idx_category_mappings_pattern (pattern),
    -- Index for priority sorting
    INDEX idx_category_mappings_priority (priority)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add a unique constraint if you don't want duplicate patterns for the same category and type
-- ALTER TABLE category_mappings ADD CONSTRAINT uq_category_mappings_pattern_type_category UNIQUE (pattern, match_type, category_id);

