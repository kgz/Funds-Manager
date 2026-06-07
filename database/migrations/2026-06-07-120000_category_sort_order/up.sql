ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY parent_category_id
            ORDER BY created_at ASC, id ASC
        ) - 1 AS new_sort_order
    FROM categories
)
UPDATE categories AS c
SET sort_order = ranked.new_sort_order
FROM ranked
WHERE c.id = ranked.id;
