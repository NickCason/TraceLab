# Tutorial Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 17-step guided tutorial overlay to TraceLab, triggered by a `?` button in the top bar, using a React portal and spotlight card system adapted from CamForge.

**Architecture:** A `TutorialOverlay` React portal component handles all rendering and state; it imports step definitions from `steps.js` (a function `buildSteps(t)` that injects theme tokens into SVG strings); `tutorial.css` contains only keyframes and CSS-class transitions. The `?` button in `App.jsx` drives a single `tutorialOpen` boolean.

**Tech Stack:** React 18, ReactDOM.createPortal, inline styles via `t` theme object, CSS keyframes for pulse animation. No new dependencies.

> **Note on testing:** TraceLab has no test framework configured. Verification steps use `npm run dev` and visual inspection in the browser.

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/components/tutorial/tutorial.css` |
| Create | `src/components/tutorial/steps.js` |
| Create | `src/components/tutorial/TutorialOverlay.jsx` |
| Modify | `src/App.jsx` — add `id` attrs to top-bar buttons + tabs + chart-pane wrappers + derived/reference buttons; add `tutorialOpen` state; add `?` button; import + render `<TutorialOverlay>` |
| Modify | `src/components/GroupPanel.jsx` — add `id` to root div + OVERLAYS header when `groupIdx === 1` |
| Modify | `src/components/SignalCard.jsx` — add `id` to root div when `index === 0` |

---

## Task 1: Add IDs to App.jsx — top-bar buttons and sidebar tabs

**Files:**
- Modify: `src/App.jsx:741-768`

> This is purely additive — no behavior changes, just `id` attributes.

- [ ] **Step 1: Add `id` to ToolBtn calls for top-bar buttons**

Find the right-side toolbar `<div style={{ display: "flex", alignItems: "center", gap: 6 }}>` (currently around line 740). Apply these IDs to existing ToolBtn/button elements:

```jsx
<ThemeToggle theme={theme} setTheme={setTheme} />
<div style={{ width: 1, height: 22, background: t.border, marginLeft: 4, marginRight: 4 }} />
<ToolBtn id="btn-delta" onClick={() => { setDeltaMode(!deltaMode); setCursorIdx(null); setCursor2Idx(null); setDeltaLocked(false); }} active={deltaMode} activeColor={t.cursor2} t={t}>Δ Delta</ToolBtn>
<ToolBtn onClick={() => setShowPills(!showPills)} active={showPills} activeColor={t.green} t={t} title="Toggle cursor value pills">Pills</ToolBtn>
<ToolBtn id="btn-edges" onClick={() => setShowEdgeValues(!showEdgeValues)} active={showEdgeValues} activeColor={t.warn} t={t} title="Show entry/exit values at view edges">Edges</ToolBtn>
<ToolBtn id="btn-peaks" onClick={() => setShowExtrema(!showExtrema)} active={showExtrema} activeColor={t.accent} t={t} title="Show per-signal max/min markers in current view">Peaks</ToolBtn>
<ToolBtn onClick={isCombined ? soloAll : combineAll} active={!isCombined} activeColor={t.isolate} t={t}>{isCombined ? "Solo All" : "Combine"}</ToolBtn>
<ToolBtn id="btn-fit" onClick={resetZoom} t={t}>Fit</ToolBtn>
<ToolBtn onClick={exportSnapshot} title="Save chart as PNG" t={t}><svg ...snapshot icon.../></ToolBtn>
<ToolBtn id="btn-save-project" onClick={saveProject} title="Save project" t={t}><svg ...save icon.../></ToolBtn>
<ToolBtn id="btn-load-project" onClick={() => projectInputRef.current?.click()} title="Load project" t={t}><svg ...load icon.../></ToolBtn>
<input ref={projectInputRef} type="file" accept=".tracelab" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) loadProject(e.target.files[0]); }} />
<ToolBtn id="btn-load-csv" onClick={() => fileInputRef.current?.click()} t={t} style={{ background: t.accentDim, borderColor: `${t.accent}33`, color: t.accent }}>Load CSV</ToolBtn>
<input ref={fileInputRef} type="file" accept=".csv,.CSV,.tracelab" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { f.name.endsWith(".tracelab") ? loadProject(f) : handleFile(f); } }} />
{data && <ToolBtn id="btn-add-csv" onClick={() => setImportDialogOpen(true)} t={t} style={{ background: t.green + "18", borderColor: t.green + "33", color: t.green }}>+ CSV</ToolBtn>}
```

Note: `ToolBtn` must accept and forward the `id` prop. Check `src/components/ToolBtn.jsx` — if it doesn't spread props, add `{...rest}` or explicitly accept `id`.

- [ ] **Step 2: Check ToolBtn forwards `id` prop**

Read `src/components/ToolBtn.jsx`. If the root element doesn't spread props or accept `id`, add it:

```jsx
// Example — adjust to match actual ToolBtn signature:
export default function ToolBtn({ id, onClick, active, activeColor, t, title, style, children, ...rest }) {
  return (
    <button id={id} onClick={onClick} title={title} style={{ ... }} {...rest}>
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Add `id` to sidebar tab buttons**

Find the tab row (around line 768):
```jsx
{["signals", "stats", "meta", "rebase", "export"].map(tab => (
  <button
    key={tab}
    id={`tab-${tab}`}
    onClick={() => setActivePanel(tab)}
    style={tabSt(activePanel === tab, tab === "export" ? t.green : tab === "rebase" ? t.warn : null)}
  >
    {tab}
  </button>
))}
```

This gives `id="tab-signals"`, `id="tab-meta"`, etc.

- [ ] **Step 4: Add `id` to comparison sidebar tab row**

Find the comparison Original/Comparison tab `<div>` (around line 762, conditionally rendered when `importMode === "comparison"`):

```jsx
{importMode === "comparison" && (
  <div id="sidebar-comparison-tabs" style={{ display: "flex", borderBottom: `1px solid ${t.border}` }}>
    <button onClick={() => setActiveSidebarDataset("primary")} style={tabSt(activeSidebarDataset === "primary", t.accent)}>Original</button>
    <button onClick={() => setActiveSidebarDataset("comparison")} style={tabSt(activeSidebarDataset === "comparison", t.green)}>Comparison</button>
  </div>
)}
```

- [ ] **Step 5: Start dev server and verify IDs render**

```bash
cd C:/DevSpace/Work/tracelab && npm run dev
```

Open DevTools → Elements. Confirm `#btn-load-csv`, `#tab-signals`, `#tab-meta`, `#sidebar-comparison-tabs` (load a second CSV to trigger comparison mode) are present in the DOM.

- [ ] **Step 6: Commit**

```bash
cd C:/DevSpace/Work/tracelab
git add src/App.jsx src/components/ToolBtn.jsx
git commit -m "feat: add id attrs to top-bar buttons and sidebar tabs for tutorial"
```

---

## Task 2: Add IDs to chart pane wrappers and pane header buttons in App.jsx

**Files:**
- Modify: `src/App.jsx:953-1012` (the `chartPanes.map` block)

- [ ] **Step 1: Add `id="chart-pane-0"` to the outer pane wrapper div**

Find the `chartPanes.map` loop (around line 953). Add `id` to the outer wrapper div when `pi === 0`:

```jsx
{chartPanes.map((pane, pi) => {
  const paneGc = gc[pane.groupIdx - 1] || gc[0];
  return (
    <div
      key={pane.id}
      id={pi === 0 ? "chart-pane-0" : undefined}
      style={{ flex: 1, minHeight: 48, position: "relative", display: "flex", flexDirection: "column", borderBottom: pi === chartPanes.length - 1 ? "none" : `1px solid ${t.border}` }}
    >
```

- [ ] **Step 2: Add `id="btn-add-derived-0"` to the `+ Derived` button when `pi === 0`**

Find the `+ Derived` button (around line 978):

```jsx
<button
  id={pi === 0 ? "btn-add-derived-0" : undefined}
  onClick={() => setDerivedDialog({ open: true, mode: "create", groupIdx: pane.groupIdx, type: "equation", editIdx: null, initialDraft: null })}
  style={{ padding: "1px 6px", borderRadius: 4, border: `1px solid ${paneGc}66`, background: paneGc + "22", color: paneGc, fontSize: 11, fontWeight: 700, fontFamily: FONT_DISPLAY, cursor: "pointer" }}
  title="Add derived pen to this chart"
>
  + Derived
</button>
```

- [ ] **Step 3: Add `id="btn-add-reference-0"` to the `+ Reference` button when `pi === 0`**

Find the `+ Reference` button (around line 986):

```jsx
<button
  id={pi === 0 ? "btn-add-reference-0" : undefined}
  onClick={() => setOverlayPickerGroup(prev => prev === pane.groupIdx ? null : pane.groupIdx)}
  style={{ padding: "1px 6px", borderRadius: 4, border: `1px solid ${paneGc}66`, background: paneGc + "22", color: paneGc, fontSize: 11, fontWeight: 700, fontFamily: FONT_DISPLAY, cursor: "pointer" }}
  title="Add reference overlay"
>
  + Reference
</button>
```

- [ ] **Step 4: Verify in browser**

Load a CSV so chart panes appear. Open DevTools → confirm `document.querySelector('#chart-pane-0')` returns the first pane container, `document.querySelector('#btn-add-derived-0')` returns the `+ Derived` button.

- [ ] **Step 5: Commit**

```bash
cd C:/DevSpace/Work/tracelab
git add src/App.jsx
git commit -m "feat: add id attrs to chart pane wrapper and derived/reference buttons"
```

---

## Task 3: Add IDs to GroupPanel.jsx and SignalCard.jsx

**Files:**
- Modify: `src/components/GroupPanel.jsx:53-165`
- Modify: `src/components/SignalCard.jsx:9`

### GroupPanel.jsx

- [ ] **Step 1: Add `id="group-panel-1"` to root div**

Find the root `<div` of GroupPanel (line 54) and add `id` when `groupIdx === 1`:

```jsx
return (
  <div
    id={groupIdx === 1 ? "group-panel-1" : undefined}
    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    style={{
      borderRadius: 8, marginBottom: 4, overflow: "visible",
      border: `1px solid ${dragOver ? color + "66" : isEmpty ? t.borderSubtle : color + "22"}`,
      background: dragOver ? color + "0c" : "transparent",
      transition: "all 0.15s",
      minHeight: isEmpty ? 0 : undefined,
    }}
  >
```

- [ ] **Step 2: Add `id="overlays-section-1"` to OVERLAYS header div**

Find the OVERLAYS header `<div` (around line 165) and add `id` when `groupIdx === 1`:

```jsx
<div
  id={groupIdx === 1 ? "overlays-section-1" : undefined}
  onClick={() => setShowOverlays(v => !v)}
  style={{ fontSize: 11, color: t.text3, fontWeight: 700, letterSpacing: 0.6, fontFamily: FONT_DISPLAY, cursor: "pointer", userSelect: "none" }}
>
  OVERLAYS <span style={{ color: t.text4, fontWeight: 500 }}>({referenceOverlays.length})</span> {showOverlays ? "▾" : "▸"}
</div>
```

### SignalCard.jsx

- [ ] **Step 3: Add `id="signal-card-0"` to SignalCard root div**

The component receives `index` as a prop (line 9). Find the root `<div` of the SignalCard return and add the `id`:

```jsx
// In SignalCard.jsx, root div of the return
<div
  id={index === 0 ? "signal-card-0" : undefined}
  style={{ ... }} // existing styles unchanged
>
```

Check what the actual root element is — read `src/components/SignalCard.jsx` lines 30–50 to find the outermost JSX return div, then add `id={index === 0 ? "signal-card-0" : undefined}` to it.

- [ ] **Step 4: Verify in browser**

Load a CSV with at least 2 signals. In DevTools console:
```js
document.querySelector('#signal-card-0')   // first signal card
document.querySelector('#group-panel-1')   // second group panel
document.querySelector('#overlays-section-1') // OVERLAYS row in group 1 panel
```

- [ ] **Step 5: Commit**

```bash
cd C:/DevSpace/Work/tracelab
git add src/components/GroupPanel.jsx src/components/SignalCard.jsx
git commit -m "feat: add id attrs to GroupPanel and SignalCard for tutorial"
```

---

## Task 4: Create tutorial.css

**Files:**
- Create: `src/components/tutorial/tutorial.css`

- [ ] **Step 1: Create the directory and css file**

```bash
mkdir -p C:/DevSpace/Work/tracelab/src/components/tutorial
```

Create `src/components/tutorial/tutorial.css` with this exact content:

```css
/* ── Backdrop ── */
.tutorial-backdrop {
  position: absolute;
  border-radius: 6px;
  pointer-events: none;
  transition:
    top 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    left 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    border-radius 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.tutorial-backdrop.has-target {
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
}
.tutorial-backdrop.no-target {
  inset: 0;
  border-radius: 0;
  background: rgba(0, 0, 0, 0.55);
}

/* ── Pulse Ring ── */
.tutorial-pulse {
  position: absolute;
  border-radius: 8px;
  pointer-events: none;
  transition:
    top 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    left 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.tutorial-pulse::before,
.tutorial-pulse::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  border: 2px solid var(--pulse-color, #8b8ff5);
  animation: tutorialPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.tutorial-pulse::after {
  animation-delay: 0.6s;
}
@keyframes tutorialPulse {
  0%   { transform: scale(1);    opacity: 0.7; }
  70%  { transform: scale(1.18); opacity: 0;   }
  100% { transform: scale(1.18); opacity: 0;   }
}

/* ── Coach Card ── */
.tutorial-card {
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 0.28s ease,
    transform 0.28s ease,
    top 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    left 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}
.tutorial-card.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.tutorial-card.centered {
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%);
}
.tutorial-card.centered.visible {
  transform: translate(-50%, -50%);
}

/* ── Card Arrow ── */
.tutorial-card-arrow.arrow-top    { top: -7px;    border-bottom: none; border-right: none;  }
.tutorial-card-arrow.arrow-bottom { bottom: -7px;  border-top: none;    border-left: none;   }
.tutorial-card-arrow.arrow-left   { left: -7px;   border-top: none;    border-right: none;  }
.tutorial-card-arrow.arrow-right  { right: -7px;  border-bottom: none; border-left: none;   }

/* ── Diagram SVG sizing ── */
.tutorial-diagram svg {
  width: 100%;
  max-width: 280px;
  height: auto;
}
```

- [ ] **Step 2: Verify file was created**

```bash
cat C:/DevSpace/Work/tracelab/src/components/tutorial/tutorial.css | head -5
```

Expected output starts with `/* ── Backdrop ── */`.

- [ ] **Step 3: Commit**

```bash
cd C:/DevSpace/Work/tracelab
git add src/components/tutorial/tutorial.css
git commit -m "feat: add tutorial.css with pulse keyframes and card transitions"
```

---

## Task 5: Create steps.js

**Files:**
- Create: `src/components/tutorial/steps.js`

- [ ] **Step 1: Create steps.js**

Create `src/components/tutorial/steps.js` with this exact content:

```js
/**
 * buildSteps(t) — returns the 17-step tutorial array for TraceLab.
 * t: THEMES[theme] object — provides accent, bg, panel, border, text1/2/3, green, cursor2 etc.
 * SVG colors are injected as template literals so they follow dark/light theme.
 */
export function buildSteps(t) {
  return [
    /* 1 — Welcome */
    {
      target: null,
      title: 'Welcome to TraceLab',
      desc: 'TraceLab is a browser-based PLC trend CSV viewer. Load a Studio 5000 CSV, explore signals across grouped chart panes, and export annotated snapshots — all without installing anything.',
      prefer: null,
      svg: `<svg viewBox="0 0 280 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="264" height="74" rx="6" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <line x1="28" y1="72" x2="260" y2="72" stroke="${t.border}" stroke-width="1"/>
        <line x1="28" y1="16" x2="28" y2="72" stroke="${t.border}" stroke-width="1"/>
        <path d="M28 62 C55 62 65 30 95 30 C125 30 138 54 168 50 C198 46 220 34 260 30" stroke="${t.accent}" stroke-width="2" fill="none"/>
        <path d="M28 68 C60 66 85 48 115 44 C145 40 160 58 195 56 C218 55 242 46 260 42" stroke="${t.green}" stroke-width="1.5" fill="none"/>
        <text x="144" y="86" font-size="8" fill="${t.text3}" text-anchor="middle" font-family="JetBrains Mono, monospace">TRACELAB</text>
      </svg>`,
    },

    /* 2 — Loading a CSV */
    {
      target: '#btn-load-csv',
      title: 'Loading a CSV',
      desc: 'Click Load CSV to open a Studio 5000 trend export. All signal columns, timestamps, and tag metadata are read automatically. You can also drag-and-drop a CSV file anywhere on the window.',
      prefer: 'bottom',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="70" y="10" width="60" height="50" rx="5" stroke="${t.border}" stroke-width="1.5" fill="${t.bg}"/>
        <polyline points="110,10 130,10 130,28 110,28" stroke="${t.accent}" stroke-width="1" fill="${t.accentDim}"/>
        <line x1="80" y1="36" x2="122" y2="36" stroke="${t.border}" stroke-width="1"/>
        <line x1="80" y1="42" x2="118" y2="42" stroke="${t.border}" stroke-width="1"/>
        <line x1="80" y1="48" x2="110" y2="48" stroke="${t.border}" stroke-width="1"/>
        <text x="86" y="23" font-size="8" fill="${t.accent}" font-family="JetBrains Mono, monospace">.CSV</text>
        <line x1="138" y1="35" x2="158" y2="35" stroke="${t.accent}" stroke-width="1.5"/>
        <polygon points="158,30 168,35 158,40" fill="${t.accent}"/>
        <rect x="172" y="16" width="44" height="38" rx="4" stroke="${t.green}" stroke-width="1.5" fill="${t.bg}"/>
        <line x1="179" y1="26" x2="208" y2="26" stroke="${t.green}" stroke-width="1"/>
        <line x1="179" y1="32" x2="204" y2="32" stroke="${t.green}" stroke-width="1"/>
        <line x1="179" y1="38" x2="206" y2="38" stroke="${t.green}" stroke-width="1"/>
        <line x1="179" y1="44" x2="200" y2="44" stroke="${t.green}" stroke-width="1"/>
      </svg>`,
    },

    /* 3 — Signals Visibility & Reorder */
    {
      target: '#tab-signals',
      title: 'Signals — Visibility & Reorder',
      desc: 'The Signals tab lists every loaded tag. Click the colored square to toggle a signal on or off. Drag signal cards between Group panels to reorganize them into separate chart panes.',
      prefer: 'right',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="8" width="120" height="22" rx="4" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <rect x="16" y="14" width="10" height="10" rx="2" fill="${t.accent}" opacity="0.9"/>
        <line x1="32" y1="19" x2="90" y2="19" stroke="${t.text2}" stroke-width="1"/>
        <text x="95" y="22" font-size="8" fill="${t.green}" font-family="JetBrains Mono, monospace">●</text>
        <rect x="10" y="34" width="120" height="22" rx="4" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <rect x="16" y="40" width="10" height="10" rx="2" fill="${t.text4}" opacity="0.5"/>
        <line x1="32" y1="45" x2="90" y2="45" stroke="${t.text3}" stroke-width="1" stroke-dasharray="3 2"/>
        <text x="95" y="48" font-size="8" fill="${t.text4}" font-family="JetBrains Mono, monospace">○</text>
        <rect x="10" y="60" width="120" height="22" rx="4" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <rect x="16" y="66" width="10" height="10" rx="2" fill="${t.cursor2}" opacity="0.9"/>
        <line x1="32" y1="71" x2="90" y2="71" stroke="${t.cursor2}" stroke-width="1"/>
        <text x="95" y="74" font-size="8" fill="${t.green}" font-family="JetBrains Mono, monospace">●</text>
        <line x1="152" y1="20" x2="270" y2="20" stroke="${t.accent}" stroke-width="1.5"/>
        <line x1="152" y1="45" x2="270" y2="45" stroke="${t.text3}" stroke-width="1" stroke-dasharray="4 3" opacity="0.4"/>
        <line x1="152" y1="71" x2="270" y2="71" stroke="${t.cursor2}" stroke-width="1.5"/>
      </svg>`,
    },

    /* 4 — Signals Style Editing */
    {
      target: '#signal-card-0',
      title: 'Signals — Style Editing',
      desc: 'Click the gear/swatch on any signal card to open style options: change color, line dash pattern, stroke weight, or opacity. You can also rename a tag\'s display label here.',
      prefer: 'right',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="12" width="130" height="58" rx="6" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <rect x="16" y="18" width="10" height="10" rx="2" fill="${t.accent}"/>
        <line x1="32" y1="23" x2="96" y2="23" stroke="${t.accent}" stroke-width="1.5"/>
        <rect x="102" y="18" width="28" height="10" rx="3" fill="${t.accentDim}" stroke="${t.accentBorder}" stroke-width="1"/>
        <text x="116" y="26" font-size="7" fill="${t.accent}" text-anchor="middle" font-family="JetBrains Mono, monospace">style</text>
        <line x1="16" y1="38" x2="130" y2="38" stroke="${t.borderSubtle}" stroke-width="1"/>
        <circle cx="22" cy="52" r="5" fill="${t.accent}" opacity="0.8"/>
        <circle cx="34" cy="52" r="5" fill="${t.green}" opacity="0.8"/>
        <circle cx="46" cy="52" r="5" fill="${t.cursor2}" opacity="0.8"/>
        <circle cx="58" cy="52" r="5" fill="${t.isolate}" opacity="0.8"/>
        <line x1="75" y1="52" x2="110" y2="52" stroke="${t.text2}" stroke-width="1.5"/>
        <line x1="118" y1="52" x2="130" y2="52" stroke="${t.text2}" stroke-width="1.5" stroke-dasharray="3 2"/>
        <line x1="160" y1="20" x2="270" y2="20" stroke="${t.accent}" stroke-width="2"/>
        <line x1="160" y1="40" x2="270" y2="40" stroke="${t.green}" stroke-width="1.5" stroke-dasharray="6 3"/>
        <line x1="160" y1="60" x2="270" y2="60" stroke="${t.cursor2}" stroke-width="1"/>
      </svg>`,
    },

    /* 5 — Chart Cursor & Navigation */
    {
      target: '#chart-pane-0',
      title: 'Chart Cursor & Navigation',
      desc: 'Click the chart to place a cursor — signal values snap to the nearest sample and appear as pills above each line. Scroll to zoom in/out. Drag to pan. The time axis updates as you navigate.',
      prefer: 'top',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="264" height="64" rx="4" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <path d="M20 55 C55 55 70 22 100 22 C130 22 145 50 175 46 C205 42 225 30 265 26" stroke="${t.accent}" stroke-width="2" fill="none"/>
        <path d="M20 62 C55 60 80 40 110 38 C140 36 158 55 192 52 C215 50 242 42 265 38" stroke="${t.green}" stroke-width="1.5" fill="none"/>
        <line x1="160" y1="12" x2="160" y2="68" stroke="${t.cursor1}" stroke-width="1" stroke-dasharray="3 2" opacity="0.7"/>
        <circle cx="160" cy="37" r="3" fill="${t.accent}"/>
        <circle cx="160" cy="47" r="3" fill="${t.green}"/>
        <rect x="142" y="8" width="36" height="10" rx="3" fill="${t.accent}" opacity="0.9"/>
        <text x="160" y="15" font-size="7" fill="${t.bg}" text-anchor="middle" font-family="JetBrains Mono, monospace">2.45</text>
      </svg>`,
    },

    /* 6 — Edge Values & Peaks */
    {
      target: '#btn-edges',
      title: 'Edge Values & Peaks',
      desc: 'Edges shows the signal value at the left and right edges of the current view — useful when signals enter or exit the visible range. Peaks marks the per-signal min and max within the current view.',
      prefer: 'bottom',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="264" height="64" rx="4" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <path d="M20 55 C60 55 80 22 115 22 C150 22 165 50 200 46 C225 43 245 32 265 28" stroke="${t.accent}" stroke-width="2" fill="none"/>
        <text x="22" y="51" font-size="7" fill="${t.warn}" font-family="JetBrains Mono, monospace">54.2</text>
        <text x="238" y="24" font-size="7" fill="${t.warn}" font-family="JetBrains Mono, monospace">28.1</text>
        <circle cx="115" cy="22" r="4" fill="none" stroke="${t.accent}" stroke-width="1.5"/>
        <text x="115" y="16" font-size="6" fill="${t.accent}" text-anchor="middle" font-family="JetBrains Mono, monospace">MAX</text>
        <circle cx="200" cy="46" r="4" fill="none" stroke="${t.text3}" stroke-width="1.5"/>
        <text x="200" y="58" font-size="6" fill="${t.text3}" text-anchor="middle" font-family="JetBrains Mono, monospace">MIN</text>
      </svg>`,
    },

    /* 7 — Delta Mode */
    {
      target: '#btn-delta',
      title: 'Delta Mode',
      desc: 'Delta Mode places two independent cursors. Click to set cursor 1, right-click (or second click) to set cursor 2. The time difference and value difference between cursors appear as a readout in the chart.',
      prefer: 'bottom',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="264" height="64" rx="4" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <path d="M20 55 C60 55 80 25 115 22 C150 19 165 50 200 46 C225 43 245 30 265 26" stroke="${t.accent}" stroke-width="2" fill="none"/>
        <line x1="100" y1="12" x2="100" y2="68" stroke="${t.cursor1}" stroke-width="1" stroke-dasharray="3 2" opacity="0.8"/>
        <line x1="180" y1="12" x2="180" y2="68" stroke="${t.cursor2}" stroke-width="1" stroke-dasharray="3 2" opacity="0.8"/>
        <circle cx="100" cy="23" r="3" fill="${t.cursor1}"/>
        <circle cx="180" cy="45" r="3" fill="${t.cursor2}"/>
        <path d="M100 14 L180 14" stroke="${t.text3}" stroke-width="1"/>
        <text x="140" y="12" font-size="7" fill="${t.cursor2}" text-anchor="middle" font-family="JetBrains Mono, monospace">Δt = 0.8s</text>
        <path d="M182 23 L182 45" stroke="${t.cursor2}" stroke-width="1"/>
        <text x="210" y="36" font-size="7" fill="${t.cursor2}" font-family="JetBrains Mono, monospace">Δ = 22.1</text>
      </svg>`,
    },

    /* 8 — Groups & Panes */
    {
      target: '#group-panel-1',
      title: 'Groups & Panes',
      desc: 'Signals are organized into Groups — each group gets its own chart pane. Drag a signal card into a different Group panel to move it. Double-click a group name to rename it.',
      prefer: 'right',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="264" height="30" rx="4" stroke="${t.accent}44" stroke-width="1" fill="${t.bg}"/>
        <rect x="8" y="42" width="264" height="30" rx="4" stroke="${t.cursor2}44" stroke-width="1" fill="${t.bg}"/>
        <text x="15" y="19" font-size="7" fill="${t.accent}" font-family="JetBrains Mono, monospace">GROUP A</text>
        <path d="M20 32 C60 32 80 15 115 14 C148 13 165 28 264 26" stroke="${t.accent}" stroke-width="1.5" fill="none"/>
        <text x="15" y="53" font-size="7" fill="${t.cursor2}" font-family="JetBrains Mono, monospace">GROUP B</text>
        <path d="M20 65 C55 65 75 52 110 50 C145 48 165 62 264 58" stroke="${t.cursor2}" stroke-width="1.5" fill="none"/>
        <line x1="8" y1="38" x2="272" y2="38" stroke="${t.border}" stroke-width="1"/>
      </svg>`,
    },

    /* 9 — Derived Signals — Adding */
    {
      target: '#btn-add-derived-0',
      title: 'Derived Signals — Adding One',
      desc: 'Click + Derived in the chart pane header to open the derived signal dialog. You can create a new signal as a math expression, rolling average, difference, ratio, or other combination of loaded signals.',
      prefer: 'top',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="264" height="18" rx="3" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <text x="16" y="20" font-size="8" fill="${t.accent}" font-family="JetBrains Mono, monospace" font-weight="700">GROUP A</text>
        <rect x="200" y="11" width="64" height="12" rx="3" fill="${t.accent}22" stroke="${t.accent}66" stroke-width="1"/>
        <text x="232" y="20" font-size="8" fill="${t.accent}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700">+ Derived</text>
        <rect x="8" y="30" width="264" height="42" rx="3" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <path d="M20 64 C60 64 80 38 115 38 C148 38 165 60 264 55" stroke="${t.accent}" stroke-width="1.5" fill="none"/>
        <path d="M20 70 C55 68 80 52 264 48" stroke="${t.green}" stroke-width="1.5" stroke-dasharray="5 3" fill="none"/>
      </svg>`,
    },

    /* 10 — Derived Signals — The Dialog */
    {
      target: null,
      title: 'Derived Signals — The Dialog',
      desc: 'In the dialog, pick a type (Equation, Difference, Rolling Avg, etc.) then configure its parameters. Equation mode supports token syntax: s0, s1 ... for each loaded signal, plus standard math like avg(s0), abs(s0 - s1).',
      prefer: null,
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="8" width="220" height="64" rx="6" stroke="${t.border}" stroke-width="1" fill="${t.panel}"/>
        <text x="140" y="22" font-size="9" fill="${t.text2}" text-anchor="middle" font-family="JetBrains Mono, monospace">Add Derived Signal</text>
        <rect x="42" y="28" width="196" height="16" rx="3" fill="${t.bg}" stroke="${t.border}" stroke-width="1"/>
        <text x="50" y="39" font-size="8" fill="${t.accent}" font-family="JetBrains Mono, monospace">s0 - s1</text>
        <line x1="42" y1="50" x2="238" y2="50" stroke="${t.border}" stroke-width="1" stroke-dasharray="2 2" opacity="0.5"/>
        <rect x="42" y="55" width="60" height="12" rx="3" fill="${t.surface}" stroke="${t.border}" stroke-width="1"/>
        <rect x="108" y="55" width="60" height="12" rx="3" fill="${t.accent}" stroke="${t.accent}" stroke-width="1"/>
        <text x="72" y="63" font-size="7" fill="${t.text2}" text-anchor="middle" font-family="JetBrains Mono, monospace">Cancel</text>
        <text x="138" y="63" font-size="7" fill="${t.bg}" text-anchor="middle" font-family="JetBrains Mono, monospace">Add</text>
      </svg>`,
    },

    /* 11 — References — Adding */
    {
      target: '#btn-add-reference-0',
      title: 'References — Adding One',
      desc: 'Click + Reference in the chart pane header to add a horizontal line, horizontal band, vertical sample line, or vertical sample band overlay. Reference overlays are stored per Group.',
      prefer: 'top',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="264" height="18" rx="3" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <text x="16" y="20" font-size="8" fill="${t.accent}" font-family="JetBrains Mono, monospace" font-weight="700">GROUP A</text>
        <rect x="172" y="11" width="92" height="12" rx="3" fill="${t.green}22" stroke="${t.green}66" stroke-width="1"/>
        <text x="218" y="20" font-size="8" fill="${t.green}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700">+ Reference</text>
        <rect x="8" y="30" width="264" height="42" rx="3" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <path d="M20 58 C60 58 80 36 115 36 C148 36 165 56 264 51" stroke="${t.accent}" stroke-width="1.5" fill="none"/>
        <line x1="20" y1="48" x2="264" y2="48" stroke="${t.warn}" stroke-width="1" stroke-dasharray="4 3"/>
        <rect x="20" y="42" width="244" height="12" rx="2" fill="${t.warn}" opacity="0.08"/>
      </svg>`,
    },

    /* 12 — References — Configuring */
    {
      target: '#overlays-section-1',
      title: 'References — Configuring',
      desc: 'The OVERLAYS section in each Group panel lists all reference overlays for that pane. Set the label, value, axis (horizontal Y or vertical sample), color, line vs band, and dashed toggle — all live.',
      prefer: 'right',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="130" height="64" rx="5" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <text x="16" y="20" font-size="7" fill="${t.text3}" font-weight="700" font-family="JetBrains Mono, monospace">OVERLAYS (1)</text>
        <rect x="14" y="26" width="116" height="22" rx="3" fill="${t.surface}" stroke="${t.borderSubtle}" stroke-width="1"/>
        <rect x="18" y="30" width="8" height="8" rx="1" fill="${t.warn}" opacity="0.7"/>
        <rect x="30" y="30" width="42" height="8" rx="2" fill="${t.inputBg}" stroke="${t.inputBorder}" stroke-width="0.5"/>
        <text x="34" y="37" font-size="6" fill="${t.text2}" font-family="JetBrains Mono, monospace">Limit</text>
        <rect x="76" y="30" width="24" height="8" rx="2" fill="${t.inputBg}" stroke="${t.inputBorder}" stroke-width="0.5"/>
        <text x="80" y="37" font-size="6" fill="${t.text2}" font-family="JetBrains Mono, monospace">100</text>
        <rect x="104" y="30" width="22" height="8" rx="2" fill="${t.red}14" stroke="${t.red}55" stroke-width="0.5"/>
        <text x="115" y="37" font-size="8" fill="${t.red}" text-anchor="middle" font-family="JetBrains Mono, monospace">×</text>
        <text x="18" y="60" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">H Line  ·  Y axis  ·  dashed</text>
        <line x1="150" y1="40" x2="270" y2="40" stroke="${t.warn}" stroke-width="1" stroke-dasharray="4 3"/>
        <rect x="150" y="34" width="120" height="12" rx="2" fill="${t.warn}" opacity="0.08"/>
        <path d="M150 65 C185 65 200 38 235 36 C258 35 262 44 270 42" stroke="${t.accent}" stroke-width="1.5" fill="none"/>
      </svg>`,
    },

    /* 13 — Comparison Mode — Loading */
    {
      target: '#btn-add-csv',
      title: 'Comparison Mode — Loading',
      desc: 'With a CSV already loaded, click + CSV to load a second trend file. TraceLab will ask whether to merge the signals into the current dataset or open it as a Comparison dataset in its own chart lane.',
      prefer: 'bottom',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="14" width="52" height="52" rx="5" stroke="${t.border}" stroke-width="1.5" fill="${t.bg}"/>
        <text x="46" y="32" font-size="7" fill="${t.accent}" text-anchor="middle" font-family="JetBrains Mono, monospace">.CSV</text>
        <line x1="30" y1="40" x2="62" y2="40" stroke="${t.border}" stroke-width="1"/>
        <line x1="30" y1="46" x2="60" y2="46" stroke="${t.border}" stroke-width="1"/>
        <line x1="30" y1="52" x2="55" y2="52" stroke="${t.border}" stroke-width="1"/>
        <text x="92" y="44" font-size="16" fill="${t.green}" text-anchor="middle" font-family="JetBrains Mono, monospace">+</text>
        <rect x="110" y="14" width="52" height="52" rx="5" stroke="${t.green}" stroke-width="1.5" fill="${t.bg}"/>
        <text x="136" y="32" font-size="7" fill="${t.green}" text-anchor="middle" font-family="JetBrains Mono, monospace">.CSV</text>
        <line x1="120" y1="40" x2="152" y2="40" stroke="${t.green}" stroke-width="1" opacity="0.7"/>
        <line x1="120" y1="46" x2="148" y2="46" stroke="${t.green}" stroke-width="1" opacity="0.7"/>
        <line x1="120" y1="52" x2="144" y2="52" stroke="${t.green}" stroke-width="1" opacity="0.7"/>
        <rect x="172" y="20" width="90" height="40" rx="6" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <text x="217" y="34" font-size="7" fill="${t.text2}" text-anchor="middle" font-family="JetBrains Mono, monospace">How to import?</text>
        <rect x="178" y="40" width="78" height="12" rx="3" fill="${t.accent}22" stroke="${t.accent}55" stroke-width="1"/>
        <text x="217" y="48" font-size="6.5" fill="${t.accent}" text-anchor="middle" font-family="JetBrains Mono, monospace">Comparison</text>
      </svg>`,
    },

    /* 14 — Comparison Mode — Navigating */
    {
      target: '#sidebar-comparison-tabs',
      title: 'Comparison Mode — Navigating',
      desc: 'In Comparison mode, an Original / Comparison tab strip appears in the sidebar. Switch tabs to view and control each dataset\'s signals independently. Both datasets are charted in separate pane lanes.',
      prefer: 'right',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="264" height="18" rx="4" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <rect x="8" y="8" width="130" height="18" rx="4" fill="${t.accent}22"/>
        <text x="73" y="20" font-size="8" fill="${t.accent}" text-anchor="middle" font-family="JetBrains Mono, monospace">Original</text>
        <text x="201" y="20" font-size="8" fill="${t.green}" text-anchor="middle" font-family="JetBrains Mono, monospace">Comparison</text>
        <line x1="138" y1="8" x2="138" y2="26" stroke="${t.border}" stroke-width="1"/>
        <rect x="8" y="30" width="264" height="20" rx="2" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <path d="M15 44 C55 44 75 34 110 34 C145 34 165 42 264 40" stroke="${t.accent}" stroke-width="1.5" fill="none"/>
        <rect x="8" y="54" width="264" height="20" rx="2" stroke="${t.green}44" stroke-width="1" fill="${t.bg}"/>
        <path d="M15 68 C50 66 80 56 264 58" stroke="${t.green}" stroke-width="1.5" stroke-dasharray="5 3" fill="none"/>
      </svg>`,
    },

    /* 15 — Meta Tab */
    {
      target: '#tab-meta',
      title: 'Meta Tab',
      desc: 'The Meta tab shows all metadata loaded from the CSV header — trend name, scan class, date/time, and per-signal units and descriptions. You can edit display names and units directly in this tab.',
      prefer: 'right',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="8" width="260" height="64" rx="5" stroke="${t.border}" stroke-width="1" fill="${t.bg}"/>
        <text x="18" y="22" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">Trend Name</text>
        <text x="100" y="22" font-size="7" fill="${t.text1}" font-family="JetBrains Mono, monospace">Drive_Test_03</text>
        <line x1="18" y1="26" x2="262" y2="26" stroke="${t.borderSubtle}" stroke-width="1"/>
        <text x="18" y="36" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">Scan Rate</text>
        <text x="100" y="36" font-size="7" fill="${t.text1}" font-family="JetBrains Mono, monospace">10 ms</text>
        <line x1="18" y1="40" x2="262" y2="40" stroke="${t.borderSubtle}" stroke-width="1"/>
        <text x="18" y="50" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">Unit [0]</text>
        <rect x="97" y="44" width="50" height="10" rx="2" fill="${t.inputBg}" stroke="${t.inputBorder}" stroke-width="0.5"/>
        <text x="100" y="51" font-size="7" fill="${t.text1}" font-family="JetBrains Mono, monospace">RPM</text>
        <line x1="18" y1="58" x2="262" y2="58" stroke="${t.borderSubtle}" stroke-width="1"/>
        <text x="18" y="67" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">Display [0]</text>
        <rect x="97" y="61" width="80" height="10" rx="2" fill="${t.inputBg}" stroke="${t.inputBorder}" stroke-width="0.5"/>
        <text x="100" y="68" font-size="7" fill="${t.accent}" font-family="JetBrains Mono, monospace">Motor Speed</text>
      </svg>`,
    },

    /* 16 — Project Save & Load */
    {
      target: '#btn-save-project',
      title: 'Project Save & Load',
      desc: 'Save your current session — all signal groups, display names, overlay configurations, and view range — as a .tracelab file. Load it later to restore the full state without re-configuring anything.',
      prefer: 'bottom',
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="12" width="44" height="50" rx="5" stroke="${t.accent}" stroke-width="1.5" fill="${t.bg}"/>
        <path d="M30 12 L30 50 L74 50 L74 28 L56 12 Z" stroke="${t.accent}" stroke-width="1.5" fill="${t.bg}"/>
        <polyline points="56,12 56,28 74,28" stroke="${t.accent}" stroke-width="1" fill="${t.accentDim}"/>
        <rect x="38" y="38" width="28" height="18" rx="3" fill="${t.accentDim}" stroke="${t.accent}55" stroke-width="1"/>
        <text x="52" y="50" font-size="7" fill="${t.accent}" text-anchor="middle" font-family="JetBrains Mono, monospace">.trace</text>
        <text x="52" y="58" font-size="6" fill="${t.text3}" text-anchor="middle" font-family="JetBrains Mono, monospace">lab</text>
        <line x1="84" y1="37" x2="104" y2="37" stroke="${t.text3}" stroke-width="1.5" stroke-dasharray="3 2"/>
        <rect x="108" y="12" width="144" height="56" rx="5" stroke="${t.border}" stroke-width="1.5" fill="${t.bg}"/>
        <text x="116" y="24" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">groups: 2</text>
        <text x="116" y="34" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">signals: 5</text>
        <text x="116" y="44" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">overlays: 3</text>
        <text x="116" y="54" font-size="7" fill="${t.text3}" font-family="JetBrains Mono, monospace">viewRange: saved</text>
        <text x="116" y="64" font-size="7" fill="${t.green}" font-family="JetBrains Mono, monospace">✓ all state restored</text>
      </svg>`,
    },

    /* 17 — Ready */
    {
      target: null,
      title: "You're Ready!",
      desc: "That's everything TraceLab has to offer. Load a CSV and start exploring your trend data. If you need a refresher, click the ? button in the top bar to reopen this tutorial anytime.",
      prefer: null,
      svg: `<svg viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="140" cy="40" r="28" stroke="${t.green}" stroke-width="2" fill="${t.green}18"/>
        <polyline points="124,40 136,52 158,28" stroke="${t.green}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="140" cy="40" r="36" stroke="${t.green}" stroke-width="1" opacity="0.3" stroke-dasharray="4 4"/>
        <text x="140" y="76" font-size="8" fill="${t.text3}" text-anchor="middle" font-family="JetBrains Mono, monospace">TRACELAB</text>
      </svg>`,
    },
  ];
}
```

- [ ] **Step 2: Verify the file exists**

```bash
node -e "const {buildSteps} = await import('./src/components/tutorial/steps.js'); console.log(buildSteps({accent:'#8b8ff5',green:'#34d399',bg:'#161618',panel:'#1e1e21',border:'rgba(255,255,255,0.12)',text1:'#ece9e5',text2:'#b8b3ad',text3:'#918c86',text4:'#6d6862',cursor1:'#e5e3e0',cursor2:'#f0b866',warn:'#f0b866',red:'#f87171',isolate:'#a78bfa',surface:'rgba(255,255,255,0.05)',accentDim:'rgba(139,143,245,0.12)',accentBorder:'rgba(139,143,245,0.25)',inputBg:'rgba(255,255,255,0.07)',inputBorder:'rgba(255,255,255,0.2)',borderSubtle:'rgba(255,255,255,0.07)'}).length)" 2>&1
```

Expected: `17`

If Node can't do top-level await, just run `npm run dev` and check the browser console for errors after the next task wires things up.

- [ ] **Step 3: Commit**

```bash
cd C:/DevSpace/Work/tracelab
git add src/components/tutorial/steps.js
git commit -m "feat: add tutorial step definitions (17 steps with themed SVGs)"
```

---

## Task 6: Create TutorialOverlay.jsx

**Files:**
- Create: `src/components/tutorial/TutorialOverlay.jsx`

- [ ] **Step 1: Create TutorialOverlay.jsx**

```jsx
import { useState, useRef, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { FONT_DISPLAY, FONT_MONO } from "../../constants/theme";
import { buildSteps } from "./steps";
import "./tutorial.css";

const PAD = 8;
const CARD_W = 340;
const GAP = 16;

function getTargetRect(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return r;
}

function positionBackdrop(el, rect) {
  if (!el) return;
  if (!rect) {
    el.classList.remove("has-target");
    el.classList.add("no-target");
    el.style.top = el.style.left = el.style.width = el.style.height = "";
    return;
  }
  el.classList.remove("no-target");
  el.classList.add("has-target");
  el.style.top = `${rect.top - PAD}px`;
  el.style.left = `${rect.left - PAD}px`;
  el.style.width = `${rect.width + PAD * 2}px`;
  el.style.height = `${rect.height + PAD * 2}px`;
}

function positionPulse(el, rect, accentColor) {
  if (!el) return;
  if (!rect) { el.style.display = "none"; return; }
  el.style.display = "";
  el.style.top = `${rect.top - PAD}px`;
  el.style.left = `${rect.left - PAD}px`;
  el.style.width = `${rect.width + PAD * 2}px`;
  el.style.height = `${rect.height + PAD * 2}px`;
  el.style.setProperty("--pulse-color", accentColor);
}

function positionCard(cardEl, arrowEl, step, rect) {
  if (!cardEl || !arrowEl) return;
  const isCentered = !rect;
  cardEl.classList.toggle("centered", isCentered);

  if (isCentered) {
    cardEl.style.top = cardEl.style.left = "";
    arrowEl.style.display = "none";
    return;
  }

  arrowEl.style.display = "";
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardH = cardEl.offsetHeight || 280;

  let pos = step.prefer || "bottom";
  if (pos === "bottom" && rect.bottom + GAP + cardH > vh) pos = "top";
  if (pos === "top"    && rect.top - GAP - cardH < 0)    pos = "bottom";
  if (pos === "right"  && rect.right + GAP + CARD_W > vw) pos = "left";
  if (pos === "left"   && rect.left - GAP - CARD_W < 0)  pos = "right";

  let top, left;
  arrowEl.className = "tutorial-card-arrow";
  const targetCX = rect.left + rect.width / 2;
  const targetCY = rect.top + rect.height / 2;

  switch (pos) {
    case "bottom":
      top = rect.bottom + GAP;
      left = targetCX - CARD_W / 2;
      arrowEl.classList.add("arrow-top");
      break;
    case "top":
      top = rect.top - GAP - cardH;
      left = targetCX - CARD_W / 2;
      arrowEl.classList.add("arrow-bottom");
      break;
    case "right":
      top = targetCY - cardH / 2;
      left = rect.right + GAP;
      arrowEl.classList.add("arrow-left");
      break;
    case "left":
      top = targetCY - cardH / 2;
      left = rect.left - GAP - CARD_W;
      arrowEl.classList.add("arrow-right");
      break;
    default:
      top = 0; left = 0;
  }

  left = Math.max(12, Math.min(left, vw - CARD_W - 12));
  top  = Math.max(12, Math.min(top,  vh - cardH - 12));

  arrowEl.style.top = arrowEl.style.left = arrowEl.style.right = arrowEl.style.bottom = "";
  if (pos === "bottom" || pos === "top") {
    arrowEl.style.left = `${Math.max(16, Math.min(targetCX - left - 6, CARD_W - 28))}px`;
  } else {
    arrowEl.style.top = `${Math.max(16, Math.min(targetCY - top - 6, cardH - 28))}px`;
  }

  cardEl.style.top  = `${top}px`;
  cardEl.style.left = `${left}px`;
}

export default function TutorialOverlay({ open, onClose, t, theme }) {
  const [step, setStep] = useState(0);
  // Rebuild step SVGs only when theme changes
  const steps = useMemo(() => buildSteps(t), [theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const backdropRef = useRef(null);
  const pulseRef    = useRef(null);
  const cardRef     = useRef(null);
  const arrowRef    = useRef(null);

  // Reset step to 0 every time the overlay opens
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation(); e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.stopPropagation(); e.preventDefault();
        setStep(s => {
          if (s < steps.length - 1) return s + 1;
          onClose();
          return s;
        });
        return;
      }
      if (e.key === "ArrowLeft") {
        e.stopPropagation(); e.preventDefault();
        setStep(s => s > 0 ? s - 1 : s);
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, steps.length, onClose]);

  // Positioning — runs after each render when open or step changes
  useEffect(() => {
    if (!open) return;
    const position = () => {
      const s = steps[step];
      const rect = getTargetRect(s?.target);
      positionBackdrop(backdropRef.current, rect);
      positionPulse(pulseRef.current, rect, t.accent);
      positionCard(cardRef.current, arrowRef.current, s, rect);
    };
    // First pass — immediate
    position();
    // Second pass — after paint so cardEl.offsetHeight is accurate
    const raf = requestAnimationFrame(position);
    window.addEventListener("resize", position);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", position);
    };
  }, [open, step, steps, t.accent]);

  if (!open) return null;

  const currentStep = steps[step];
  const isFirst = step === 0;
  const isLast  = step === steps.length - 1;

  const cardStyle = {
    position: "absolute",
    width: CARD_W,
    maxWidth: "calc(100vw - 32px)",
    background: t.panel,
    border: `1px solid ${t.border}`,
    borderRadius: 10,
    boxShadow: t.cardShadow,
    padding: "18px 20px 14px",
    zIndex: 9001,
    fontFamily: FONT_DISPLAY,
  };

  const arrowStyle = {
    position: "absolute",
    width: 12,
    height: 12,
    background: t.panel,
    border: `1px solid ${t.border}`,
    transform: "rotate(45deg)",
    zIndex: -1,
  };

  return ReactDOM.createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9000, pointerEvents: "auto" }}
      onClick={(e) => {
        // Close when clicking the dim backdrop (not the card)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Spotlight backdrop */}
      <div className="tutorial-backdrop" ref={backdropRef} />

      {/* Pulse ring around target */}
      <div className="tutorial-pulse" ref={pulseRef} style={{ display: "none" }} />

      {/* Coach card */}
      <div className="tutorial-card visible" ref={cardRef} style={cardStyle}>
        {/* Arrow */}
        <div className="tutorial-card-arrow" ref={arrowRef} style={arrowStyle} />

        {/* Step counter */}
        <div style={{
          fontSize: 10, color: t.text3, fontFamily: FONT_MONO,
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
        }}>
          Step {step + 1} of {steps.length}
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: FONT_MONO, fontSize: 14, fontWeight: 600,
          color: t.accent, margin: "0 0 10px", letterSpacing: 0.3,
        }}>
          {currentStep.title}
        </h3>

        {/* Diagram */}
        {currentStep.svg && (
          <div
            className="tutorial-diagram"
            style={{
              display: "flex", justifyContent: "center",
              marginBottom: 12, padding: "10px 0",
              background: t.bg, borderRadius: 6,
              border: `1px solid ${t.border}`,
            }}
            dangerouslySetInnerHTML={{ __html: currentStep.svg }}
          />
        )}

        {/* Description */}
        <p style={{
          fontSize: 12.5, lineHeight: 1.65,
          color: t.text2, marginBottom: 14,
          fontFamily: FONT_DISPLAY, margin: "0 0 14px",
        }}>
          {currentStep.desc}
        </p>

        {/* Navigation bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          borderTop: `1px solid ${t.border}`, paddingTop: 12,
        }}>
          {/* Progress dots */}
          <div style={{ display: "flex", gap: 4, alignItems: "center", marginRight: "auto" }}>
            {steps.map((_, i) => (
              <span key={i} style={{
                display: "inline-block",
                width: 6, height: 6, borderRadius: "50%",
                background: i === step ? t.accent : i < step ? t.green : t.border,
                transform: i === step ? "scale(1.3)" : "none",
                transition: "background 0.2s, transform 0.2s",
                flexShrink: 0,
              }} />
            ))}
          </div>

          {/* Back */}
          <button
            disabled={isFirst}
            onClick={() => setStep(s => s - 1)}
            style={{
              padding: "5px 14px", borderRadius: 5, fontSize: 12, fontWeight: 500,
              cursor: isFirst ? "default" : "pointer",
              background: t.surface, border: `1px solid ${t.border}`,
              color: t.text2, opacity: isFirst ? 0.35 : 1, fontFamily: FONT_DISPLAY,
            }}
          >
            ← Back
          </button>

          {/* Next / Finish */}
          <button
            onClick={() => isLast ? onClose() : setStep(s => s + 1)}
            style={{
              padding: "5px 14px", borderRadius: 5, fontSize: 12, fontWeight: 600,
              cursor: "pointer",
              background: t.accent, border: `1px solid ${t.accent}`,
              color: theme === "dark" ? "#0a0a0c" : "#ffffff",
              fontFamily: FONT_DISPLAY,
            }}
          >
            {isLast ? "Finish" : "Next →"}
          </button>

          {/* Skip / Close */}
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto", background: "none", border: "none",
              color: t.text3, textDecoration: "underline",
              textUnderlineOffset: 2, fontSize: 11,
              padding: "4px 6px", cursor: "pointer", fontFamily: FONT_DISPLAY,
            }}
          >
            {isLast ? "Close" : "Skip"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: Verify no syntax errors in browser dev server**

```bash
cd C:/DevSpace/Work/tracelab && npm run dev
```

Check that Vite compiles without errors. The component is not wired up yet so nothing should change visually — just ensure no import/syntax errors.

- [ ] **Step 3: Commit**

```bash
cd C:/DevSpace/Work/tracelab
git add src/components/tutorial/TutorialOverlay.jsx
git commit -m "feat: add TutorialOverlay React portal component"
```

---

## Task 7: Wire TutorialOverlay into App.jsx

**Files:**
- Modify: `src/App.jsx`

This task adds the `tutorialOpen` state, the `?` button in the top bar, imports `TutorialOverlay`, and renders it.

- [ ] **Step 1: Add the import at the top of App.jsx**

After the existing component imports (around line 24), add:

```jsx
import TutorialOverlay from "./components/tutorial/TutorialOverlay";
```

- [ ] **Step 2: Add `tutorialOpen` state**

In the `App` function body, near the other `useState` declarations (around line 128, after `toast` state), add:

```jsx
const [tutorialOpen, setTutorialOpen] = useState(false);
```

- [ ] **Step 3: Add the `?` button between ThemeToggle and the divider**

Find this block in the right-side toolbar (around line 740):

```jsx
<ThemeToggle theme={theme} setTheme={setTheme} />
<div style={{ width: 1, height: 22, background: t.border, marginLeft: 4, marginRight: 4 }} />
```

Replace with:

```jsx
<ThemeToggle theme={theme} setTheme={setTheme} />
<button
  id="btn-tutorial"
  onClick={() => setTutorialOpen(true)}
  title="Open tutorial"
  style={{
    width: 26, height: 26, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: FONT_MONO, fontWeight: 700, fontSize: 13,
    padding: 0, flexShrink: 0,
    color: t.accent, background: "transparent",
    border: `1.5px solid ${t.accentBorder}`,
    cursor: "pointer", transition: "all 0.15s",
  }}
  onMouseEnter={e => { e.currentTarget.style.background = t.accentDim; }}
  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
>?</button>
<div style={{ width: 1, height: 22, background: t.border, marginLeft: 4, marginRight: 4 }} />
```

- [ ] **Step 4: Render TutorialOverlay at the bottom of the App return**

Find the end of the App return (the closing `</div>` before `}`). Add `<TutorialOverlay>` after all layout divs, before the final closing tag:

```jsx
      {/* Tutorial Overlay */}
      <TutorialOverlay
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        t={t}
        theme={theme}
      />
    </div>
  );
}
```

The final structure of the App return should end:

```jsx
    </div>
    {/* Tutorial Overlay */}
    <TutorialOverlay
      open={tutorialOpen}
      onClose={() => setTutorialOpen(false)}
      t={t}
      theme={theme}
    />
  );
```

Note: `TutorialOverlay` uses `ReactDOM.createPortal` internally, so it doesn't matter exactly where in the JSX tree it sits — it always renders directly into `document.body`.

- [ ] **Step 5: Verify in browser — click the `?` button**

```bash
cd C:/DevSpace/Work/tracelab && npm run dev
```

1. Open the app. A `?` button should appear in the top bar between the theme toggle and the divider.
2. Click `?`. The tutorial overlay should appear with Step 1 (Welcome, centered).
3. Press `→` or click `Next`. Steps should advance.
4. Press `Escape`. Overlay should close.
5. Click `?` again. Step counter should reset to Step 1.

- [ ] **Step 6: Verify data-dependent steps fall back to centered**

Load a CSV. Navigate to step 5 (Chart Cursor, targets `#chart-pane-0`). The spotlight should appear around the first chart pane. Navigate to a step targeting `#signal-card-0`. Spotlight should appear around the first signal card.

Without a CSV loaded: navigate to step 5. Because `#chart-pane-0` doesn't exist in the DOM, the card should fall back to centered mode (no backdrop spotlight, card centered on screen). This is the correct fallback behavior.

- [ ] **Step 7: Verify keyboard navigation**

While tutorial is open:
- `ArrowRight` / `Enter` → advances to next step
- `ArrowLeft` → goes back one step
- `Escape` → closes overlay
- Back button disabled on step 1 (opacity 0.35, cursor default)
- Next button says "Finish" on step 17, clicking it closes the overlay

- [ ] **Step 8: Verify dark/light theme switch**

Open tutorial in dark mode. Switch to light mode via theme toggle while tutorial is open. Card colors, SVG colors, backdrop — all should update to light theme tokens immediately (because `t` prop changes trigger re-render).

- [ ] **Step 9: Commit**

```bash
cd C:/DevSpace/Work/tracelab
git add src/App.jsx
git commit -m "feat: wire TutorialOverlay into App — adds ? button and tutorialOpen state"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Covered by task |
|-----------------|-----------------|
| `?` button in top bar, after ThemeToggle, before divider | Task 7 step 3 |
| No auto-launch | `open` prop only flips via `?` click — Task 7 |
| No localStorage checkbox | Not included — confirmed out of scope |
| Step count = 17 | Task 5 — 17 entries in `buildSteps` |
| React portal to `document.body` | Task 6 — `ReactDOM.createPortal` |
| Inline styles using `t.*` | Task 6 — all structural styles inline |
| `tutorial.css` keyframes only | Task 4 |
| `buildSteps(t)` pattern | Task 5 |
| All IDs: `btn-load-csv`, `btn-add-csv`, `btn-delta`, `btn-edges`, `btn-peaks`, `btn-fit`, `btn-save-project`, `btn-load-project` | Task 1 step 1 |
| `tab-signals`, `tab-meta` | Task 1 step 3 |
| `sidebar-comparison-tabs` | Task 1 step 4 |
| `chart-pane-0` | Task 2 step 1 |
| `btn-add-derived-0`, `btn-add-reference-0` | Task 2 steps 2–3 |
| `group-panel-1`, `overlays-section-1` | Task 3 steps 1–2 |
| `signal-card-0` | Task 3 step 3 |
| Centered fallback when target missing | Task 6 — `getTargetRect` returns null, `positionBackdrop`/`positionCard` handle null rect |
| Keyboard: ArrowLeft/Right, Enter, Escape | Task 6 — `useEffect` keydown handler |
| Window resize repositions | Task 6 — resize listener in positioning effect |
| Step reset to 0 on re-open | Task 6 — `useEffect([open])` |
| Progress dots (pending/active/done) | Task 6 — dots map |
| Back/Next/Skip buttons | Task 6 |
| Pulse ring animation | Task 4 + Task 6 |
| Card arrow positioning | Task 6 — `positionCard` |
| Card side-flip near viewport edge | Task 6 — adaptive pos logic |
| FONT_MONO for counter + title | Task 6 — inline styles |
| FONT_DISPLAY for body + buttons | Task 6 — inline styles |

### Placeholder scan

No "TBD", "TODO", or "similar to Task N" patterns found. All code steps contain complete, copy-ready code.

### Type consistency

- `buildSteps(t)` returns `{ target, title, desc, prefer, svg }[]` — same shape used in `TutorialOverlay.jsx`'s `currentStep.title`, `currentStep.desc`, `currentStep.svg`, `currentStep.target`, `s?.target`
- `positionCard(cardEl, arrowEl, step, rect)` — `step` is a step object with `.prefer`, consistent with usage
- `arrowRef` is a ref to the `.tutorial-card-arrow` div — `positionCard` receives `arrowRef.current` correctly
- `getTargetRect(s?.target)` — `target` is `string | null`, `querySelector` handles both

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-09-tutorial-overlay.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - Fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
