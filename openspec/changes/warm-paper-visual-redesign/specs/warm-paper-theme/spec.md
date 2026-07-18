## ADDED Requirements

### Requirement: Warm-paper design tokens
The SPA SHALL define shared design tokens for background, surface, foreground, muted text, border, accent, success, danger, warning, radius, and typography (IBM Plex Sans + IBM Plex Mono or equivalent wired fonts). Tokens SHALL be available as CSS custom properties used by shared layout chrome.

#### Scenario: Tokenised shell
- **WHEN** the app shell renders
- **THEN** background and text colours come from warm-paper tokens rather than hard-coded dark glass utilities

### Requirement: Warm-paper product chrome
Authenticated product chrome (sidebar surface, main canvas, page headers, cards/panels, buttons, inputs, tables, modals/drawers, empty/error states) SHALL use warm-paper surfaces: near-white paper background, white/elevated panels, hairline borders, dark ink text, and a single restrained blue accent. The shell SHALL NOT present the previous dark slate gradient / frosted-glass look as the default.

#### Scenario: Primary route appearance
- **WHEN** the user opens dashboard, transactions, statements, categories, breakdown, or serviceability
- **THEN** page chrome matches the warm-paper visual language (paper surfaces, ink text, blue accent)

### Requirement: Light chart theme
Recharts axes, grids, tick labels, and tooltips on product charts SHALL use colours tuned for light paper surfaces (subtle grid, readable dark ticks, opaque light tooltips).

#### Scenario: Grid on paper
- **WHEN** a chart with CartesianGrid renders on the dashboard
- **THEN** grid lines are subtle against the paper/panel background and do not overpower series

### Requirement: CSS-only shell background
The application shell background SHALL use CSS-only warm-paper styling with no external decorative image URLs.

#### Scenario: No external backdrop assets
- **WHEN** the app loads
- **THEN** the shell background does not fetch external texture/image URLs for theming

### Requirement: Visual reference
Implementation SHALL treat the Open Design **Funds Manager Redesign** prototypes as the visual source of truth for spacing, typography weight, panel chrome, and accent usage, while remaining in the React + Tailwind stack.

#### Scenario: Prototype alignment
- **WHEN** comparing the live dashboard shell to the OD redesign prototype
- **THEN** surfaces, type, borders, and accent read as the same design system (not a pixel-perfect HTML clone)
