# Auto-Categorization

## Purpose
Predicts transaction categories from description text using mapping rules and learned history.

## Requirements

### Requirement: CategoryPredictor
The system SHALL provide `CategoryPredictor::load_from_db()` which loads mapping rules and a learned description map, and `predict(description)` which returns `Option<i32>` category id.

#### Scenario: Load from database
- **WHEN** predictor is loaded
- **THEN** it contains all valid mapping rules and learned keys derived from categorized transactions

### Requirement: Prediction priority
`predict` SHALL evaluate in order: (1) category mapping rules by priority, (2) learned description variants. First match wins.

#### Scenario: Mapping beats learned
- **WHEN** both a mapping rule and a learned key match the same description
- **THEN** the mapping rule's category is returned

#### Scenario: No match
- **WHEN** no rule or learned key matches
- **THEN** `None` is returned and `category_id` remains null on import

### Requirement: Description normalization
Learned matching SHALL normalize descriptions by trimming and lowercasing before variant generation.

#### Scenario: Case insensitive learned match
- **WHEN** a historical transaction was categorized with description `"  BP Fuel  "`
- **THEN** `"bp fuel"` variants can match future `"BP FUEL"` descriptions

### Requirement: Learned description variants
The system SHALL build learned keys by stripping trailing reference tokens from normalized descriptions. A trailing token is a reference if it is 8+ alphanumeric/`_`/`-` chars, or is all digits with length 6–7 or 9+.

#### Scenario: Strip reference suffix
- **WHEN** description normalizes to `"woolworths 12345678"`
- **THEN** variants include `"woolworths 12345678"` and `"woolworths"` (if suffix qualifies)

#### Scenario: Minimum word count
- **WHEN** stripping would leave fewer than 3 words and a reference token is removed
- **THEN** stripping stops at the 3-word minimum

### Requirement: Learned tally
Learned keys SHALL map to the most frequently assigned `category_id` among historical non-deleted transactions with non-null `category_id`.

#### Scenario: Majority category wins
- **WHEN** `"coles"` was categorized as Groceries 10 times and Transport 2 times
- **THEN** learned key `"coles"` maps to Groceries

### Requirement: Apply on import
PDF import SHALL call `CategoryPredictor::predict` for each parsed transaction before insert.

#### Scenario: Import with predictor
- **WHEN** a transaction description matches a rule or learned key
- **THEN** `category_id` is set on insert

### Requirement: Recategorize uncategorized
`recategorize_uncategorized_transactions` SHALL re-run the predictor on rows where `category_id IS NULL` and `deleted_at IS NULL`.

#### Scenario: Bulk update count
- **WHEN** recategorize runs and 5 transactions receive categories
- **THEN** the function returns `Ok(5)`

### Requirement: tktax is exploratory only
The `category-predict-cli` crate using `tktax-transaction` and `tktax-transaction-category` SHALL remain a standalone CLI for experimentation. It MUST NOT be wired into the main import or API flow.

#### Scenario: Production path uses CategoryPredictor
- **WHEN** a statement PDF is uploaded via the API
- **THEN** categorization uses `CategoryPredictor`, not tktax
