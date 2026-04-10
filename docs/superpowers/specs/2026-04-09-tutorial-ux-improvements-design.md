# Tutorial UX Improvements — Design Spec

## Overview

Three UX improvements to the live tutorial overlay, plus a new signal rename feature surfaced during content review, plus content updates to all 17 steps.

---

## 1. Close Button Repositioning

**Current:** A "Skip" / "Close" text button sits at the far right of the navigation bar inside the card. On narrow cards or short viewports it runs off the visible edge.

**New:** A small circular ✕ button positioned absolutely on the **top-right corner of the card**, overlapping the card border (like a close badge). The "Skip" / "Close" text button is removed from the nav bar entirely.

**Spec:**
- `position: absolute; top: -10px; right: -10px`
- Size: 22×22px, `border-radius: 50%`
- Background: `t.panel`, border: `1px solid t.border`
- Icon: `✕`, font-size 11px, color: `t.text3`
- Box shadow: `0 2px 6px rgba(0,0,0,0.4)`
- Clicking it triggers the close confirmation (see §2)
- On the last step, same button — still triggers confirmation

---

## 2. Close Confirmation UI

**Current:** Clicking the backdrop or Skip immediately calls `onClose()`. This causes accidental dismissal on steps that spotlight interactive elements (the user clicks the spotlighted button expecting to try it, but the backdrop fires instead).

**New:** Clicking the ✕ button or the outer backdrop triggers an **in-card confirmation state** — the card body transitions to a focused "Exit the tutorial?" view. The tutorial only closes when the user explicitly confirms.

**Spec:**

The `TutorialOverlay` component adds a local `confirming` boolean state (default `false`).

When `confirming === false` (normal state): card renders as usual.

When `confirming === true`: card body is replaced with:
```
"Exit the tutorial?"
"You can restart it anytime with the ? button."
[Exit]  [Keep going]
```
- The ✕ corner button is hidden while confirming (prevents double-triggering)
- "Exit" calls `onClose()` and resets `confirming` to `false`
- "Keep going" resets `confirming` to `false`, returns to normal card
- Pressing `Escape` while confirming resets to `false` (does not close)
- Navigating to a different step (Back / Next / arrow keys) resets `confirming` to `false`
- The card maintains its position — no layout shift

**Triggers for confirmation:**
- Clicking the ✕ corner button
- Clicking the outer backdrop (the dark area outside the spotlight) — but **only** on steps where `allowInteract` is false. On `allowInteract` steps, backdrop clicks do nothing (pointer events pass through to the page instead).

---

## 3. Per-Step `allowInteract` Flag

**Purpose:** Some steps spotlight interactive UI elements and invite the user to try them. On these steps, the overlay must pass pointer events through to the spotlighted element so the user can actually interact with it. The exit confirmation is suppressed for spotlight-area clicks; only clicks on the outer dark backdrop trigger it.

**Spec:**

Each step object may include `allowInteract: true`.

When `allowInteract` is set on the current step:
- The overlay `div` (the fixed full-screen container) sets `pointerEvents: "none"` on itself — clicks fall through to the underlying page entirely
- The tutorial card and ✕ corner button set `pointerEvents: "auto"` explicitly (so they remain clickable)
- Because the container has no pointer events, there is no backdrop click to capture — clicking anywhere outside the card simply interacts with the page
- The user can freely interact with the spotlighted element and anything else on the page

When `allowInteract` is not set (default):
- Existing behavior: full-screen div has `pointerEvents: "auto"`, backdrop click triggers confirmation

**Steps with `allowInteract: true`:**
- Step 5 — Chart Cursor & Navigation
- Step 6 — Edge Values & Peaks
- Step 7 — Delta Mode

---

## 4. Multi-Target Spotlight (Step 6)

**Purpose:** Step 6 (Edge Values & Peaks) spotlights the Edges/Peaks toolbar buttons and also needs a second spotlight on the chart edge area where the edge value annotations actually appear. Showing both simultaneously makes the cause-and-effect clear.

**Spec:**

Step objects may include a `targets` array (replaces the single `target` string) with multiple CSS selectors. When `targets` is present, each selector is resolved to a rect and each gets its own backdrop highlight and pulse ring.

- `target` (single string) continues to work for all other steps — no breaking change
- `targets` array is only used when a step needs more than one spotlight
- Card positioning uses the first target in the array as the anchor for the card placement logic

Step 6 definition:
```js
{
  targets: ['#btn-edges', '#chart-pane-0'],
  prefer: 'bottom',
  allowInteract: true,
  ...
}
```

The second spotlight (`#chart-pane-0`) highlights the area where edge value pills appear. No pulse ring on the second target — only the primary target gets the pulse animation.

---

## 5. Signal Rename (New Feature)

Surfaced during tutorial content review: Step 4 mentioned renaming a tag's display label from the signal card, but this feature does not exist.

**Spec:**

Double-clicking the display label text on a signal card enters inline edit mode — the label becomes a text input field. Same interaction pattern as the Meta tab's editable display name fields.

- On `blur` or `Enter`: saves the new name to state, exits edit mode
- On `Escape`: discards changes, exits edit mode
- Empty value on save: reverts to the original tag name
- The rename applies only to the display label; the underlying tag name in the data is unchanged
- Renaming here and renaming in the Meta tab are in sync (same state field)

---

## 6. Step Content Updates

All changes relative to the current `steps.js`. Steps not listed are unchanged.

### Step 1 — Welcome to TraceLab
**desc (new):**
> TraceLab is a fast, browser-based viewer for PLC trend data. Load a Studio 5000 CSV, explore signals across grouped chart panes, use cursors, overlays, and derived values to inspect behavior, and export annotated snapshots — no install, just open and go.

### Step 4 — Signals — Style Editing
**desc (updated):** Remove the sentence about renaming display labels. Replace with:
> Double-click a signal's label to rename it inline. Changes sync with the Meta tab.

### Step 5 — Chart Cursor & Navigation
**Add:** `allowInteract: true`
**desc (updated):**
> Hover over the chart to move the cursor — signal values snap to the nearest sample and appear as pills above each line. Scroll to zoom in/out. Drag to pan. The time axis updates as you navigate.

### Step 6 — Edge Values & Peaks
**Change:** `target: '#btn-edges'` → `targets: ['#btn-edges', '#chart-pane-0']`
**Add:** `allowInteract: true`
**desc:** unchanged

### Step 7 — Delta Mode
**Add:** `allowInteract: true`
**desc:** unchanged

### Step 9 — Derived Signals — Adding One
**desc (updated):**
> Click + Derived in the chart pane header to open the derived signal dialog. You can create a new signal as a math expression, rolling average, difference, ratio, or other combination of loaded signals — and manage it as a new pen.

### Step 10 — Derived Signals — The Dialog
**desc (updated):**
> In the dialog, pick a type (Equation, Difference, Rolling Avg, etc.) then configure its parameters. Equation mode supports token syntax: s0, s1 ... for each loaded signal, plus standard math like avg(s0), abs(s0 - s1). Once added, edit or delete a derived signal from its signal card popover.

### Step 11 — References — Adding One
**svg (new):** Replace current SVG (shows only H Line + H Band) with updated version showing all four reference types — H Band, H Line (warn/orange), V Line (purple/accent), V Band (green). See approved preview from brainstorm session.

### Step 15 — Meta Tab
**desc (updated):**
> The Meta tab is where you customize how signals are presented — edit display names, set units, and add descriptions for any tag. Changes apply immediately across the chart panes.

---

## Implementation Order

1. Signal rename feature (Step 4 dependency — tutorial step only makes sense once this works)
2. Close button repositioning
3. Close confirmation UI
4. `allowInteract` per-step flag
5. Multi-target spotlight
6. Step content updates (all text + SVG changes)
