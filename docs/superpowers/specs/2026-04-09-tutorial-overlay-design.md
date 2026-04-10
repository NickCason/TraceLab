# TraceLab Tutorial Overlay — Design Spec

**Date:** 2026-04-09  
**Status:** Approved  

---

## Overview

Add a guided tutorial overlay to TraceLab, triggered exclusively by a `?` button in the top bar. The tutorial walks users through the app's key features using a spotlight card system — the same approach used in CamForge — adapted for React.

No auto-launch. No localStorage suppression checkbox. The user opens it on demand.

---

## Architecture

### New files

```
src/components/tutorial/
  TutorialOverlay.jsx   — React portal component (engine + rendering)
  steps.js              — step definitions array
  tutorial.css          — animation keyframes only (pulse ring, card fade)
```

### Modified files

| File | Change |
|------|--------|
| `src/App.jsx` | Add `tutorialOpen` state; add `?` button in top bar; render `<TutorialOverlay>` |
| `src/components/GroupPanel.jsx` | Add `id` to OVERLAYS section header |
| `src/App.jsx` (chart pane buttons) | Add `id` to `+ Derived` and `+ Reference` buttons |
| Top bar buttons | Add `id` attributes to ~10 existing elements |

### What's inherited from CamForge unchanged

- Step shape: `{ target, title, desc, svg, prefer }`
- Backdrop spotlight trick: `box-shadow: 0 0 0 9999px rgba(0,0,0,0.55)` on a positioned div
- Card positioning with adaptive side-flipping when near viewport edge
- Pulse ring animation (two pseudo-element rings, staggered delay)
- Progress dots (pending / active / done states)
- Back / Next / Skip navigation buttons
- Keyboard nav: `ArrowLeft`, `ArrowRight`, `Enter`, `Escape`
- Window resize handler repositions backdrop + card

### What's different from CamForge

| Concern | CamForge | TraceLab |
|---------|----------|----------|
| Mounting | `document.body.appendChild` | `ReactDOM.createPortal(..., document.body)` |
| Styling | Separate CSS classes | Inline styles using `t` theme object; `tutorial.css` for keyframes only |
| Trigger | `tryAutoLaunch()` + `start()` | `?` button only — no auto-launch, no suppress checkbox |
| Panel expansion | `expandPanelIfNeeded()` | Not needed — TraceLab sidebar is always visible |
| Step file | Vanilla JS module | Same shape, new content for TraceLab features |

---

## Component & State Design

### App.jsx additions

```jsx
const [tutorialOpen, setTutorialOpen] = useState(false);
```

**`?` button placement:** Right side of top bar, immediately after `<ThemeToggle>`, before the existing divider. Styled as a circular icon button matching CamForge's `#btnTutorial` — 26×26px, cyan accent color.

```jsx
<ThemeToggle theme={theme} setTheme={setTheme} />
<button id="btn-tutorial" onClick={() => setTutorialOpen(true)} ...>?</button>
<div ... />  {/* existing divider */}
<ToolBtn ...>Δ Delta</ToolBtn>
```

**Render at bottom of return, outside all layout divs:**

```jsx
<TutorialOverlay open={tutorialOpen} onClose={() => setTutorialOpen(false)} t={t} theme={theme} />
```

### TutorialOverlay.jsx

**Props:** `open` (bool), `onClose` (fn), `t` (theme object), `theme` (string `"dark"|"light"`)

**Internal state:**
- `step` — current step index (0-based), resets to `0` each time `open` flips `true → false → true`

**Refs:** `backdropRef`, `pulseRef`, `cardRef` — used for imperative geometry positioning (same math as CamForge's `positionBackdrop`, `positionPulse`, `positionCard`)

**Effects:**
- `useEffect([open])` — attach/detach keyboard listener (`keydown`, capture phase); reset step to 0 on open
- `useEffect([open, step])` — reposition backdrop, pulse, card after render; reposition on window resize (attach/detach resize listener)

**Portal:** `ReactDOM.createPortal(<overlay JSX>, document.body)`

**DOM structure** (mirrors CamForge exactly):
```
div.tutorial-overlay  [fixed, inset 0, z-index 9000]
  div.tutorial-backdrop   [spotlight cutout via box-shadow]
  div.tutorial-pulse      [animated ring around target]
  div.tutorial-card       [coach card with arrow]
    div.tutorial-card-arrow
    step counter
    h3 title
    div.tutorial-diagram (svg)
    p description
    div.tutorial-nav
      progress dots
      Back button
      Next / Finish button
      Skip / Close link
```

**Styling approach:** All structural layout (position, size, border-radius, colors, fonts) via inline styles using `t.*` theme tokens. Only `tutorial.css` is imported, containing:
- `@keyframes tutorialPulse` — scale + opacity animation for pulse ring
- `.tutorial-card` transition classes (opacity + translateY for fade-in)
- `.tutorial-overlay.active` / `.tutorial-overlay.fade-out` transition

---

## Step List (17 steps)

| # | Title | Target selector | Card side | Depth |
|---|-------|-----------------|-----------|-------|
| 1 | Welcome to TraceLab | *(centered, no target)* | — | surface |
| 2 | Loading a CSV | `#btn-load-csv` | bottom | surface |
| 3 | Signals — Visibility & Reorder | `#tab-signals` | right | surface |
| 4 | Signals — Style Editing | `#signal-card-0` | right | deeper |
| 5 | Chart Cursor & Navigation | `#chart-pane-0` | top | surface |
| 6 | Edge Values & Peaks | `#btn-edges` | bottom | surface |
| 7 | Delta Mode | `#btn-delta` | bottom | deeper |
| 8 | Groups & Panes | `#group-panel-1` | right | surface |
| 9 | Derived Signals — Adding One | `#btn-add-derived-0` | top | deeper |
| 10 | Derived Signals — The Dialog | *(centered, no target)* | — | deeper |
| 11 | References — Adding One | `#btn-add-reference-0` | top | surface |
| 12 | References — Configuring | `#overlays-section-1` | right | deeper |
| 13 | Comparison Mode — Loading | `#btn-add-csv` | bottom | deeper |
| 14 | Comparison Mode — Navigating | `#sidebar-comparison-tabs` | right | deeper |
| 15 | Meta Tab | `#tab-meta` | right | surface |
| 16 | Project Save & Load | `#btn-save-project` | bottom | surface |
| 17 | Ready! | *(centered, no target)* | — | surface |

### Notes on steps that span multiple UI locations

- **Steps 9 & 10 (Derived Signals):** Step 9 spotlights the `+ Derived` button on the first chart pane (right side). Step 10 is centered — explains the dialog fields and equation syntax (`s0 + s1`, `avg(s0)`, etc.) without requiring the dialog to be open.
- **Steps 11 & 12 (References):** Step 11 spotlights `+ Reference` on the chart pane (right side). Step 12 spotlights the OVERLAYS accordion in the GroupPanel sidebar (left side), explaining the per-overlay controls: label, value, axis, color, line vs band, dashed toggle.
- **Steps 13 & 14 (Comparison):** Step 13 spotlights `+ CSV` in the top bar and explains loading a second file. Step 14 spotlights the comparison dataset tabs that appear in the sidebar after loading.

---

## IDs to Add

The following `id` attributes need to be added to existing elements. None of these change behavior.

| ID | Location | Element |
|----|----------|---------|
| `btn-tutorial` | `App.jsx` top bar | New `?` button |
| `btn-load-csv` | `App.jsx` top bar | "Load CSV" ToolBtn |
| `btn-add-csv` | `App.jsx` top bar | "+ CSV" ToolBtn |
| `btn-delta` | `App.jsx` top bar | "Δ Delta" ToolBtn |
| `btn-edges` | `App.jsx` top bar | "Edges" ToolBtn |
| `btn-peaks` | `App.jsx` top bar | "Peaks" ToolBtn |
| `btn-fit` | `App.jsx` top bar | "Fit" ToolBtn |
| `btn-save-project` | `App.jsx` top bar | save icon ToolBtn |
| `btn-load-project` | `App.jsx` top bar | load icon ToolBtn |
| `tab-signals` | `App.jsx` sidebar | "signals" tab button |
| `tab-meta` | `App.jsx` sidebar | "meta" tab button |
| `signal-card-0` | `SignalCard.jsx` | root div, only when `index === 0` (`id` prop omitted on all other cards) |
| `chart-pane-0` | `ChartPane.jsx` | root div of first rendered pane (only exists when data is loaded) |
| `btn-add-derived-0` | `App.jsx` chart pane header | `+ Derived` button on first pane (only exists when data is loaded) |
| `btn-add-reference-0` | `App.jsx` chart pane header | `+ Reference` button on first pane (only exists when data is loaded) |
| `group-panel-1` | `GroupPanel.jsx` | root div when `groupIdx === 1` |
| `overlays-section-1` | `GroupPanel.jsx` | OVERLAYS header div when `groupIdx === 1` |
| `sidebar-comparison-tabs` | `App.jsx` sidebar | comparison Original/Comparison tab row |

---

## SVG Diagrams

Every step includes an inline SVG diagram in the card. TraceLab does not define CSS custom properties — all theming is via the inline `t` object. SVG color values are therefore injected at render time via template literals in `steps.js`:

```js
// steps.js exports a function, not a plain array
export function buildSteps(t) {
  return [
    {
      target: null,
      title: 'Welcome to TraceLab',
      svg: `<svg ...><path stroke="${t.accent}" .../></svg>`,
      ...
    },
    ...
  ];
}
```

`TutorialOverlay.jsx` calls `buildSteps(t)` once on mount (and again if `t` changes, i.e. theme switch while tutorial is open).

Steps with no natural diagram (centered welcome/finish cards) use a simple decorative SVG (rendered waveform or checkmark).

---

## Styling

- `tutorial.css` is imported once inside `TutorialOverlay.jsx`
- Contains only: `@keyframes tutorialPulse`, card visible/hidden transition classes, overlay active/fade-out transitions, centered card override
- All colors reference `t.*` tokens passed as props — no hardcoded hex values in the component
- Font: `FONT_MONO` (JetBrains Mono) for step counter and title; `FONT_DISPLAY` (Sora) for body text and buttons — matching TraceLab's existing convention

---

## Data Dependency Handling

Several steps target elements that only exist after a CSV is loaded (chart panes, pane header buttons, first signal card). The `?` button is always available. When the tutorial reaches a step whose `target` selector returns no element or a zero-size rect, `TutorialOverlay` falls back to centered-card mode — same as CamForge's `getTargetRect` returning `null`. No special gating needed.

---

## Out of Scope

- No auto-launch on first visit
- No "don't show again" checkbox (trigger is always manual)
- No tutorial progress persistence (always starts at step 1)
- No mobile/responsive handling (TraceLab is desktop-only)
- Export tab is not covered in the tutorial steps
