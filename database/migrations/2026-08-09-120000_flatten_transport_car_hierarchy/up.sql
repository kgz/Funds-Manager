-- Flatten Transport > Car > * to two-level Transport > * (OD model).
-- Car was an intermediate parent from the 2026-06 category rejig.

BEGIN;

UPDATE transaction_data td
SET category_id = servicing.id
FROM categories car, categories servicing
WHERE td.deleted_at IS NULL
  AND car.name = 'Car'
  AND car.deleted_at IS NULL
  AND servicing.name = 'Car servicing'
  AND servicing.deleted_at IS NULL
  AND td.category_id = car.id;

UPDATE transaction_data td
SET category_id = servicing.id
FROM categories transport, categories servicing
WHERE td.deleted_at IS NULL
  AND transport.name = 'Transport'
  AND transport.parent_category_id IS NULL
  AND transport.deleted_at IS NULL
  AND servicing.name = 'Car servicing'
  AND servicing.deleted_at IS NULL
  AND td.category_id = transport.id;

UPDATE planned_spending ps
SET category_id = servicing.id
FROM categories car, categories servicing
WHERE car.name = 'Car'
  AND car.deleted_at IS NULL
  AND servicing.name = 'Car servicing'
  AND servicing.deleted_at IS NULL
  AND ps.category_id = car.id;

UPDATE categories child
SET parent_category_id = transport.id,
    sort_order = CASE child.name
        WHEN 'Fuel' THEN 0
        WHEN 'Car insurance' THEN 1
        WHEN 'Car registration' THEN 2
        WHEN 'Car servicing' THEN 3
        WHEN 'Car loan repayment' THEN 4
        ELSE child.sort_order
    END
FROM categories car, categories transport
WHERE child.parent_category_id = car.id
  AND child.deleted_at IS NULL
  AND car.name = 'Car'
  AND car.deleted_at IS NULL
  AND transport.name = 'Transport'
  AND transport.parent_category_id IS NULL
  AND transport.deleted_at IS NULL;

UPDATE categories pt
SET sort_order = 5
FROM categories transport
WHERE pt.name = 'Public transport'
  AND pt.deleted_at IS NULL
  AND transport.name = 'Transport'
  AND transport.parent_category_id IS NULL
  AND transport.deleted_at IS NULL
  AND pt.parent_category_id = transport.id;

DELETE FROM category_lender_exclusions cle
USING categories car
WHERE cle.category_id = car.id
  AND car.name = 'Car'
  AND car.deleted_at IS NULL;

DELETE FROM category_lender_mappings clm
USING categories car
WHERE clm.category_id = car.id
  AND car.name = 'Car'
  AND car.deleted_at IS NULL;

UPDATE categories car
SET deleted_at = NOW()
FROM categories transport
WHERE car.name = 'Car'
  AND car.deleted_at IS NULL
  AND transport.name = 'Transport'
  AND transport.parent_category_id IS NULL
  AND transport.deleted_at IS NULL
  AND car.parent_category_id = transport.id;

COMMIT;
