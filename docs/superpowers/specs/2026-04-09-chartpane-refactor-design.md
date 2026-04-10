# ChartPane Refactor — Design Spec
**Date:** 2026-04-09  
**Status:** Approved

## Goal

Break `src/components/ChartPane.jsx` (~1060 lines) into focused modules while preserving all existing behavior. No bug fixes, no API changes, no feature additions.

---

## File Structure

```
src/utils/canvas/
  paneGeo.js              Pure getGeo(canvas, opts) → { W, H, pad, plotW, plotH }
  drawGrid.js             Grid lines + time axis labels
  drawOverlays.js         Reference overlay shapes, labels, and drag handles
  drawSignals.js          Signal traces (all stroke modes), extrema badges, Y-axis labels
  drawEdgePills.js        Left/right edge value indicator pills
  drawTraces.js           Orchestrator — calls the four above in order

src/utils/canvas/
  drawCursors.js          Cursor lines, value pills, delta shading, delta summary box

src/utils/
  computeUnrolledDelta.js Pure seam-unrolling delta math (no canvas dependency)

src/components/
  ChartPane.jsx           ~300 lines: refs, memos, useCallbacks, effects, handlers, JSX
```

`buildDeltaCursor` (SVG cursor builder) stays as a module-level helper in `ChartPane.jsx` — small, only used there.

---

## Module Interfaces

All drawing functions are plain JS — no hooks, no React. Each receives `(ctx, geo, params)`.

```js
// paneGeo.js
getGeo(canvas, { compact, showTimeAxis, showEdgeValues, rightEdgeLabelWidth, leftEdgeLabelWidth })
→ { W, H, pad, plotW, plotH }

// drawGrid.js
drawGrid(ctx, geo, { start, end, timestamps, rebaseOffset, showTimeAxis, compact, t })

// drawOverlays.js
// Defers label/handle rendering; returns queues for drawTraces to flush after signals
drawOverlays(ctx, geo, { start, end, referenceOverlays, yRanges, unifyRange, t })
→ { overlayLabelQueue, overlayHandleQueue }

// drawSignals.js
drawSignals(ctx, geo, { start, end, signalEntries, yRanges, rangeStatsByEntry,
                        getPlotValue, showExtrema, groupColor, t })

// drawEdgePills.js
drawEdgePills(ctx, geo, { signalEntries, yRanges, rangeStatsByEntry, getPlotValue, t })

// drawTraces.js  (orchestrator)
drawTraces(ctx, geo, params)
// params is the union of all sub-module params
// draw order: grid → overlays (shapes) → signals → overlay labels/handles → edge pills → border

// drawCursors.js
drawCursors(ctx, geo, { start, end, timestamps, signalEntries, yRanges,
                        cursorIdx, cursor2Idx, deltaMode, deltaLocked,
                        pillsEnabled, getPlotValue, t })

// computeUnrolledDelta.js
computeUnrolledDelta(entry, idxA, idxB) → { delta, rollovers } | null
```

---

## What Stays in ChartPane.jsx

| Concern | Details |
|---|---|
| Refs | `traceRef`, `cursorRef`, `containerRef`, `panStart`, `rafPending`, `pendingIdx`, `overlayDragRef` |
| Memos | `getPlotValue`, `rangeStatsByEntry`, `yRanges`, `rightEdgeLabelWidth`, `leftEdgeLabelWidth`, `cursorStyle`, `getGeo` |
| Draw callbacks | `drawTraces` useCallback → calls `getGeo` + canvas `drawTraces`; same for `drawCursors` |
| Effects | draw on change, draw on change, ResizeObserver |
| Interaction | `getIdx`, `getOverlayDragTarget`, `handleMouseMove`, `handleClick`, `handleWheel`, `handleMouseDown`, `handleMouseUp` |
| JSX | Two `<canvas>` elements in a container div |

---

## Constraints

- **No behavior changes** — pixel-perfect identical output
- **No technical debt fixes** — only structural extraction
- **No new abstractions** — each extracted file has exactly one responsibility already present in the original
- `computeUnrolledDelta` is the only extraction that crosses the canvas boundary; it moves to `src/utils/` because it has no canvas dependency
