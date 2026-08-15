-- Best-effort rollback: restore Car as intermediate parent (transaction categories are not reverted).
-- Diesel wraps each migration in a transaction — do not add BEGIN/COMMIT here.

UPDATE categories car
SET deleted_at = NULL
FROM categories transport
WHERE car.name = 'Car'
  AND transport.name = 'Transport'
  AND transport.parent_category_id IS NULL
  AND transport.deleted_at IS NULL
  AND car.parent_category_id = transport.id;

UPDATE categories child
SET parent_category_id = car.id,
    sort_order = CASE child.name
        WHEN 'Fuel' THEN 0
        WHEN 'Car insurance' THEN 1
        WHEN 'Car registration' THEN 2
        WHEN 'Car servicing' THEN 3
        WHEN 'Car loan repayment' THEN 4
        ELSE child.sort_order
    END
FROM categories car, categories transport
WHERE child.name IN (
    'Fuel',
    'Car insurance',
    'Car registration',
    'Car servicing',
    'Car loan repayment'
)
  AND child.deleted_at IS NULL
  AND car.name = 'Car'
  AND car.deleted_at IS NULL
  AND transport.name = 'Transport'
  AND transport.parent_category_id IS NULL
  AND transport.deleted_at IS NULL
  AND child.parent_category_id = transport.id;

UPDATE categories pt
SET sort_order = 1
FROM categories transport
WHERE pt.name = 'Public transport'
  AND pt.deleted_at IS NULL
  AND transport.name = 'Transport'
  AND transport.parent_category_id IS NULL
  AND transport.deleted_at IS NULL
  AND pt.parent_category_id = transport.id;
