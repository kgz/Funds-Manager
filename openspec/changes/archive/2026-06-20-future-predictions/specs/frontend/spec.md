## ADDED Requirements

### Requirement: Future predictions page

The SPA SHALL provide `/predictions` showing a forward balance chart, baseline explanation, scenarios, and goals.

#### Scenario: Nav entry

- **WHEN** user views the sidebar
- **THEN** a link to **Future predictions** is visible under General

#### Scenario: Horizon selection

- **WHEN** user selects 3, 6, or 12 months forward or a custom end date
- **THEN** the chart and goal calculations use that horizon

### Requirement: Baseline forecast display

The page SHALL show a baseline projected balance line with plain-language summary text (no internal jargon such as "heuristic").

#### Scenario: Baseline inputs

- **WHEN** the page loads
- **THEN** the baseline incorporates current balance trend, planned spending in range, and repeat payment patterns available to the client

#### Scenario: Account filter

- **WHEN** a single account is selected in the global account filter
- **THEN** the baseline uses that account scope for balance and history

### Requirement: Scenario comparison

Users SHALL create named scenarios with one or more adjustment lines and compare selected scenarios against the baseline on the same chart.

#### Scenario: Add scenario

- **WHEN** user creates a scenario with adjustment lines
- **THEN** it is persisted and appears in the scenario list

#### Scenario: Toggle scenario on chart

- **WHEN** user enables a scenario for comparison
- **THEN** its projected line appears alongside the baseline

### Requirement: Savings goals

Users SHALL add goals with a target balance amount and target date.

#### Scenario: Goal gap

- **WHEN** a goal is saved
- **THEN** the UI shows projected balance at the target date, the gap to the target, and a suggested monthly amount to close the gap when the gap is positive

#### Scenario: Plain labels

- **WHEN** goal or scenario copy is shown
- **THEN** labels use everyday language (e.g. "Projected balance", "Shortfall", "Save about $X/month")
