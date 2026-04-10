import { useRef, useCallback, useEffect, useMemo } from "react";
import { THEMES } from "../constants/theme";
import { normalizeToSeam } from "../utils/seamAdjustment";
import { computeRangeStats, profilePerf } from "../utils/chartPerf";
import { getGeo as computeGeo } from "../utils/canvas/paneGeo";
import { drawTraces as canvasDrawTraces } from "../utils/canvas/drawTraces";
import { drawCursors as canvasDrawCursors } from "../utils/canvas/drawCursors";

function buildDeltaCursor(label, color, isDark) {
  const badgeBg = isDark ? "#111214" : "#ffffff";
  const badgeStroke = isDark ? "#d9dbe0" : "#1c1d22";
  const textColor = isDark ? "#ffffff" : "#111214";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <line x1="12" y1="1" x2="12" y2="23" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="1" y1="12" x2="23" y2="12" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="12" cy="12" r="3.2" fill="none" stroke="${color}" stroke-width="1.5"/>
    <circle cx="18" cy="6" r="5.2" fill="${badgeBg}" fill-opacity="0.98" stroke="${badgeStroke}" stroke-width="1.2"/>
    <text x="18" y="8" text-anchor="middle" font-size="7.2" font-family="Arial, sans-serif" font-weight="800" fill="${textColor}">${label}</text>
  </svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 12 12, crosshair`;
}

export default function ChartPane({ timestamps, signalEntries, cursorIdx, setCursorIdx, cursor2Idx, setCursor2Idx, deltaMode, viewRange, setViewRange, showTimeAxis, label, compact, theme, rebaseOffset, groupColor, showPills: pillsEnabled, showEdgeValues, unifyRange, referenceOverlays = [], onOverlayChange, deltaLocked, setDeltaLocked, globalEdgeLabelWidth, globalLeftEdgeLabelWidth, showExtrema = false }) {
  const traceRef = useRef(null), cursorRef = useRef(null), containerRef = useRef(null), panStart = useRef(null), rafPending = useRef(null), pendingIdx = useRef(null), overlayDragRef = useRef(null);
  const [start, end] = viewRange; const t = THEMES[theme];
  const getPlotValue = useCallback((entry, idx) => {
    const raw = entry.signal.values[idx];
    if (raw === null || raw === undefined || Number.isNaN(raw)) return null;
    return entry.seam ? normalizeToSeam(raw, entry.seam) : raw;
  }, []);

  const rangeStatsByEntry = useMemo(() => profilePerf('pane:range-stats', () => signalEntries.map((entry) => {
    const seamKey = entry.seam ? `${entry.seam.offset}:${entry.seam.origin}:${entry.seam.span}` : 'none';
    return computeRangeStats(
      entry.signal.values,
      start,
      end,
      (_, idx) => getPlotValue(entry, idx),
      seamKey,
    );
  })), [signalEntries, start, end, getPlotValue]);

  const yRanges = useMemo(() => {
    const raw = rangeStatsByEntry.map((stats) => (stats ? [stats.min, stats.max] : null));

    if (!unifyRange || signalEntries.length <= 1) {
      return raw.map((r) => {
        if (!r) return [0, 1];
        let [mn, mx] = r;
        if (mn === mx) { mn -= 1; mx += 1; }
        const p = (mx - mn) * 0.08;
        return [mn - p, mx + p];
      });
    }

    let gMin = Infinity; let gMax = -Infinity;
    raw.forEach((r) => {
      if (!r) return;
      if (r[0] < gMin) gMin = r[0];
      if (r[1] > gMax) gMax = r[1];
    });
    if (gMin === Infinity) return raw.map(() => [0, 1]);
    if (gMin === gMax) { gMin -= 1; gMax += 1; }
    const p = (gMax - gMin) * 0.08;
    const unified = [gMin - p, gMax + p];
    return raw.map(() => unified);
  }, [rangeStatsByEntry, signalEntries.length, unifyRange]);

  // Pre-compute max right-edge label width for dynamic padding
  // Use global width (from App) so all panes align, fall back to local computation
  const rightEdgeLabelWidth = useMemo(() => {
    if (!showEdgeValues) return 0;
    if (globalEdgeLabelWidth > 0) return globalEdgeLabelWidth;
    let maxW = 0;
    signalEntries.forEach(({ signal, unit }, idx) => {
      const lastIdx = rangeStatsByEntry[idx]?.lastIdx ?? -1;
      if (lastIdx === -1 || signal.values[lastIdx] === null) return;
      const str = signal.values[lastIdx].toFixed(2) + (unit ? " " + unit : "");
      maxW = Math.max(maxW, str.length * 6.5 + 14);
    });
    return maxW;
  }, [showEdgeValues, globalEdgeLabelWidth, signalEntries, rangeStatsByEntry]);

  const leftEdgeLabelWidth = useMemo(() => {
    if (!showEdgeValues) return 0;
    if (globalLeftEdgeLabelWidth > 0) return globalLeftEdgeLabelWidth;
    let maxW = 0;
    signalEntries.forEach(({ signal, unit, isAvg }, idx) => {
      const firstIdx = rangeStatsByEntry[idx]?.firstIdx ?? -1;
      if (firstIdx === -1 || signal.values[firstIdx] === null) return;
      const str = (isAvg ? "x̄ " : "") + signal.values[firstIdx].toFixed(2) + (unit ? " " + unit : "");
      maxW = Math.max(maxW, str.length * 6.5 + 14);
    });
    return maxW;
  }, [showEdgeValues, globalLeftEdgeLabelWidth, signalEntries, rangeStatsByEntry]);

  const cursorStyle = useMemo(() => {
    if (!deltaMode) return "grab";
    const waitingForFirst = cursorIdx === null;
    const placingSecond = cursorIdx !== null && !deltaLocked;
    if (waitingForFirst) return buildDeltaCursor("1", t.cursor1, theme === "dark");
    if (placingSecond) return buildDeltaCursor("2", t.cursor2, theme === "dark");
    return buildDeltaCursor("1", t.cursor1, theme === "dark");
  }, [deltaMode, cursorIdx, deltaLocked, t.cursor1, t.cursor2, theme]);

  const getGeo = useCallback((c) => computeGeo(c, { compact, showTimeAxis, showEdgeValues, rightEdgeLabelWidth, leftEdgeLabelWidth }),
    [compact, showTimeAxis, showEdgeValues, rightEdgeLabelWidth, leftEdgeLabelWidth]);

  const drawTraces = useCallback(() => profilePerf(`pane:draw:${label || "unnamed"}`, () => {
    const canvas = traceRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); const dpr = window.devicePixelRatio || 1;
    const geo = getGeo(canvas);
    canvas.width = geo.W * dpr; canvas.height = geo.H * dpr;
    canvas.style.width = geo.W + "px"; canvas.style.height = geo.H + "px";
    ctx.scale(dpr, dpr);
    canvasDrawTraces(ctx, geo, {
      start, end, timestamps, rebaseOffset, showTimeAxis, compact, t,
      referenceOverlays, yRanges, unifyRange,
      signalEntries, rangeStatsByEntry, getPlotValue, showExtrema, groupColor,
      showEdgeValues,
    });
  }), [signalEntries, yRanges, rangeStatsByEntry, start, end, timestamps, showTimeAxis, compact, label, t, rebaseOffset, getGeo, groupColor, showEdgeValues, showExtrema, getPlotValue, referenceOverlays, unifyRange]);

  const drawCursors = useCallback(() => {
    const canvas = cursorRef.current; if (!canvas || !traceRef.current) return;
    const ctx = canvas.getContext("2d"); const dpr = window.devicePixelRatio || 1;
    const geo = getGeo(traceRef.current);
    canvas.width = geo.W * dpr; canvas.height = geo.H * dpr;
    canvas.style.width = geo.W + "px"; canvas.style.height = geo.H + "px";
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, geo.W, geo.H);
    canvasDrawCursors(ctx, geo, {
      start, end, timestamps, signalEntries, yRanges,
      cursorIdx, cursor2Idx, deltaMode, deltaLocked,
      pillsEnabled, getPlotValue, t,
    });
  }, [signalEntries, yRanges, cursorIdx, cursor2Idx, deltaMode, pillsEnabled, start, end, t, getGeo, timestamps, getPlotValue, deltaLocked]);

  useEffect(() => { drawTraces(); }, [drawTraces]);
  useEffect(() => { drawCursors(); }, [drawCursors]);
  useEffect(() => { const obs = new ResizeObserver(() => { drawTraces(); drawCursors(); }); if (containerRef.current) obs.observe(containerRef.current); return () => obs.disconnect(); }, [drawTraces, drawCursors]);

  const getIdx = useCallback((e) => { const c = traceRef.current; if (!c) return null; const { pad, plotW } = getGeo(c); const r = c.getBoundingClientRect(); const x = e.clientX - r.left - pad.left; const f = x / plotW; if (f < 0 || f > 1) return null; return Math.max(start, Math.min(end - 1, Math.round(start + f * (end - start)))); }, [start, end, getGeo]);
  const getOverlayDragTarget = useCallback((e) => {
    if (!referenceOverlays?.length || !traceRef.current) return null;
    const rect = traceRef.current.getBoundingClientRect();
    const { pad, plotW, plotH } = getGeo(traceRef.current);
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const sc = end - start || 1;
    const [yMin, yMax] = (unifyRange && yRanges.length ? yRanges[0] : yRanges[0]) || [0, 1];
    const yR = yMax - yMin || 1;
    const near = (x, y) => Math.hypot(mx - x, my - y) <= 8;
    for (let i = referenceOverlays.length - 1; i >= 0; i--) {
      const ov = referenceOverlays[i];
      if (!ov || ov.visible === false) continue;
      if (ov.axis === "x") {
        if (ov.type === "band") {
          const x1 = pad.left + (((Number(ov.sample) || 0) - start) / sc) * plotW;
          const x2 = pad.left + (((Number(ov.sampleEnd) || 0) - start) / sc) * plotW;
          if (near(x1, pad.top + 4)) return { id: ov.id, axis: "x", edge: "start" };
          if (near(x2, pad.top + 4)) return { id: ov.id, axis: "x", edge: "end" };
        } else {
          const x = pad.left + (((Number(ov.sample) || 0) - start) / sc) * plotW;
          if (near(x, pad.top + 4)) return { id: ov.id, axis: "x", edge: "single" };
        }
      } else if (ov.type === "band") {
        const y1 = pad.top + plotH - (((Math.max(Number(ov.min) || 0, Number(ov.max) || 0)) - yMin) / yR) * plotH;
        const y2 = pad.top + plotH - (((Math.min(Number(ov.min) || 0, Number(ov.max) || 0)) - yMin) / yR) * plotH;
        const hx = pad.left + plotW - 4;
        if (near(hx, y1)) return { id: ov.id, axis: "y", edge: "max" };
        if (near(hx, y2)) return { id: ov.id, axis: "y", edge: "min" };
      } else {
        const y = pad.top + plotH - (((Number(ov.value) || 0) - yMin) / yR) * plotH;
        const hx = pad.left + plotW - 4;
        if (near(hx, y)) return { id: ov.id, axis: "y", edge: "single" };
      }
    }
    return null;
  }, [referenceOverlays, getGeo, end, start, unifyRange, yRanges]);

  const handleMouseMove = useCallback((e) => {
    if (overlayDragRef.current && onOverlayChange && traceRef.current) {
      const target = overlayDragRef.current;
      const rect = traceRef.current.getBoundingClientRect();
      const { pad, plotW, plotH } = getGeo(traceRef.current);
      const sc = end - start || 1;
      const [yMin, yMax] = (unifyRange && yRanges.length ? yRanges[0] : yRanges[0]) || [0, 1];
      const yR = yMax - yMin || 1;
      const px = Math.max(pad.left, Math.min(pad.left + plotW, e.clientX - rect.left));
      const py = Math.max(pad.top, Math.min(pad.top + plotH, e.clientY - rect.top));
      if (target.axis === "x") {
        const sample = Math.round(start + ((px - pad.left) / plotW) * sc);
        onOverlayChange(target.id, target.edge === "end" ? { sampleEnd: sample } : { sample });
      } else {
        const value = yMin + ((pad.top + plotH - py) / plotH) * yR;
        if (target.edge === "max") onOverlayChange(target.id, { max: value });
        else if (target.edge === "min") onOverlayChange(target.id, { min: value });
        else onOverlayChange(target.id, { value });
      }
      return;
    }
    if (panStart.current) {
      const r = traceRef.current.getBoundingClientRect(); const { plotW: pw } = getGeo(traceRef.current);
      const dx = e.clientX - panStart.current.x; const s2 = panStart.current.end - panStart.current.start;
      const shift = Math.round((-dx / pw) * s2); let ns = panStart.current.start + shift, ne = panStart.current.end + shift;
      if (ns < 0) { ne -= ns; ns = 0; } if (ne > timestamps.length) { ns -= (ne - timestamps.length); ne = timestamps.length; }
      setViewRange([Math.max(0, ns), Math.min(timestamps.length, ne)]); return;
    }
    let idx = getIdx(e); if (idx === null) return;
    if (!deltaMode && traceRef.current) {
      const { plotW } = getGeo(traceRef.current);
      const span = Math.max(1, end - start);
      const densityScore = (signalEntries.length * span) / Math.max(1, plotW);
      const denseMoveMode = span > Math.max(7000, Math.floor(plotW * 6)) || densityScore > 90;
      if (denseMoveMode) {
        const snap = Math.max(1, Math.floor((span / Math.max(1, plotW)) * 2));
        idx = Math.round(idx / snap) * snap;
        idx = Math.max(start, Math.min(end - 1, idx));
      }
    }

    if (deltaMode) {
      // Delta mode mousemove: ONLY live-preview cursor2 after cursor1 is placed
      // and cursor2 hasn't been locked by a click yet. Never place cursor1 on move.
      if (cursorIdx !== null && !deltaLocked) {
        setCursor2Idx(idx);
      }
      // If neither cursor placed, or both locked — do nothing on hover
    } else {
      // Normal mode: update cursor position via rAF throttle
      pendingIdx.current = idx;
      if (!rafPending.current) {
        rafPending.current = requestAnimationFrame(() => {
          rafPending.current = null;
          if (pendingIdx.current !== null) setCursorIdx(pendingIdx.current);
        });
      }
    }
  }, [getIdx, getGeo, deltaMode, deltaLocked, cursorIdx, setCursorIdx, setCursor2Idx, timestamps, setViewRange, onOverlayChange, start, end, unifyRange, yRanges, signalEntries.length]);

  useEffect(() => () => { if (rafPending.current) cancelAnimationFrame(rafPending.current); }, []);

  const handleClick = useCallback((e) => {
    if (panStart.current) return;
    const idx = getIdx(e); if (idx === null) return;
    if (deltaMode) {
      if (cursorIdx === null) {
        // First click: place cursor 1, start live-previewing cursor 2
        setCursorIdx(idx);
        setCursor2Idx(null);
        setDeltaLocked(false);
      } else if (!deltaLocked) {
        // Second click: lock cursor 2 in place
        setCursor2Idx(idx);
        setDeltaLocked(true);
      } else {
        // Third click: reset — place new cursor 1, unlock cursor 2
        setCursorIdx(idx);
        setCursor2Idx(null);
        setDeltaLocked(false);
      }
    }
  }, [deltaMode, deltaLocked, cursorIdx, getIdx, setCursorIdx, setCursor2Idx, setDeltaLocked]);
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const s2 = end - start;
    if (s2 <= 1 || timestamps.length <= 1) return;

    // Use a continuous exponential zoom curve so wheel motion maps smoothly
    // across the full zoom range instead of stepping by large fixed jumps.
    const zoom = Math.exp(Math.max(-1.2, Math.min(1.2, e.deltaY * 0.0025)));
    const idx = getIdx(e);
    const center = idx !== null ? idx : Math.floor((start + end) / 2);
    const minWindow = Math.min(10, timestamps.length);
    const nc = Math.max(minWindow, Math.min(timestamps.length, s2 * zoom));
    const fr = (center - start) / s2;
    let ns = Math.round(center - fr * nc);
    let ne = Math.round(ns + nc);

    if (ns < 0) { ne -= ns; ns = 0; }
    if (ne > timestamps.length) { ns -= (ne - timestamps.length); ne = timestamps.length; }
    setViewRange([Math.max(0, ns), Math.min(timestamps.length, ne)]);
  }, [start, end, timestamps, getIdx, setViewRange]);
  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) {
      const target = getOverlayDragTarget(e);
      if (target) {
        overlayDragRef.current = target;
        e.preventDefault();
        return;
      }
    }
    if (e.button === 0 && !deltaMode) { panStart.current = { x: e.clientX, start, end }; e.preventDefault(); }
    if (e.button === 1) { panStart.current = { x: e.clientX, start, end }; e.preventDefault(); }
  }, [start, end, deltaMode, getOverlayDragTarget]);
  const handleMouseUp = useCallback(() => { panStart.current = null; overlayDragRef.current = null; }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas ref={traceRef} data-export="trace" style={{ width: "100%", height: "100%", display: "block", position: "absolute", top: 0, left: 0 }} />
      <canvas ref={cursorRef} data-export="cursor" style={{ width: "100%", height: "100%", display: "block", position: "absolute", top: 0, left: 0, cursor: cursorStyle }}
        onMouseMove={handleMouseMove} onClick={handleClick} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />
    </div>
  );
}
