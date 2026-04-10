# TraceLab App.jsx Refactor Design

**Date:** 2026-04-09  
**Scope:** Behavior-preserving decomposition of `src/App.jsx` (~1,205 lines) into focused hooks and components  
**Goal:** App.jsx shrinks to ~120 lines of pure orchestration; all logic and render sections live in dedicated files

---

## Constraints

- Zero behavior change — pure structural refactor
- No inline style cleanup, no prop interface redesign, no new features
- Technical debt addressed in a separate follow-up pass

---

## File Map

```
src/
├── App.jsx                          ← shrinks to ~120 lines
│
├── utils/
│   └── signalRemapping.js           ← NEW: pure helper fns moved from App.jsx top
│
├── hooks/
│   ├── useDerivedPens.js            ← NEW
│   ├── useFileIO.js                 ← NEW
│   ├── useOverlays.js               ← NEW
│   ├── useSignalState.js            ← NEW
│   └── useChartPanes.js             ← NEW
│
└── components/
    ├── AppHeader.jsx                ← NEW
    ├── EmptyState.jsx               ← NEW
    ├── ChartArea.jsx                ← NEW
    ├── PaneHeader.jsx               ← NEW
    └── sidebar/
        ├── Sidebar.jsx              ← NEW
        ├── SignalsTab.jsx           ← NEW
        ├── StatsTab.jsx             ← NEW
        ├── MetaTab.jsx              ← NEW
        └── RebaseTab.jsx            ← NEW
```

Existing components (`ChartPane`, `ExportPanel`, `DerivedPenDialog`, `ImportDialog`, `TutorialOverlay`, `Toast`, `GroupPanel`, etc.) are **unchanged**.

---

## utils/signalRemapping.js

Moves the six pure functions currently at the top of App.jsx (lines 27–98):

| Function | Purpose |
|---|---|
| `remapSignalIndex` | Shifts a signal index after a deletion |
| `shiftIndexedMap` | Shifts all keys of an index-keyed object after a deletion |
| `remapEquationExpression` | Rewrites `sN` tokens in an equation after a deletion |
| `remapDerivedConfig` | Remaps all source references in a derived config after a deletion |
| `resolveSignalSeam` | Computes seam domain + offset from style config and values |
| `shiftSeriesBackward` | Phase-shifts a values array by N samples (interpolating) |

All six are exported named exports. No React dependency.

---

## Custom Hooks

Hooks do not call each other. App.jsx wires them by passing outputs of one as arguments to another.

### `useSignalState(data)`

**Owns state:** `visible`, `groups`, `groupNames`, `signalStyles`, `metadata`, `avgWindow`, `hideOriginal`, `splitRanges`, `cursorIdx`, `cursor2Idx`, `deltaMode`, `deltaLocked`, `showPills`, `showEdgeValues`, `showExtrema`, `viewRange`

**Returns:** all owned state + `toggleSignal`, `setGroup`, `combineAll`, `soloAll`, `isCombined`, `resetZoom`, `getDisplayName`, `handleRenameDisplay`, `getGroupLabel`, `cursorValues`, `cursor2Values`, and all raw setters needed by components

`viewRange` lives here (not in `useFileIO`) because it is primarily chart-view state (zoom). IO operations that reset it receive `setViewRange` through the `signalState` argument passed to `useFileIO`.

---

### `useDerivedPens(data, setData, signalState, gc, showToast)`

**Owns state:** `derivedConfigs`, `derivedDialog`

**Returns:** `derivedConfigs`, `derivedDialog`, `setDerivedDialog`, `recomputeDerivedSignals`, `createDerivedPen`, `updateDerivedPen`, `deleteDerivedPen`

Contains: `recomputeDerivedSignals`, `toDerivedCfg`, `shiftSeriesBackward` usage (imported from `signalRemapping.js`)

---

### `useOverlays(data, groups, visible, viewRange, splitRanges)`

**Owns state:** `referenceOverlays`, `overlayPickerGroup`

**Returns:** `referenceOverlays`, `overlayPickerGroup`, `setOverlayPickerGroup`, `addOverlay`, `updateOverlay`, `deleteOverlay`

---

### `useFileIO(data, setData, signalState, derivedPens, showToast)`

**Owns state:** `importMode`, `comparisonData`, `comparisonState`, `rebaseOffset`, `rebaseInput`, `activeSidebarDataset`, `importDialogOpen`

**Returns:** all owned state + their setters + `handleFile`, `handleUnifiedImport`, `handleComparisonImport`, `saveProject`, `loadProject`, `handleDrop`, `updateComparisonState`, `applyRebase`, `clearRebase`

Depends on `recomputeDerivedSignals` (passed in from `useDerivedPens`) for project load hydration.

---

### `useChartPanes(data, signalState, fileIO, theme, t)`

**Owns state:** none — pure derivation via `useMemo`

**Returns:** `chartPanes`, `comparisonChartPanes`, `globalEdgeLabelWidth`, `globalLeftEdgeLabelWidth`

Calls `buildChartPanes` (existing util) and `buildDatasetPanes` (helper defined inside this hook).

---

## Components

### `<EmptyState>`

Shown when `!data`. Contains the drop-zone, file input, and `ThemeToggle`.

**Props:** `t`, `theme`, `setTheme`, `fileInputRef`, `loadProject`, `handleFile`, `handleDrop`, `toast`, `setToast`

---

### `<AppHeader>`

The 48px topbar. Contains the TraceLab wordmark, dataset info badges, all toolbar `ToolBtn`s, file inputs, and `ThemeToggle`.

**Props:** `t`, `theme`, `setTheme`, `data`, `rebaseOffset`, `importMode`, `comparisonData`, `deltaMode`, `showPills`, `showEdgeValues`, `showExtrema`, `isCombined`, `fileInputRef`, `projectInputRef`, `setDeltaMode`, `setShowPills`, `setShowEdgeValues`, `setShowExtrema`, `setCursorIdx`, `setCursor2Idx`, `setDeltaLocked`, `combineAll`, `soloAll`, `resetZoom`, `exportSnapshot`, `saveProject`, `loadProject`, `setTutorialOpen`, `setImportDialogOpen`, `setImportMode`, `setComparisonData`, `setComparisonState`, `setActiveSidebarDataset`

---

### `<Sidebar>`

Shell that renders comparison/primary dataset tab switcher, the 5 panel tab buttons, and delegates to the active tab component.

**Props:** `t`, `theme`, `activePanel`, `setActivePanel`, `activeSidebarDataset`, `setActiveSidebarDataset`, `importMode`, `data` — plus the full prop bundles for each tab (passed through).

#### `<SignalsTab>`

**Props:** `t`, `theme`, `gc`, `data`, `groups`, `visible`, `cursorValues`, `cursor2Values`, `deltaMode`, `metadata`, `signalStyles`, `referenceOverlays`, `derivedConfigs`, `importMode`, `activeSidebarDataset`, `comparisonData`, `comparisonState`, `updateComparisonState`, `getDisplayName`, `getGroupLabel`, `toggleSignal`, `toggleGroup`, `setGroup`, `onEditDerived`, `deleteDerivedPen`, `setGroupNames`, `addOverlay`, `updateOverlay`, `deleteOverlay`, `onStyleChange`, `handleRenameDisplay`, `setDerivedDialog`

#### `<StatsTab>`

**Props:** `t`, `theme`, `data`, `visible`, `metadata`, `viewRange`, `signalStyles`, `getDisplayName`

#### `<MetaTab>`

**Props:** `t`, `theme`, `data`, `visible`, `metadata`, `setMetadata`, `signalStyles`, `editingMeta`, `setEditingMeta`

Contains the `UNIT_PRESETS` constant (currently inline in App.jsx render).

#### `<RebaseTab>`

**Props:** `t`, `data`, `rebaseOffset`, `rebaseInput`, `setRebaseInput`, `applyRebase`, `clearRebase`

---

### `<PaneHeader>`

The 22px colored bar rendered above each `ChartPane`. Extracted because it is duplicated between the primary and comparison chart sections.

**Props:** `pane`, `paneGc`, `splitRanges`, `onToggleSplit`, `overlayPickerGroup`, `setOverlayPickerGroup`, `addOverlay`, `setDerivedDialog`, `t`, `theme`, `pi`, `isFirstPane`, `showDerivedButton`

`showDerivedButton` is `false` for comparison panes (they have no derived pen support).

---

### `<ChartArea>`

The right-side flex column: cursor status bar, primary panes, comparison section, status bar footer.

**Props:** `t`, `theme`, `data`, `chartPanes`, `comparisonChartPanes`, `comparisonData`, `comparisonState`, `importMode`, `viewRange`, `setViewRange`, `cursorIdx`, `setCursorIdx`, `cursor2Idx`, `setCursor2Idx`, `deltaMode`, `deltaLocked`, `setDeltaLocked`, `rebaseOffset`, `showPills`, `showEdgeValues`, `showExtrema`, `referenceOverlays`, `splitRanges`, `setSplitRanges`, `globalEdgeLabelWidth`, `globalLeftEdgeLabelWidth`, `updateOverlay`, `updateComparisonState`, `overlayPickerGroup`, `setOverlayPickerGroup`, `addOverlay`, `setDerivedDialog`

---

## App.jsx After Refactor

App.jsx becomes:

```jsx
export default function App() {
  const [data, setData] = useState(null);
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState(...);
  const [activePanel, setActivePanel] = useState("signals");
  const [editingMeta, setEditingMeta] = useState(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const fileInputRef = useRef(null);
  const projectInputRef = useRef(null);

  const t = THEMES[theme];
  const gc = theme === "dark" ? GROUP_COLORS_DARK : GROUP_COLORS_LIGHT;
  const showToast = useCallback((msg, type = "info") => setToast({ msg, type }), []);

  const signalState = useSignalState(data);
  const derivedPens = useDerivedPens(data, setData, signalState, gc, showToast);
  const fileIO     = useFileIO(data, setData, signalState, derivedPens, showToast);
  const overlays   = useOverlays(data, signalState.groups, signalState.visible, signalState.viewRange, signalState.splitRanges);
  const chartPanes = useChartPanes(data, signalState, fileIO, theme, t);

  if (!data) return <EmptyState ... />;

  return (
    <div ...>
      <AppHeader ... />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar ... />
        <ChartArea ... />
      </div>
      <DerivedPenDialog ... />
      <Toast ... />
      <ImportDialog ... />
      <TutorialOverlay ... />
    </div>
  );
}
```

---

## Testing

No test changes required. All existing tests target `src/utils/` and `src/test/` — none import from `App.jsx` directly. The extraction of `signalRemapping.js` introduces new testable units but adding tests for them is out of scope for this refactor.

---

## Out of Scope

- CSS / inline style extraction
- Prop interface redesign
- Adding tests for new files
- Any behavior or visual changes
