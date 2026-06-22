-- One-off category restructure: capitalise, hierarchy, finer broker-friendly subs, recategorise txns.
-- Restore from: database/backups/funds-2026-06-21-pre-category-rejig.dump

BEGIN;

-- Merge duplicate food → Food (id 3)
UPDATE transaction_data SET category_id = 3 WHERE category_id = 18 AND deleted_at IS NULL;
UPDATE categories SET deleted_at = NOW() WHERE id = 18;

-- Capitalise / rename in place
UPDATE categories SET name = 'Rent', sort_order = 0 WHERE id = 1;
UPDATE categories SET name = 'Gardening', sort_order = 1 WHERE id = 2;
UPDATE categories SET name = 'Groceries', sort_order = 0 WHERE id = 3;
UPDATE categories SET name = 'Car', sort_order = 0 WHERE id = 4;
UPDATE categories SET name = 'Hobbies', sort_order = 0 WHERE id = 5;
UPDATE categories SET name = 'Home loan', sort_order = 0 WHERE id = 6;
UPDATE categories SET name = 'Health', sort_order = 0 WHERE id = 7;
UPDATE categories SET name = 'Utilities', sort_order = 0 WHERE id = 8;
UPDATE categories SET name = 'Public transport', sort_order = 1 WHERE id = 9;
UPDATE categories SET name = 'Pets', sort_order = 0 WHERE id = 10;
UPDATE categories SET name = 'Salary', sort_order = 0 WHERE id = 11;
UPDATE categories SET name = 'Gifts', sort_order = 0 WHERE id = 12;
UPDATE categories SET name = 'Clothing', sort_order = 0 WHERE id = 13;
UPDATE categories SET name = 'Miscellaneous', sort_order = 1 WHERE id = 14;
UPDATE categories SET name = 'Other investments', sort_order = 0 WHERE id = 15;
UPDATE categories SET name = 'General', sort_order = 2 WHERE id = 16;
UPDATE categories SET name = 'Housing', sort_order = 0, parent_category_id = NULL WHERE id = 17;
UPDATE categories SET name = 'Fuel', sort_order = 0 WHERE id = 20;
UPDATE categories SET name = 'Car insurance', sort_order = 1 WHERE id = 21;

-- Top-level parents (new)
INSERT INTO categories (name, colour, sort_order, created_at) VALUES
    ('Transport', '#0ea5e9', 4, NOW()),
    ('Debt', '#64748b', 5, NOW()),
    ('Income', '#22c55e', 11, NOW()),
    ('Investments', '#06b6d4', 12, NOW()),
    ('Other', '#94a3b8', 13, NOW()),
    ('Healthcare', '#ec4899', 6, NOW()),
    ('Recreation', '#f97316', 7, NOW()),
    ('Clothing & personal', '#a855f7', 8, NOW());

-- Reparent existing under new parents
UPDATE categories SET parent_category_id = 17, sort_order = 0 WHERE id = 1;  -- Rent → Housing
UPDATE categories SET parent_category_id = 17, sort_order = 1 WHERE id = 2;  -- Gardening → Housing
UPDATE categories SET parent_category_id = (SELECT id FROM categories WHERE name = 'Transport' AND deleted_at IS NULL LIMIT 1), sort_order = 0 WHERE id = 4;
UPDATE categories SET parent_category_id = (SELECT id FROM categories WHERE name = 'Transport' AND deleted_at IS NULL LIMIT 1), sort_order = 1 WHERE id = 9;
UPDATE categories SET parent_category_id = 4, sort_order = 0 WHERE id = 20;
UPDATE categories SET parent_category_id = 4, sort_order = 1 WHERE id = 21;
UPDATE categories SET parent_category_id = (SELECT id FROM categories WHERE name = 'Debt' AND deleted_at IS NULL LIMIT 1) WHERE id = 6;
UPDATE categories SET parent_category_id = (SELECT id FROM categories WHERE name = 'Income' AND deleted_at IS NULL LIMIT 1) WHERE id = 11;
UPDATE categories SET parent_category_id = (SELECT id FROM categories WHERE name = 'Investments' AND deleted_at IS NULL LIMIT 1) WHERE id = 15;
UPDATE categories SET parent_category_id = (SELECT id FROM categories WHERE name = 'Other' AND deleted_at IS NULL LIMIT 1), sort_order = 0 WHERE id = 12;
UPDATE categories SET parent_category_id = (SELECT id FROM categories WHERE name = 'Other' AND deleted_at IS NULL LIMIT 1), sort_order = 1 WHERE id = 14;
UPDATE categories SET parent_category_id = (SELECT id FROM categories WHERE name = 'Other' AND deleted_at IS NULL LIMIT 1), sort_order = 2 WHERE id = 16;
UPDATE categories SET parent_category_id = (SELECT id FROM categories WHERE name = 'Healthcare' AND deleted_at IS NULL LIMIT 1) WHERE id = 7;
UPDATE categories SET parent_category_id = (SELECT id FROM categories WHERE name = 'Recreation' AND deleted_at IS NULL LIMIT 1) WHERE id = 5;
UPDATE categories SET parent_category_id = (SELECT id FROM categories WHERE name = 'Clothing & personal' AND deleted_at IS NULL LIMIT 1) WHERE id = 13;
UPDATE categories SET parent_category_id = NULL, sort_order = 3 WHERE id = 3;   -- Groceries top-level
UPDATE categories SET parent_category_id = NULL, sort_order = 6 WHERE id = 8;   -- Utilities top-level
UPDATE categories SET parent_category_id = NULL, sort_order = 9 WHERE id = 10;  -- Pets top-level

-- New Car subcategories
INSERT INTO categories (name, parent_category_id, colour, sort_order, created_at)
SELECT 'Car registration', 4, '#b3b82a', 2, NOW()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Car registration' AND deleted_at IS NULL);

INSERT INTO categories (name, parent_category_id, colour, sort_order, created_at)
SELECT 'Car servicing', 4, '#9ca32a', 3, NOW()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Car servicing' AND deleted_at IS NULL);

INSERT INTO categories (name, parent_category_id, colour, sort_order, created_at)
SELECT 'Car loan repayment', 4, '#8a9120', 4, NOW()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Car loan repayment' AND deleted_at IS NULL);

-- New Pets subcategories
INSERT INTO categories (name, parent_category_id, colour, sort_order, created_at)
SELECT 'Pet food', 10, '#372ec5', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Pet food' AND deleted_at IS NULL);

INSERT INTO categories (name, parent_category_id, colour, sort_order, created_at)
SELECT 'Pet insurance', 10, '#4f3ed4', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Pet insurance' AND deleted_at IS NULL);

INSERT INTO categories (name, parent_category_id, colour, sort_order, created_at)
SELECT 'Pet vet', 10, '#5b4ee0', 2, NOW()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Pet vet' AND deleted_at IS NULL);

-- Recategorise Car bucket (was id 4 parent with mixed txns)
UPDATE transaction_data SET category_id = (SELECT id FROM categories WHERE name = 'Car insurance' AND deleted_at IS NULL LIMIT 1)
WHERE category_id = 4 AND deleted_at IS NULL
  AND (description ILIKE '%shannons%' OR description ILIKE '%insurance%');

UPDATE transaction_data SET category_id = (SELECT id FROM categories WHERE name = 'Car loan repayment' AND deleted_at IS NULL LIMIT 1)
WHERE category_id = 4 AND deleted_at IS NULL
  AND (description ILIKE '%bmw%finance%' OR description ILIKE '%loan #%');

UPDATE transaction_data SET category_id = (SELECT id FROM categories WHERE name = 'Car registration' AND deleted_at IS NULL LIMIT 1)
WHERE category_id = 4 AND deleted_at IS NULL
  AND description ILIKE '%MBAUDPayments%';

UPDATE transaction_data SET category_id = (SELECT id FROM categories WHERE name = 'Fuel' AND deleted_at IS NULL LIMIT 1)
WHERE category_id = 4 AND deleted_at IS NULL
  AND (
    description ILIKE '%7-ELEVEN%'
    OR description ILIKE '%UNITED %'
    OR description ILIKE '%AMPOL%'
    OR description ILIKE '%SHELL%'
    OR description ILIKE '%BP %'
  );

UPDATE transaction_data SET category_id = (SELECT id FROM categories WHERE name = 'Car servicing' AND deleted_at IS NULL LIMIT 1)
WHERE category_id = 4 AND deleted_at IS NULL
  AND (
    description ILIKE '%BATTERY%'
    OR description ILIKE '%WIPER%'
    OR description ILIKE '%COASTLINEBMW%'
    OR description ILIKE '%MRTP%'
    OR description ILIKE '%TRANSPORTMAINRDS%'
  );

-- Remaining on Car parent → Fuel if looks like fuel merchant, else servicing
UPDATE transaction_data SET category_id = (SELECT id FROM categories WHERE name = 'Fuel' AND deleted_at IS NULL LIMIT 1)
WHERE category_id = 4 AND deleted_at IS NULL
  AND description ILIKE '%PURCHASE%';

-- Recategorise Pets bucket
UPDATE transaction_data SET category_id = (SELECT id FROM categories WHERE name = 'Pet insurance' AND deleted_at IS NULL LIMIT 1)
WHERE category_id = 10 AND deleted_at IS NULL
  AND description ILIKE '%pet insurance%';

UPDATE transaction_data SET category_id = (SELECT id FROM categories WHERE name = 'Pet food' AND deleted_at IS NULL LIMIT 1)
WHERE category_id = 10 AND deleted_at IS NULL
  AND description ILIKE '%petbarn%';

UPDATE transaction_data SET category_id = (SELECT id FROM categories WHERE name = 'Pet vet' AND deleted_at IS NULL LIMIT 1)
WHERE category_id = 10 AND deleted_at IS NULL
  AND (description ILIKE '%JR & ASSOCIATES%' OR description ILIKE '%vet%');

-- Auto rules for future imports
INSERT INTO category_mappings (pattern, match_type, category_id, priority, created_at, updated_at)
SELECT 'pet insurance', 'regex', (SELECT id FROM categories WHERE name = 'Pet insurance' AND deleted_at IS NULL LIMIT 1), 100, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM category_mappings WHERE pattern = 'pet insurance');

INSERT INTO category_mappings (pattern, match_type, category_id, priority, created_at, updated_at)
SELECT 'petbarn', 'regex', (SELECT id FROM categories WHERE name = 'Pet food' AND deleted_at IS NULL LIMIT 1), 100, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM category_mappings WHERE pattern = 'petbarn');

INSERT INTO category_mappings (pattern, match_type, category_id, priority, created_at, updated_at)
SELECT 'shannons', 'regex', (SELECT id FROM categories WHERE name = 'Car insurance' AND deleted_at IS NULL LIMIT 1), 100, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM category_mappings WHERE pattern = 'shannons');

INSERT INTO category_mappings (pattern, match_type, category_id, priority, created_at, updated_at)
SELECT 'bmw.*finance', 'regex', (SELECT id FROM categories WHERE name = 'Car loan repayment' AND deleted_at IS NULL LIMIT 1), 100, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM category_mappings WHERE pattern = 'bmw.*finance');

INSERT INTO category_mappings (pattern, match_type, category_id, priority, created_at, updated_at)
SELECT 'mbaudpayments', 'regex', (SELECT id FROM categories WHERE name = 'Car registration' AND deleted_at IS NULL LIMIT 1), 90, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM category_mappings WHERE pattern = 'mbaudpayments');

INSERT INTO category_mappings (pattern, match_type, category_id, priority, created_at, updated_at)
SELECT 'woolworths', 'regex', (SELECT id FROM categories WHERE name = 'Groceries' AND deleted_at IS NULL LIMIT 1), 80, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM category_mappings WHERE pattern = 'woolworths');

INSERT INTO category_mappings (pattern, match_type, category_id, priority, created_at, updated_at)
SELECT 'coles', 'regex', (SELECT id FROM categories WHERE name = 'Groceries' AND deleted_at IS NULL LIMIT 1), 80, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM category_mappings WHERE pattern = 'coles');

COMMIT;
