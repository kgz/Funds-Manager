# Categories

## Purpose
Hierarchical spending/income categories with colours. Used to label transactions.

## Requirements

### Requirement: Category fields
A category SHALL have: unique `name`, optional `description`, optional `parent_category_id` (self-referential), optional `colour` (7-char hex), `created_at`, and optional `deleted_at`.

#### Scenario: Hierarchy
- **WHEN** `parent_category_id` is set
- **THEN** the category is a subcategory of the referenced parent

#### Scenario: Parent deleted
- **WHEN** a parent category is deleted
- **THEN** children's `parent_category_id` is set to NULL (DB `ON DELETE SET NULL`)

### Requirement: Create category
`POST /api/categories` SHALL accept `name`, optional `description`, optional `parent_category_id`, optional `colour`. If `colour` is omitted, the server MUST assign a random HSL-derived hex colour.

#### Scenario: Auto colour
- **WHEN** a category is created without `colour`
- **THEN** the server generates a `#rrggbb` hex value

### Requirement: List and retrieve
`GET /api/categories` SHALL list categories. Query `include_deleted=true` includes soft-deleted rows. `GET /api/categories/{id}` returns one category with the same `include_deleted` option.

#### Scenario: Default list excludes deleted
- **WHEN** `GET /api/categories` is called without `include_deleted`
- **THEN** only active categories are returned

### Requirement: Update category
`PUT /api/categories/{id}` SHALL support partial updates to `name`, `description`, `parent_category_id`, and `colour`.

#### Scenario: Partial update
- **WHEN** only `name` is provided in the body
- **THEN** other fields remain unchanged

### Requirement: Soft-delete and restore
`DELETE /api/categories/{id}` SHALL soft-delete (set `deleted_at`). `PUT /api/categories/{id}/undelete` SHALL clear `deleted_at`.

#### Scenario: Restore deleted category
- **WHEN** undelete is called on a soft-deleted category
- **THEN** the category becomes active again

### Requirement: Unique names
Category names MUST be unique at the database level.

#### Scenario: Duplicate name
- **WHEN** a create or update violates the unique name constraint
- **THEN** the API returns an internal server error (current behavior)
