# Phase 4 Performance Hardening Notes

## What was optimized

- **Pane build profiling hooks**: `profilePerf()` wraps pane-build and pane-draw hot paths.
- **Moving-average memoization**: `buildMovingAverageCached(valuesRef, window)` caches by source array identity and window size.
- **Range-stat selector caching**: `computeRangeStats(valuesRef, start, end, keyPart)` caches range scans and first/last non-null indices.
- **Shared pane-prep path**: App now routes both primary and comparison pane assembly through `buildDatasetPanes()`.
- **Large-window draw guardrail**: rendering can decimate plotted indices when the visible span is much larger than pixel width.

## Cache keys and invalidation

- Moving-average cache key: **(values array identity, window size)**.
  - Invalidates automatically when data arrays are replaced or window changes.
- Range-stat cache key: **(values array identity, start, end, seam key)**.
  - Seam key is included so seam-normalized and raw ranges do not cross-contaminate.
  - Invalidates on range/window change or data array replacement.

## Tradeoffs

- Caches are identity-based for speed and predictable invalidation. In-place mutation of `values` arrays is discouraged.
- Draw-time decimation is optional and only activated for very large windows; it keeps first/last/min/max points in each bucket to preserve extrema and shape.
- Profiling is disabled by default and activated via `globalThis.__TRACE_PERF_ENABLED__ = true`.
