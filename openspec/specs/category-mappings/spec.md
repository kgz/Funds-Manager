# Category Mappings

## Purpose
Rules that map transaction description patterns to categories. Evaluated by `CategoryPredictor` before learned-description matching.

## Requirements

### Requirement: Mapping fields
A mapping SHALL have: `pattern`, `match_type` (`exact` or `regex`), `category_id`, `priority`, `created_at`, `updated_at`. `category_id` references `categories` with CASCADE on category delete.

#### Scenario: Priority ordering
- **WHEN** mappings are loaded for prediction
- **THEN** they are ordered by `priority DESC`, then `id ASC`

### Requirement: Exact match type
`exact` mappings SHALL match when the transaction description equals the pattern case-insensitively (full string).

#### Scenario: Exact match hit
- **WHEN** description `"WOOLWORTHS"` and pattern `"woolworths"` with type `exact`
- **THEN** the mapping matches

### Requirement: Regex match type
`regex` mappings SHALL match when `Regex::is_match(description)` succeeds. Invalid regex patterns MUST be skipped silently at load time.

#### Scenario: Regex match hit
- **WHEN** description contains text matching the compiled regex
- **THEN** the mapping matches

#### Scenario: Invalid regex skipped
- **WHEN** a mapping's pattern fails to compile as regex
- **THEN** that mapping is excluded from the rule set

### Requirement: List mappings
`GET /api/category_mappings` SHALL return all mappings ordered by priority descending.

#### Scenario: List all
- **WHEN** client requests all mappings
- **THEN** every mapping row is returned in priority order

### Requirement: Create mapping
`POST /api/category_mappings` SHALL create a new mapping from the request body.

#### Scenario: Create new rule
- **WHEN** a valid mapping payload is posted
- **THEN** a new row is inserted and returned

### Requirement: Get mappings by category
`GET /api/category_mappings/{id}` SHALL return mappings filtered by **category_id** (not mapping id). This is the registered route behavior.

#### Scenario: Filter by category
- **WHEN** `GET /api/category_mappings/5` is called
- **THEN** mappings where `category_id = 5` are returned

### Requirement: Update and delete by mapping id
`PUT /api/category_mappings/{id}` and `DELETE /api/category_mappings/{id}` SHALL operate on the mapping's own `id`.

#### Scenario: Delete mapping
- **WHEN** `DELETE /api/category_mappings/{id}` is called with a valid mapping id
- **THEN** that mapping row is removed

### Requirement: Valid category only
Mappings pointing to deleted or missing categories MUST be excluded from `CategoryPredictor` rule loading.

#### Scenario: Deleted category mapping ignored
- **WHEN** a mapping references a soft-deleted category
- **THEN** it is not used during prediction
