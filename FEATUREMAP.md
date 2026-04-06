# TraceLab — Feature Map

> Quick-orientation reference for developers and AI assistants. Covers architecture, data flow, every major feature, and the scaffold for Tutorial Mode.

---

## Project at a Glance

TraceLab is a **React + Vite SPA** for visualizing and analyzing Studio 5000 PLC trend data (CSV exports from Allen-Bradley controllers). It runs entirely client-side — no backend, no build server dependency beyond Vite dev/build.

- **Stack:** React 18, Vite 5, Canvas 2D API (no charting library)
- **Entry:** `index.html` → `src/main.jsx` → `src/App.jsx`
- **Deploy base:** `/TraceLab/` (see `vite.config.js`)
- **Fonts:** Sora (display), JetBrains Mono (mono) — lazy-loaded via `utils/fonts.js`

---

## File Map

```
src/
├── App.jsx                  Root component. All state lives here.
├── main.jsx                 React root mount
├── styles.css               Global resets only (minimal)
│
├── components/
│   ├── ChartPane.jsx        Canvas chart (one per group). Core rendering engine.
│   ├── GroupPanel.jsx       Collapsible group header + signal card list
│   ├── SignalCard.jsx       Per-signal row: visibility, style, sparkline, cursor value
│   ├── ExportPanel.jsx      CSV export configurator (tab content)
│   ├── Sparkline.jsx        36×14px mini-chart (memoized)
│   ├── MarqueeText.jsx      Auto-scrolling text for overflow labels
│   ├── ThemeToggle.jsx      Dark/light toggle button
│   ├── ToolBtn.jsx          Generic toolbar button with active state
│   └── Toast.jsx            Auto-dismiss notification (bottom-right)
│
├── constants/
│   ├── theme.js             THEMES (dark/light), FONT_DISPLAY, FONT_MONO
│   └── groups.js            GROUP_LABELS, GROUP_COLORS_DARK/LIGHT, MAX_GROUPS
│
└── utils/
    ├── parser.js            parseStudio5000CSV() — CSV → data object
    ├── stats.js             arrayMinMax(), computeStats()
    ├── date.js              fmtTime, fmtDate, fmtDateISO, fmtTsClean
    ├── download.js          downloadBlob() — safe browser download + URL cleanup
    └── fonts.js             ensureFonts() — lazy Google Fonts inject
```

---

## State Reference (`App.jsx`)

All application state is in `App.jsx`. There is no context or external store.

| State | Type | Purpose |
|---|---|---|
| `data` | `object \| null` | Parsed CSV: `{ meta, timestamps[], signals[], tagNames[] }` |
| `visible` | `bool[]` | Per-signal visibility toggle |
| `groups` | `number[]` | Per-signal group assignment (1–8) |
| `groupNames` | `{ [groupIdx]: string }` | Custom group labels (default: "A"–"H") |
| `signalStyles` | `{ [sigIdx]: { color, dash } }` | Per-signal color/dash overrides |
| `cursorIdx` | `number \| null` | Primary cursor (sample index) |
| `cursor2Idx` | `number \| null` | Secondary cursor for delta mode |
| `deltaMode` | `bool` | Delta measurement mode active |
| `deltaLocked` | `bool` | cursor2 locked (click-confirmed) |
| `showPills` | `bool` | Cursor value pills visible |
| `showEdgeValues` | `bool` | Entry/exit value pills at view boundaries |
| `splitRanges` | `{ [groupIdx]: bool }` | Per-group independent Y-axis per signal |
| `avgWindow` | `{ [sigIdx]: number }` | Moving average window (0 = off) |
| `hideOriginal` | `{ [sigIdx]: bool }` | Hide source trace when avg is shown |
| `viewRange` | `[start, end]` | Current zoom window (sample indices) |
| `activePanel` | `string` | Left panel tab: `"signals" \| "stats" \| "meta" \| "rebase" \| "export"` |
| `metadata` | `{ [sigIdx]: { displayName, unit, description } }` | User-editable signal metadata |
| `editingMeta` | `number \| null` | Signal index currently being edited in Meta tab |
| `theme` | `"dark" \| "light"` | UI theme (seeded from `prefers-color-scheme` on launch) |
| `rebaseOffset` | `number` | Timestamp shift in ms (0 = no rebase) |
| `rebaseInput` | `string` | Input field value for rebase date entry |
| `toast` | `{ msg, type } \| null` | Active toast notification |

---

## Data Flow

```
User loads CSV (file picker or drag-drop onto app)
  ↓
handleFile() / handleDrop()
  ↓  FileReader.readAsText()
parseStudio5000CSV(text)  [utils/parser.js]
  ↓  returns { meta, timestamps, signals, tagNames }
setData() + reset all derived state
  (visible, groups, viewRange, cursors, metadata, styles, rebase)
  ↓
App re-renders
  ↓
chartPanes = useMemo()
  filters visible signals per group
  computes moving avg entries (if avgWindow > 0)
  builds signalEntries[] array per pane
  ↓
Map chartPanes → <ChartPane> components
  ↓
ChartPane.drawTraces()     [trace canvas]
  grid + signal polylines + Y-axis labels + edge pills
ChartPane.drawCursors()    [cursor canvas overlay]
  cursor lines + value pills + delta shading
  ↓
Interaction (scroll/drag/click) → setViewRange / setCursorIdx → redraw
```

---

## ChartPane — Canvas Architecture

`ChartPane.jsx` is the rendering core. Each group gets one instance.

**Two canvas layers (stacked via `position: absolute`):**

| Layer | Ref | Redraws when |
|---|---|---|
| Trace | `traceRef` | `drawTraces` deps change (zoom, signals, theme) |
| Cursor | `cursorRef` | `drawCursors` deps change (cursor pos, delta mode) |

**Drawing pipeline:**

```
drawTraces()
  getGeo()           → compute W, H, pad, plotW, plotH
  yRanges (useMemo)  → per-signal [min, max] with 8% padding
  background rect    → t.chart color
  grid lines         → 5–6 H/V lines, t.grid color
  group color bar    → 3px left edge stripe
  signal polylines   → stride-optimized, solid/dashed/dotted
  Y-axis labels      → first signal only, right-aligned
  X-axis time labels → bottom pane only (showTimeAxis prop)
  edge pills         → entry/exit values at left/right view boundary

drawCursors()
  cursor1 line + dots + value pills   (drawOne())
  [delta mode]
    cursor2 preview / locked line
    shaded region between cursors
    per-signal Δ pills at each cursor
    ΔT + ΔV summary box (if cursors > 50px apart)
    cursor "1" / "2" labels
```

**Value pill styling (cursor pills):**
- Rounded corners (`quadraticCurveTo`, r=4)
- Avg signals: dashed border, `x̄` prefix, diamond pip
- Normal signals: solid border, circle pip
- Both: leader line from dot to pill

**Y-axis modes:**
- Unified (`unifyRange=true`): all signals share one min/max
- Split (`splitRanges[groupIdx]=true`): each signal independent range

---

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  Toolbar (48px)                                         │
│  TraceLab | trend name | tag/sample info | REBASED?     │
│  [Theme] | [Δ Delta] [Pills] [Edges] [Combine] [Fit]   │
│          | [PNG] [Save] [Load Proj] [Load CSV]          │
├──────────────┬──────────────────────────────────────────┤
│ Left Panel   │  Cursor Status Bar (30px)                │
│ (280px)      │  T₁ | T₂ | ΔT | N panes | hint          │
│              ├──────────────────────────────────────────┤
│ [Tab Bar]    │  Chart Stack (scrollable)                │
│  signals     │  ┌──────────────────────────────────┐   │
│  stats       │  │ Group Header (22px)               │   │
│  meta        │  │ color · label · tags | Y= / Y≠   │   │
│  rebase      │  ├──────────────────────────────────┤   │
│  export      │  │ ChartPane (canvas)                │   │
│              │  │  trace layer + cursor layer       │   │
│ [Tab Content]│  └──────────────────────────────────┘   │
│              │  (repeated per visible group)            │
│              ├──────────────────────────────────────────┤
│              │  Bottom Status Bar (26px)                │
│              │  start time | N/M samples (X%) | end     │
└──────────────┴──────────────────────────────────────────┘
```

---

## Left Panel Tabs

### `signals`
8 collapsible `GroupPanel` components (A–H), always shown even if empty.
- **GroupPanel:** header (color swatch, toggle-all, count, collapse, rename on dbl-click)
- **SignalCard:** drag handle, visibility checkbox, color/dash picker, display name, sparkline, cursor value + Δ, avg toggle + window slider

### `stats`
Per-signal stats card (visible signals only, computed over `viewRange`):
- Min, Max, Avg, Range — via `computeStats()` in `utils/stats.js`

### `meta`
Per-signal metadata editor (all signals):
- View: Display Name, Unit, Description
- Edit mode (double-click): text inputs + unit preset dropdown
- Presets: Temperature, Length, Speed, Pressure, Electrical, Time, Mass/Force, Flow, Other

### `rebase`
Shift all timestamps to a new start time:
- Shows original start, current start
- Input: `YYYY-MM-DD HH:MM:SS`
- APPLY / RESET buttons
- `rebaseOffset` applied in label formatting only — raw `timestamps[]` unchanged

### `export`
CSV export configurator (`ExportPanel.jsx`):
- Sample rate multiplier (1×–100× base period)
- Range: full dataset or current view
- Signal checkboxes (ALL / NONE)
- Row/column/rate stats
- Preview pane + EXPORT CSV button

---

## Toolbar Buttons

| Button | State toggled | Notes |
|---|---|---|
| Theme | `theme` | Seeded from `prefers-color-scheme` on launch |
| Δ Delta | `deltaMode` + cursor reset | 3-click cycle: place T1 → preview T2 → lock → reset |
| Pills | `showPills` | Cursor value labels on/off |
| Edges | `showEdgeValues` | Entry/exit value pills at view boundary |
| Combine / Solo | `groups[]` | Combine: all → group 1. Solo: distributes 1 per group |
| Fit | `viewRange` | Reset to `[0, data.timestamps.length]` |
| PNG | — | `exportSnapshot()` — renders all canvases + legend to PNG |
| Save | — | `saveProject()` — `.tracelab` JSON download |
| Load Proj | — | `loadProject()` — restores full session from `.tracelab` |
| Load CSV | — | `handleFile()` — parses Studio 5000 CSV |

---

## Key Utilities

### `utils/parser.js` — `parseStudio5000CSV(text)`
Parses Allen-Bradley Studio 5000 CSV format:
1. Scans first 20 lines for metadata keys (`Controller`, `Trend Name`, `Sample Period`, etc.)
2. Finds header row containing tag names
3. Parses `Data,` rows → timestamps (ms since epoch) + per-signal values
4. Auto-detects digital signals (≤2 unique values, all 0/1)

Returns: `{ meta, timestamps[], signals[{ name, values[], isDigital }], tagNames[] }`

### `utils/stats.js`
- `arrayMinMax(arr, start, end)` → `{ min, max, count, sum }` — used in Y-range calc
- `computeStats(values, start, end)` → formatted `{ min, max, avg, range }` strings

### `utils/date.js`
All formatters take a Unix ms timestamp:
- `fmtTime(ms)` → `"HH:MM:SS.sss"`
- `fmtDate(ms)` → `"M/D/YYYY"`
- `fmtDateISO(ms)` → `"YYYY-MM-DD"`
- `fmtTsClean(ms)` → `"YYYY-MM-DD HH:MM:SS.sss"`

### `utils/download.js` — `downloadBlob(blob, filename, onComplete?)`
Tracks blob URLs, keeps last 3, revokes older ones with deferred cleanup (200ms DOM, 60s URL).

---

## Theme System (`constants/theme.js`)

Two themes: `dark` and `light`. Both have identical key sets:

```
bg, panel, chart              — surface hierarchy (chart is lightest in light mode)
surface, surfaceHover         — interactive surface overlays
border, borderSubtle          — divider / outline strokes
text1, text2, text3, text4    — text hierarchy (1=primary, 4=muted)
grid                          — chart gridline color
accent, accentDim, accentBorder
cursor1, cursor2, cursor2Bg   — cursor line + delta shading
isolate, isolateDim           — "combine" mode accent
green, greenDim, warn, red    — semantic colors
inputBg, inputBorder          — form field colors
dotStroke                     — cursor dot outline (matches chart bg)
cardShadow, panelShadow       — elevation shadows
sigColors[12]                 — signal color palette (cycled)
```

**Signal color override:** `signalStyles[sigIdx].color` takes precedence over `sigColors[i % 12]`.

---

## Moving Average

Computed inside the `chartPanes` `useMemo` in `App.jsx` (~lines 125–183):

1. For each signal where `avgWindow[i] > 0`, compute a new `signal` object with smoothed `values[]`
2. Uses a ring-buffer O(1) per sample — null values excluded from sum but tracked for buffer position
3. Resulting entry has `isAvg: true`, `dash: "dashed"` — distinguishes it visually everywhere
4. If `hideOriginal[i]` is true, the source signal entry is excluded from `signalEntries`

Visual indicators for avg signals (consistent across all pill types):
- Dashed pill border (opacity 0.6)
- `x̄` prefix on value text
- Slightly higher background opacity (0.92 vs 0.88)
- Hollow diamond dot on cursor line (vs filled circle)

---

## Project File Format (`.tracelab`)

JSON structure saved/loaded by `saveProject()` / `loadProject()`:

```json
{
  "version": 2,
  "data": { "meta": {}, "timestamps": [], "signals": [], "tagNames": [] },
  "visible": [],
  "groups": [],
  "groupNames": {},
  "signalStyles": {},
  "metadata": {},
  "viewRange": [0, 0],
  "rebaseOffset": 0,
  "deltaMode": false,
  "showPills": true,
  "showEdgeValues": false,
  "splitRanges": {},
  "avgWindow": {},
  "hideOriginal": {}
}
```

**Migration handled in `loadProject()`:**
- `isolated[]` (v1) → converted to `groups[]`
- `lockedRanges{}` → inverted to `splitRanges{}`
- `showAvg{}` (boolean) → converted to `avgWindow{}` (window size 20)

---

## Tutorial Mode — Implementation Scaffold

Tutorial mode is not yet built. This section defines where to wire it in and how it should work.

### Concept
A guided walkthrough overlaid on the live UI, stepping through features with spotlight highlights and instruction text. Uses real data and real interactions — not a simulation.

### State to Add (in `App.jsx`)

```jsx
const [tutorialActive, setTutorialActive] = useState(false);
const [tutorialStep, setTutorialStep] = useState(0);
```

### Step Definition Structure

Create `src/constants/tutorial.js`:

```js
export const TUTORIAL_STEPS = [
  {
    id: "load-csv",
    title: "Load a CSV file",
    body: "Click Load CSV in the toolbar to open a Studio 5000 trend export.",
    spotlight: "load-csv-btn",       // maps to a data-tutorial-id attribute
    position: "below",               // tooltip anchor: above | below | left | right
    advance: "on-data-load",         // trigger: "manual" | "on-data-load" | "on-cursor" | etc.
  },
  {
    id: "signals-panel",
    title: "Your signals",
    body: "Each row in the Signals tab is a PLC tag. Toggle visibility with the checkbox.",
    spotlight: "left-panel",
    position: "right",
    advance: "manual",
  },
  {
    id: "zoom",
    title: "Zoom & pan",
    body: "Scroll over a chart to zoom. Click and drag to pan.",
    spotlight: "chart-area",
    position: "above",
    advance: "manual",
  },
  {
    id: "delta-mode",
    title: "Delta measurement",
    body: "Click Δ Delta, then click twice on a chart to measure the change between two points.",
    spotlight: "delta-btn",
    position: "below",
    advance: "on-delta-lock",
  },
  {
    id: "average",
    title: "Moving average",
    body: "Expand a signal card and toggle Average to overlay a smoothed trace.",
    spotlight: "left-panel",
    position: "right",
    advance: "manual",
  },
  {
    id: "export",
    title: "Export",
    body: "Save your session as a .tracelab project, export a PNG snapshot, or export filtered CSV data.",
    spotlight: "toolbar-right",
    position: "below",
    advance: "manual",
  },
];
```

### Spotlight Anchor Points

Add `data-tutorial-id` attributes to these elements in JSX:

| `data-tutorial-id` | Element | Location |
|---|---|---|
| `load-csv-btn` | Load CSV `<ToolBtn>` | `App.jsx` toolbar right section |
| `delta-btn` | Δ Delta `<ToolBtn>` | `App.jsx` toolbar right section |
| `left-panel` | Left panel `<div>` | `App.jsx` layout |
| `chart-area` | Chart stack `<div>` | `App.jsx` main area |
| `toolbar-right` | Right toolbar group | `App.jsx` toolbar |

### Tutorial Overlay Component

Create `src/components/TutorialOverlay.jsx`:

```jsx
// Renders:
// 1. Semi-transparent backdrop (pointer-events: none except on spotlight)
// 2. Cutout/highlight around the element matching data-tutorial-id
// 3. Tooltip card with title, body, step counter, Prev/Next/Skip buttons
// Props: step (object), stepIndex, totalSteps, onNext, onPrev, onExit
```

### Advance Triggers

Wire these in `App.jsx` where state changes happen:

| Trigger string | Where to fire |
|---|---|
| `"on-data-load"` | After `setData()` in `handleFile()` |
| `"on-cursor"` | After `setCursorIdx()` is set non-null |
| `"on-delta-lock"` | After `setDeltaLocked(true)` |
| `"manual"` | Only Next button advances |

```js
// Helper to call wherever a trigger fires:
const advanceTutorial = useCallback((trigger) => {
  if (!tutorialActive) return;
  const step = TUTORIAL_STEPS[tutorialStep];
  if (step?.advance === trigger) setTutorialStep(s => s + 1);
}, [tutorialActive, tutorialStep]);
```

### Entry Point

Add a **"Start Tutorial"** button to the empty-state (no data loaded) screen and optionally to the toolbar. Set `tutorialActive = true` and `tutorialStep = 0`.

### Sample Data

Place a small demo CSV at `public/demo.csv`. In tutorial step 0, pre-wire the Load CSV button to fetch and load it automatically so the user doesn't need a real file to follow along.

---

## Known Issues / Clean State

| File | Issue | Status |
|---|---|---|
| `GroupPanel.jsx` | Was missing `GROUP_LABELS` import — caused runtime error on group rename | **Fixed** |
| `SignalCard.jsx` | Had unused `useCallback` import | **Fixed** |

---

## Conventions

- **No TypeScript.** Props are documented by usage pattern and function signatures.
- **No test suite.** Canvas rendering is the main logic surface; unit tests would target `utils/`.
- **Canvas redraws are pure functions** — given the same props/state, `drawTraces` and `drawCursors` produce the same output. Side effects are limited to canvas state mutations.
- **All timestamps are Unix ms** internally. `rebaseOffset` shifts display labels only — `data.timestamps[]` is never mutated.
- **Signal indices are stable** for the lifetime of a loaded dataset. Metadata, styles, visibility, groups, and avg settings all key off signal index.
