## ADDED Requirements

### Requirement: Projection summary rail
The Future Predictions toolbar SHALL show a compact summary with projected end balance as the primary figure and starting balance plus monthly net as secondary detail when baseline data is available.

#### Scenario: Baseline loaded
- **WHEN** baseline metadata and chart points are available
- **THEN** the toolbar shows projected end, starting balance, and monthly net estimate

### Requirement: Warm-paper chart chrome
The projected balance chart SHALL use light-theme grid/axis strokes and the shared warm-paper chart colour palette for baseline, scenarios, and goals.

#### Scenario: Chart renders on light paper
- **WHEN** the projected balance chart is shown
- **THEN** axes and grid are muted paper colours (not white-on-dark leftovers) and the baseline stroke uses the shared chart palette
