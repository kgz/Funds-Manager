## Why

`App.css` loads an external Freepik texture. It's slow, inconsistent offline, and reduces chart contrast.

## What Changes

- Replace external image background with CSS gradient or subtle local pattern
- Ensure dashboard cards remain readable

## Capabilities

### Modified Capabilities

- `frontend`: app shell background

## Impact

- `frontend/src/App.css`
