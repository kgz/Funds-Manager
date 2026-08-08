## ADDED Requirements

### Requirement: Repeat payments page shell

The repeat payments route SHALL use the OD flat page header pattern: title "Repeat payments", subtitle describing detected recurring debits and credits, and header actions for filters.

#### Scenario: User opens repeat payments

- **WHEN** the user navigates to `/recurring`
- **THEN** the page displays a sticky flat header with title and subtitle
- **AND** filter controls appear in the header actions area

### Requirement: Repeat payments filters

The page SHALL provide account filter, view mode segmented control (`By pattern` / `By category`), and minimum occurrences selector (values 3–6).

#### Scenario: User switches view mode

- **WHEN** the user selects `By category`
- **THEN** rows are grouped under expandable category sections
- **WHEN** the user selects `By pattern`
- **THEN** a flat list of detected patterns is shown

### Requirement: Repeat payments summary KPIs

When spending or income patterns exist, the page SHALL show estimated monthly spending and/or estimated monthly income summary figures using semantic danger/success colours.

#### Scenario: Patterns detected

- **WHEN** the API returns expense patterns
- **THEN** estimated monthly spending is displayed with danger styling
- **WHEN** the API returns income patterns
- **THEN** estimated monthly income is displayed with success styling

### Requirement: Repeat payments table

The table SHALL list detected patterns with description, category, frequency, typical amount, amount range, last seen, match score, and monthly estimate. Amounts SHALL use semantic money colours via shared tokens.

#### Scenario: Category group expanded

- **WHEN** the user expands a category section in grouped view
- **THEN** child rows show individual payment lines behind that category

### Requirement: Repeat payments help

The page SHALL provide access to help text explaining how repeat detection works without leaving the page.

#### Scenario: User requests help

- **WHEN** the user activates the help control
- **THEN** explanatory content about repeat detection is shown
