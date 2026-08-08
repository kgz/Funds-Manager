# Funds Manager visual system

The exploration preserves the source product’s modern-minimal, warm-paper fintech system: quiet white surfaces, crisp dividers, IBM Plex typography, tabular financial figures, and blue used only for active and focused states.

```css
:root {
  --bg:      oklch(99% 0.002 240);
  --surface: oklch(100% 0 0);
  --fg:      oklch(18% 0.012 250);
  --muted:   oklch(54% 0.012 250);
  --border:  oklch(92% 0.005 250);
  --accent:  oklch(58% 0.18 255);

  --font-display: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-body:    'IBM Plex Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-mono:    'IBM Plex Mono', ui-monospace, monospace;
}
```

- Keep surfaces flat and bordered; radius stays at 6–8px.
- Use uppercase micro-labels for navigation groups and KPI labels.
- Keep money and counts in IBM Plex Mono with tabular numerals.
- Reserve blue for selected navigation and keyboard focus.
- Prefer compact 32–40px controls, while mobile navigation controls reach 44px.
