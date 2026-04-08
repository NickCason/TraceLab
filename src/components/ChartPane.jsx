import { useRef, useCallback, useEffect, useMemo } from "react";
import { THEMES, FONT_DISPLAY, FONT_MONO } from "../constants/theme";
import { fmtTime } from "../utils/date";
import { normalizeToSeam } from "../utils/seamAdjustment";

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

  const yRanges = useMemo(() => {
    // Auto-range uses plotted values so seam adjustment can eliminate rollover spikes.
    const raw = signalEntries.map((entry) => {
      let min = Infinity;
      let max = -Infinity;
      for (let i = start; i < end; i++) {
        const v = getPlotValue(entry, i);
        if (v === null) continue;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (min === Infinity) return null;
      return [min, max];
    });

    if (!unifyRange || signalEntries.length <= 1) {
      // Independent ranges with per-signal padding
      return raw.map(r => {
        if (!r) return [0, 1];
        let [mn, mx] = r;
        if (mn === mx) { mn -= 1; mx += 1; }
        const p = (mx - mn) * 0.08;
        return [mn - p, mx + p];
      });
    }

    // Unified: compute global range from raw values, THEN pad once
    let gMin = Infinity, gMax = -Infinity;
    raw.forEach(r => {
      if (!r) return;
      if (r[0] < gMin) gMin = r[0];
      if (r[1] > gMax) gMax = r[1];
    });
    if (gMin === Infinity) return raw.map(() => [0, 1]);
    if (gMin === gMax) { gMin -= 1; gMax += 1; }
    const p = (gMax - gMin) * 0.08;
    const unified = [gMin - p, gMax + p];
    return raw.map(() => unified);
  }, [signalEntries, start, end, unifyRange, getPlotValue]);

  // Pre-compute max right-edge label width for dynamic padding
  // Use global width (from App) so all panes align, fall back to local computation
  const rightEdgeLabelWidth = useMemo(() => {
    if (!showEdgeValues) return 0;
    if (globalEdgeLabelWidth > 0) return globalEdgeLabelWidth;
    // Fallback: local estimate
    let maxW = 0;
    signalEntries.forEach(({ signal, unit }) => {
      for (let i = end - 1; i >= start; i--) {
        if (signal.values[i] !== null) {
          const str = signal.values[i].toFixed(2) + (unit ? " " + unit : "");
          maxW = Math.max(maxW, str.length * 6.5 + 14);
          break;
        }
      }
    });
    return maxW;
  }, [showEdgeValues, globalEdgeLabelWidth, signalEntries, start, end]);

  const leftEdgeLabelWidth = useMemo(() => {
    if (!showEdgeValues) return 0;
    if (globalLeftEdgeLabelWidth > 0) return globalLeftEdgeLabelWidth;
    let maxW = 0;
    signalEntries.forEach(({ signal, unit, isAvg }) => {
      for (let i = start; i < end; i++) {
        if (signal.values[i] !== null) {
          const str = (isAvg ? "x̄ " : "") + signal.values[i].toFixed(2) + (unit ? " " + unit : "");
          maxW = Math.max(maxW, str.length * 6.5 + 14);
          break;
        }
      }
    });
    return maxW;
  }, [showEdgeValues, globalLeftEdgeLabelWidth, signalEntries, start, end]);

  const cursorStyle = useMemo(() => {
    if (!deltaMode) return "grab";
    const waitingForFirst = cursorIdx === null;
    const placingSecond = cursorIdx !== null && !deltaLocked;
    if (waitingForFirst) return buildDeltaCursor("1", t.cursor1, theme === "dark");
    if (placingSecond) return buildDeltaCursor("2", t.cursor2, theme === "dark");
    return buildDeltaCursor("1", t.cursor1, theme === "dark");
  }, [deltaMode, cursorIdx, deltaLocked, t.cursor1, t.cursor2, theme]);

  const getGeo = useCallback((c) => {
    const rect = c.parentElement.getBoundingClientRect(); const W = rect.width, H = rect.height;
    const rightPad = showEdgeValues ? Math.max(24, rightEdgeLabelWidth + 16) : 20;
    const leftPad = showEdgeValues ? Math.max(68, leftEdgeLabelWidth + 20) : 68;
    const pad = { top: compact ? 6 : 14, bottom: showTimeAxis ? 28 : 6, left: leftPad, right: rightPad };
    return { W, H, pad, plotW: W - pad.left - pad.right, plotH: H - pad.top - pad.bottom };
  }, [compact, showTimeAxis, showEdgeValues, rightEdgeLabelWidth, leftEdgeLabelWidth]);

  const drawTraces = useCallback(() => {
    const canvas = traceRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); const dpr = window.devicePixelRatio || 1;
    const { W, H, pad, plotW, plotH } = getGeo(canvas);
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px"; ctx.scale(dpr, dpr);
    ctx.fillStyle = t.chart; ctx.fillRect(0, 0, W, H);

    // Group color indicator — subtle left bar
    if (groupColor) {
      ctx.fillStyle = groupColor; ctx.globalAlpha = 0.25;
      ctx.fillRect(0, 0, 3, H); ctx.globalAlpha = 1;
    }

    const nX = Math.max(2, Math.floor(plotW / 140)), nY = compact ? 3 : 5;
    ctx.strokeStyle = t.grid; ctx.lineWidth = 1;
    for (let i = 0; i <= nY; i++) { const y = pad.top + (plotH / nY) * i; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke(); }
    const sc = end - start;
    for (let i = 0; i <= nX; i++) {
      const x = pad.left + (plotW / nX) * i; ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + plotH); ctx.stroke();
      if (showTimeAxis) { const idx = start + Math.floor((sc / nX) * i); if (idx < timestamps.length) { ctx.fillStyle = t.text3; ctx.font = `11px ${FONT_MONO}`; ctx.textAlign = "center"; ctx.fillText(fmtTime(timestamps[idx] + rebaseOffset), x, pad.top + plotH + 16); } }
    }
    const stride = Math.max(1, Math.floor(sc / (plotW * 2)));
    const placedExtrema = [];
    const intersects = (a, b) => !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
    const placeExtremaBox = (prefX, prefY, bw, bh, kind) => {
      let fallback = { x: prefX, y: prefY };
      for (let step = 0; step < 20; step++) {
        const horiz = step === 0 ? 0 : Math.ceil(step / 2) * (bw + 5) * (step % 2 === 0 ? 1 : -1);
        const vertTier = Math.floor(step / 6);
        const vert = vertTier * (bh + 3) * (kind === "MAX" ? -1 : 1);
        const x = Math.max(pad.left, Math.min(pad.left + plotW - bw, prefX + horiz));
        const y = Math.max(pad.top, Math.min(pad.top + plotH - bh, prefY + vert));
        const candidate = { x, y, w: bw, h: bh };
        fallback = { x, y };
        if (!placedExtrema.some(box => intersects(candidate, box))) {
          placedExtrema.push(candidate);
          return { x, y };
        }
      }
      const finalBox = { x: fallback.x, y: fallback.y, w: bw, h: bh };
      placedExtrema.push(finalBox);
      return fallback;
    };
    const overlayYRange = unifyRange && yRanges.length ? yRanges[0] : null;
    if (referenceOverlays?.length) {
      const placedOverlayLabels = [];
      const intersectsLabel = (a, b) => !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
      const drawOverlayLabel = (text, prefX, prefY, color) => {
        if (!text) return;
        ctx.font = `bold 10px ${FONT_DISPLAY}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const tw = ctx.measureText(text).width;
        const w = tw + 6;
        const h = 12;
        let x = Math.max(pad.left + 2, Math.min(pad.left + plotW - w - 2, prefX));
        let y = Math.max(pad.top + 7, Math.min(pad.top + plotH - 7, prefY));
        for (let i = 0; i < 8; i++) {
          const box = { x, y: y - h / 2, w, h };
          if (!placedOverlayLabels.some((p) => intersectsLabel(box, p))) {
            placedOverlayLabels.push(box);
            break;
          }
          y = Math.min(pad.top + plotH - 7, y + h + 2);
        }
        ctx.fillStyle = color || t.warn;
        ctx.fillText(text, x + 3, y);
        ctx.textBaseline = "alphabetic";
      };
      const drawOverlayHandle = (hx, hy, color) => {
        ctx.fillStyle = t.chart; ctx.globalAlpha = 0.95;
        ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = color || t.warn; ctx.globalAlpha = 0.95; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.stroke();
      };
      referenceOverlays.forEach((ov) => {
        if (!ov || ov.visible === false) return;
        const [yMin, yMax] = overlayYRange || yRanges[0] || [0, 1];
        const yR = yMax - yMin || 1;
        if (ov.axis === "x") {
          if (ov.type === "band") {
            const s1 = Number(ov.sample);
            const s2 = Number(ov.sampleEnd);
            if (!Number.isFinite(s1) || !Number.isFinite(s2) || sc <= 0) return;
            const low = Math.min(s1, s2), high = Math.max(s1, s2);
            const x1 = pad.left + ((low - start) / sc) * plotW;
            const x2 = pad.left + ((high - start) / sc) * plotW;
            if (x2 < pad.left || x1 > pad.left + plotW) return;
            const drawX = Math.max(pad.left, x1);
            const drawW = Math.max(1, Math.min(pad.left + plotW, x2) - drawX);
            ctx.fillStyle = ov.color || t.warn;
            ctx.globalAlpha = Math.max(0, Math.min(1, Number(ov.opacity) || 0.2));
            ctx.fillRect(drawX, pad.top, drawW, plotH);
            if (ov.label) {
              ctx.globalAlpha = 0.9;
              drawOverlayLabel(ov.label, Math.max(pad.left + 6, drawX + 8), pad.top + 16, ov.color || t.warn);
            }
            drawOverlayHandle(drawX, pad.top + 4, ov.color || t.warn);
            drawOverlayHandle(drawX + drawW, pad.top + 4, ov.color || t.warn);
          } else {
            const s = Number(ov.sample);
            if (!Number.isFinite(s) || sc <= 0) return;
            const x = pad.left + ((s - start) / sc) * plotW;
            if (x < pad.left || x > pad.left + plotW) return;
            ctx.strokeStyle = ov.color || t.warn;
            ctx.globalAlpha = 0.9;
            ctx.lineWidth = 1.2;
            ctx.setLineDash(ov.dashed ? [6, 4] : []);
            ctx.beginPath();
            ctx.moveTo(x, pad.top);
            ctx.lineTo(x, pad.top + plotH);
            ctx.stroke();
            ctx.setLineDash([]);
            if (ov.label) {
              drawOverlayLabel(ov.label, Math.max(pad.left + 6, x + 8), pad.top + 16, ov.color || t.warn);
            }
            drawOverlayHandle(x, pad.top + 4, ov.color || t.warn);
          }
          ctx.globalAlpha = 1;
          return;
        }
        if (ov.type === "band") {
          const bMin = Number(ov.min);
          const bMax = Number(ov.max);
          if (!Number.isFinite(bMin) || !Number.isFinite(bMax)) return;
          const low = Math.min(bMin, bMax), high = Math.max(bMin, bMax);
          const y1 = pad.top + plotH - ((high - yMin) / yR) * plotH;
          const y2 = pad.top + plotH - ((low - yMin) / yR) * plotH;
          ctx.fillStyle = ov.color || t.warn;
          ctx.globalAlpha = Math.max(0, Math.min(1, Number(ov.opacity) || 0.2));
          ctx.fillRect(pad.left, Math.max(pad.top, y1), plotW, Math.min(plotH, y2 - y1));
          if (ov.label) {
            ctx.globalAlpha = 0.9;
            drawOverlayLabel(ov.label, pad.left + 8, Math.max(pad.top + 14, y1 + 14), ov.color || t.warn);
          }
          drawOverlayHandle(pad.left + plotW - 4, y1, ov.color || t.warn);
          drawOverlayHandle(pad.left + plotW - 4, y2, ov.color || t.warn);
        } else if (ov.type === "line") {
          const val = Number(ov.value);
          if (!Number.isFinite(val)) return;
          const y = pad.top + plotH - ((val - yMin) / yR) * plotH;
          ctx.strokeStyle = ov.color || t.warn;
          ctx.globalAlpha = 0.9;
          ctx.lineWidth = 1.2;
          ctx.setLineDash(ov.dashed ? [6, 4] : []);
          ctx.beginPath();
          ctx.moveTo(pad.left, y);
          ctx.lineTo(pad.left + plotW, y);
          ctx.stroke();
          ctx.setLineDash([]);
          if (ov.label) {
            drawOverlayLabel(ov.label, pad.left + 8, Math.max(pad.top + 14, y - 8), ov.color || t.warn);
          }
          drawOverlayHandle(pad.left + plotW - 4, y, ov.color || t.warn);
        }
        ctx.globalAlpha = 1;
      });
    }

    signalEntries.forEach((entry, si) => {
      const { signal, color, dash, strokeMode, thickness, opacity } = entry;
      const [yMin, yMax] = yRanges[si]; const yR = yMax - yMin;
      let minV = Infinity, maxV = -Infinity, minIdx = -1, maxIdx = -1;
      const activeMode = strokeMode || dash || "solid";
      const strokePx = Math.max(0.8, Number(thickness) || (signal.isDigital ? 2 : 1.5));
      const strokeAlpha = Math.max(0.1, Math.min(1, Number(opacity) || 0.9));
      ctx.strokeStyle = color; ctx.lineWidth = strokePx; ctx.globalAlpha = strokeAlpha;
      if (activeMode === "dashed") ctx.setLineDash([6, 4]);
      else if (activeMode === "dotted") ctx.setLineDash([2, 3]);
      else if (activeMode === "long_dash") ctx.setLineDash([12, 6]);
      else if (activeMode === "dash_dot") ctx.setLineDash([10, 4, 2, 4]);
      else if (activeMode === "dash_dot_dot") ctx.setLineDash([10, 4, 2, 3, 2, 4]);
      else ctx.setLineDash([]);

      // Null-aware sample finder: within a look-ahead window starting at i,
      // returns the first non-null {value, index} or null.
      // lookAhead is at least 8 even when stride=1 so that interleaved-null
      // merged datasets (every Nth index is null) still render connected lines.
      // A gap of >lookAhead consecutive nulls correctly breaks the path.
      const lookAhead = Math.max(stride, 8);
      const findInWindow = (i) => {
        const wEnd = Math.min(i + lookAhead, end);
        for (let j = i; j < wEnd; j++) {
          const cv = getPlotValue(entry, j);
          if (cv !== null) return { v: cv, vi: j };
        }
        return null;
      };

      if (activeMode === "samples") {
        for (let i = start; i < end; i += stride) {
          const found = findInWindow(i); if (!found) continue;
          const { v, vi } = found;
          if (v < minV) { minV = v; minIdx = vi; }
          if (v > maxV) { maxV = v; maxIdx = vi; }
          const x = pad.left + ((vi - start) / sc) * plotW, y = pad.top + plotH - ((v - yMin) / yR) * plotH;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(1.4, strokePx * 0.95), 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = strokeAlpha;
          ctx.fill();
        }
      } else {
        ctx.beginPath(); let started = false;
        for (let i = start; i < end; i += stride) {
          const found = findInWindow(i);
          if (!found) { started = false; continue; }
          const { v, vi } = found;
          if (v < minV) { minV = v; minIdx = vi; }
          if (v > maxV) { maxV = v; maxIdx = vi; }
          const x = pad.left + ((vi - start) / sc) * plotW, y = pad.top + plotH - ((v - yMin) / yR) * plotH;
          if (!started) { ctx.moveTo(x, y); started = true; }
          else if (signal.isDigital && vi > start) {
            // For digital step rendering, find the previous non-null value
            let pv = null;
            for (let j = vi - 1; j >= Math.max(start, vi - lookAhead); j--) {
              const cv = getPlotValue(entry, j); if (cv !== null) { pv = cv; break; }
            }
            if (pv !== null) ctx.lineTo(x, pad.top + plotH - ((pv - yMin) / yR) * plotH);
            ctx.lineTo(x, y);
          }
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        if (activeMode === "hybrid_line_points") {
          const markerStride = Math.max(stride, Math.floor((end - start) / Math.max(30, plotW / 10)));
          ctx.fillStyle = color;
          ctx.globalAlpha = Math.min(1, strokeAlpha + 0.05);
          for (let i = start; i < end; i += markerStride) {
            const found = findInWindow(i); if (!found) continue;
            const { v, vi } = found;
            const x = pad.left + ((vi - start) / sc) * plotW, y = pad.top + plotH - ((v - yMin) / yR) * plotH;
            ctx.beginPath();
            ctx.arc(x, y, Math.max(1.6, strokePx * 0.9), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      if (showExtrema && minIdx !== -1 && maxIdx !== -1) {
        const drawExtremaBadge = (idx, value, kind) => {
          const x = pad.left + ((idx - start) / sc) * plotW;
          const y = pad.top + plotH - ((value - yMin) / yR) * plotH;
          const text = `${kind} ${value.toFixed(2)}`;
          ctx.font = `bold 10px ${FONT_MONO}`;
          const tw = ctx.measureText(text).width;
          const bw = tw + 10, bh = 14;
          const prefX = Math.max(pad.left, Math.min(pad.left + plotW - bw, x + 6));
          const prefY = kind === "MAX" ? Math.max(pad.top, y - bh - 6) : Math.min(pad.top + plotH - bh, y + 6);
          const { x: bx, y: by } = placeExtremaBox(prefX, prefY, bw, bh, kind);
          ctx.fillStyle = t.chart; ctx.globalAlpha = 0.9;
          ctx.fillRect(bx, by, bw, bh);
          ctx.strokeStyle = color; ctx.globalAlpha = 0.6; ctx.lineWidth = 1;
          ctx.strokeRect(bx, by, bw, bh);
          ctx.fillStyle = color; ctx.globalAlpha = 0.95;
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          ctx.fillText(text, bx + 5, by + 10.5);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(bx + (kind === "MAX" ? 3 : Math.max(3, Math.min(bw - 3, x - bx))), kind === "MAX" ? by + bh : by);
          ctx.strokeStyle = color; ctx.globalAlpha = 0.35; ctx.stroke();
          ctx.globalAlpha = 1;
        };
        drawExtremaBadge(maxIdx, maxV, "MAX");
        if (minIdx !== maxIdx) drawExtremaBadge(minIdx, minV, "MIN");
      }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (si === 0) {
        for (let i = 0; i <= nY; i++) {
          const plotVal = yMin + ((nY - i) / nY) * yR;
          ctx.fillStyle = t.text3;
          ctx.font = `11px ${FONT_MONO}`;
          ctx.textAlign = "right";
          ctx.fillText(plotVal.toFixed(2), pad.left - 6, pad.top + (plotH / nY) * i + 3);
        }
      }
    });
    // Edge value indicators — arrows at left/right boundaries with values
    if (showEdgeValues) {
      const edgePillH = 14, edgeGap = 2;
      const drawEdge = (side) => {
        const isLeft = side === "left";
        const edgePills = [];
        signalEntries.forEach((entry, si) => {
          const { signal, color, unit, isAvg } = entry;
          const [yMin, yMax] = yRanges[si]; const yR = yMax - yMin;
          // Find first/last non-null value in view
          let idx = -1;
          if (isLeft) { for (let i = start; i < end; i++) { if (getPlotValue(entry, i) !== null) { idx = i; break; } } }
          else { for (let i = end - 1; i >= start; i--) { if (getPlotValue(entry, i) !== null) { idx = i; break; } } }
          if (idx === -1) return;
          const plotV = getPlotValue(entry, idx);
          const rawV = signal.values[idx];
          const y = pad.top + plotH - ((plotV - yMin) / yR) * plotH;
          edgePills.push({ v: rawV, y, color, unit, isAvg: !!isAvg });
        });
        if (!edgePills.length) return;
        // Sort and layout to avoid overlaps
        edgePills.sort((a, b) => a.y - b.y);
        const placed = [];
        edgePills.forEach(p => {
          let py = p.y - edgePillH / 2;
          for (const prev of placed) { if (py < prev + edgePillH + edgeGap) py = prev + edgePillH + edgeGap; }
          py = Math.max(pad.top, Math.min(pad.top + plotH - edgePillH, py));
          p._py = py; placed.push(py);
        });
        // Draw
        ctx.textBaseline = "middle";
        edgePills.forEach(p => {
          const valStr = (p.isAvg ? "x\u0305 " : "") + p.v.toFixed(2) + (p.unit ? " " + p.unit : "");
          ctx.font = `bold 10px ${FONT_MONO}`;
          const tw = ctx.measureText(valStr).width;
          const pw = tw + 14;
          const py = p._py;
          const ax = isLeft ? pad.left : pad.left + plotW; // arrow tip at plot edge
          // Left pills: arrow points right, pill sits to the left of plot edge
          // Right pills: arrow points left, pill sits to the right of plot edge
          const bx = isLeft ? ax - pw - 5 : ax + 7;

          // Arrow pointing INTO the plot
          ctx.fillStyle = p.color; ctx.globalAlpha = 0.5;
          ctx.beginPath();
          if (isLeft) {
            // Arrow points right (into plot)
            ctx.moveTo(ax, p.y); ctx.lineTo(ax - 4, p.y - 3); ctx.lineTo(ax - 4, p.y + 3);
          } else {
            // Arrow points left (into plot)
            ctx.moveTo(ax, p.y); ctx.lineTo(ax + 4, p.y - 3); ctx.lineTo(ax + 4, p.y + 3);
          }
          ctx.fill(); ctx.globalAlpha = 1;

          // Pill bg
          ctx.fillStyle = t.chart; ctx.globalAlpha = p.isAvg ? 0.92 : 0.88;
          ctx.beginPath();
          ctx.moveTo(bx + 4, py); ctx.lineTo(bx + pw - 4, py);
          ctx.quadraticCurveTo(bx + pw, py, bx + pw, py + 4);
          ctx.lineTo(bx + pw, py + edgePillH - 4);
          ctx.quadraticCurveTo(bx + pw, py + edgePillH, bx + pw - 4, py + edgePillH);
          ctx.lineTo(bx + 4, py + edgePillH);
          ctx.quadraticCurveTo(bx, py + edgePillH, bx, py + edgePillH - 4);
          ctx.lineTo(bx, py + 4);
          ctx.quadraticCurveTo(bx, py, bx + 4, py);
          ctx.fill();
          // Pill border — dashed for avg
          ctx.strokeStyle = p.color; ctx.globalAlpha = p.isAvg ? 0.6 : 0.4; ctx.lineWidth = 1;
          if (p.isAvg) ctx.setLineDash([3, 2]);
          ctx.beginPath();
          ctx.moveTo(bx + 4, py); ctx.lineTo(bx + pw - 4, py);
          ctx.quadraticCurveTo(bx + pw, py, bx + pw, py + 4);
          ctx.lineTo(bx + pw, py + edgePillH - 4);
          ctx.quadraticCurveTo(bx + pw, py + edgePillH, bx + pw - 4, py + edgePillH);
          ctx.lineTo(bx + 4, py + edgePillH);
          ctx.quadraticCurveTo(bx, py + edgePillH, bx, py + edgePillH - 4);
          ctx.lineTo(bx, py + 4);
          ctx.quadraticCurveTo(bx, py, bx + 4, py);
          ctx.stroke();
          if (p.isAvg) ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          // Value text
          ctx.fillStyle = p.color; ctx.globalAlpha = p.isAvg ? 0.8 : 0.9;
          ctx.textAlign = isLeft ? "right" : "left";
          ctx.fillText(valStr, isLeft ? bx + pw - 6 : bx + 6, py + edgePillH / 2 + 0.5);
          ctx.globalAlpha = 1;
        });
        ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
      };
      drawEdge("left");
      drawEdge("right");
    }
    ctx.strokeStyle = t.border; ctx.lineWidth = 1; ctx.strokeRect(pad.left, pad.top, plotW, plotH);
  }, [signalEntries, yRanges, start, end, timestamps, showTimeAxis, compact, label, t, rebaseOffset, getGeo, groupColor, showEdgeValues, showExtrema, getPlotValue, referenceOverlays, unifyRange]);

  const drawCursors = useCallback(() => {
    const canvas = cursorRef.current; if (!canvas || !traceRef.current) return;
    const ctx = canvas.getContext("2d"); const dpr = window.devicePixelRatio || 1;
    const { W, H, pad, plotW, plotH } = getGeo(traceRef.current);
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px"; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H); const sc = end - start;
    const drawCursorHandleTag = (x, label, color) => {
      const text = `${label} ↕`;
      const tagY = pad.top + 11;
      ctx.font = `bold 10px ${FONT_MONO}`;
      const tw = ctx.measureText(text).width;
      const bw = tw + 12, bh = 14, r = 4;
      const bx = x - bw / 2, by = tagY - bh / 2;

      // Tag background
      ctx.fillStyle = t.chart; ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.moveTo(bx + r, by); ctx.lineTo(bx + bw - r, by);
      ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
      ctx.lineTo(bx + bw, by + bh - r);
      ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
      ctx.lineTo(bx + r, by + bh);
      ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
      ctx.lineTo(bx, by + r);
      ctx.quadraticCurveTo(bx, by, bx + r, by);
      ctx.fill();

      // Border and text
      ctx.strokeStyle = color; ctx.globalAlpha = 0.65; ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(text, x, tagY + 0.5);

      // Pointer triangle toward cursor line
      const ty = by + bh;
      ctx.fillStyle = color; ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(x, ty + 4);
      ctx.lineTo(x - 3.5, ty + 0.5);
      ctx.lineTo(x + 3.5, ty + 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    };

    const drawOne = (idx, col, alpha = 0.7, showPills = false) => {
      if (idx === null || idx < start || idx >= end) return;
      const x = pad.left + ((idx - start) / sc) * plotW;
      // Dashed vertical line
      ctx.strokeStyle = col; ctx.globalAlpha = alpha; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + plotH); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;

      const pills = []; // collect pill positions to avoid overlaps
      signalEntries.forEach((entry, si) => {
        const { signal, color: c2, unit, displayName, isAvg } = entry;
        const rawV = signal.values[idx];
        const plotV = getPlotValue(entry, idx);
        if (plotV === null || rawV === null) return;
        const [mn, mx] = yRanges[si]; const y = pad.top + plotH - ((plotV - mn) / (mx - mn)) * plotH;
        // Dot — avg uses hollow diamond, original uses filled circle
        if (isAvg) {
          ctx.strokeStyle = c2; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y); ctx.closePath();
          ctx.stroke(); ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = t.dotStroke; ctx.lineWidth = 1.5; ctx.stroke();
        }

        if (showPills) {
          pills.push({ v: rawV, y, color: c2, unit, displayName, isAvg: !!isAvg });
        }
      });

      // Draw value pills — only in non-delta mode on cursor1
      if (showPills && pills.length > 0) {
        ctx.textBaseline = "middle"; ctx.textAlign = "left";
        const pillH = 16, pillGap = 2, pillPad = 6;
        const onRight = x < pad.left + plotW * 0.7;

        // Sort pills by Y position so layout flows top-to-bottom
        const sorted = pills.map((p, pi) => ({ ...p, _origIdx: pi }));
        sorted.sort((a, b) => a.y - b.y);

        // Greedy layout: place each pill at its ideal Y, push down if overlapping
        const placed = [];
        sorted.forEach((p) => {
          let py = p.y - pillH / 2;
          // Push down past any previously placed pill it overlaps
          for (const prev of placed) {
            if (py < prev + pillH + pillGap) {
              py = prev + pillH + pillGap;
            }
          }
          // Clamp inside plot area
          py = Math.max(pad.top, Math.min(pad.top + plotH - pillH, py));
          p._py = py;
          placed.push(py);
        });

        // If pills overflowed bottom, push everything up to fit
        const bottommost = placed[placed.length - 1];
        if (bottommost + pillH > pad.top + plotH) {
          const overflow = (bottommost + pillH) - (pad.top + plotH);
          sorted.forEach(p => { p._py = Math.max(pad.top, p._py - overflow); });
        }

        // Re-separate after upward shift (compact from top)
        for (let i = 1; i < sorted.length; i++) {
          const minY = sorted[i - 1]._py + pillH + pillGap;
          if (sorted[i]._py < minY) sorted[i]._py = minY;
        }

        sorted.forEach((p) => {
          const prefix = p.isAvg ? "x̄ " : "";
          const valStr = prefix + p.v.toFixed(3) + (p.unit ? " " + p.unit : "");
          ctx.font = `bold 10px ${FONT_MONO}`;
          const tw = ctx.measureText(valStr).width;
          const pillW = tw + pillPad * 2 + (p.isAvg ? 4 : 10);
          const px = onRight ? x + 10 : x - pillW - 10;
          const py = p._py;

          // Pill background
          ctx.fillStyle = t.chart; ctx.globalAlpha = p.isAvg ? 0.92 : 0.88;
          ctx.beginPath();
          ctx.moveTo(px + 4, py); ctx.lineTo(px + pillW - 4, py);
          ctx.quadraticCurveTo(px + pillW, py, px + pillW, py + 4);
          ctx.lineTo(px + pillW, py + pillH - 4);
          ctx.quadraticCurveTo(px + pillW, py + pillH, px + pillW - 4, py + pillH);
          ctx.lineTo(px + 4, py + pillH);
          ctx.quadraticCurveTo(px, py + pillH, px, py + pillH - 4);
          ctx.lineTo(px, py + 4);
          ctx.quadraticCurveTo(px, py, px + 4, py);
          ctx.fill();
          // Leader line from dot to pill
          ctx.strokeStyle = p.color; ctx.globalAlpha = 0.2; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(onRight ? x + 4 : x - 4, p.y);
          ctx.lineTo(onRight ? px : px + pillW, py + pillH / 2); ctx.stroke();
          // Pill border — dashed for avg, solid for original
          ctx.strokeStyle = p.color; ctx.globalAlpha = p.isAvg ? 0.6 : 0.4; ctx.lineWidth = 1;
          if (p.isAvg) ctx.setLineDash([3, 2]);
          ctx.beginPath();
          ctx.moveTo(px + 4, py); ctx.lineTo(px + pillW - 4, py);
          ctx.quadraticCurveTo(px + pillW, py, px + pillW, py + 4);
          ctx.lineTo(px + pillW, py + pillH - 4);
          ctx.quadraticCurveTo(px + pillW, py + pillH, px + pillW - 4, py + pillH);
          ctx.lineTo(px + 4, py + pillH);
          ctx.quadraticCurveTo(px, py + pillH, px, py + pillH - 4);
          ctx.lineTo(px, py + 4);
          ctx.quadraticCurveTo(px, py, px + 4, py);
          ctx.stroke();
          if (p.isAvg) ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          // Color pip — diamond for avg, circle for original
          if (p.isAvg) {
            ctx.fillStyle = p.color; ctx.globalAlpha = 0.7;
            const cx = px + pillPad + 2, cy = py + pillH / 2;
            ctx.beginPath(); ctx.moveTo(cx, cy - 2.5); ctx.lineTo(cx + 2.5, cy); ctx.lineTo(cx, cy + 2.5); ctx.lineTo(cx - 2.5, cy); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1;
          } else {
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(px + pillPad + 2, py + pillH / 2, 2.5, 0, Math.PI * 2); ctx.fill();
          }
          // Value text
          ctx.fillStyle = p.color; ctx.globalAlpha = p.isAvg ? 0.8 : 0.95;
          ctx.fillText(valStr, px + pillPad + (p.isAvg ? 6 : 8), py + pillH / 2 + 0.5);
          ctx.globalAlpha = 1;
        });
        ctx.textBaseline = "alphabetic";
      }
    };

    drawOne(cursorIdx, t.cursor1, 0.7, pillsEnabled && !deltaMode);
    if (deltaMode && cursorIdx !== null) {
      const x1 = pad.left + ((cursorIdx - start) / sc) * plotW;

      if (cursor2Idx !== null) {
        const x2 = pad.left + ((cursor2Idx - start) / sc) * plotW;
        const xL = Math.min(x1, x2), xR = Math.max(x1, x2);

        // 1) Delta shading FIRST (behind everything)
        ctx.fillStyle = t.cursor2Bg; ctx.fillRect(xL, pad.top, xR - xL, plotH);

        // 2) Redraw both cursor lines + dots on top of shading
        drawOne(cursorIdx, t.cursor1, 0.7, false);
        drawOne(cursor2Idx, t.cursor2, 0.6, false);

        // 3) Cursor handle labels — distinct for first vs second handle
        drawCursorHandleTag(x1, "1", t.cursor1);
        drawCursorHandleTag(x2, "2", t.cursor2);

        // Per-signal delta pills at both cursors (if pills enabled)
        if (pillsEnabled) {
          const pillH = 14, pillGap = 2, pillPad = 5;
          // Collect values at both cursors
          const c1Pills = [], c2Pills = [];
          signalEntries.forEach((entry, si) => {
            const { signal, color: c2color, unit, isAvg } = entry;
            const v1 = signal.values[cursorIdx];
            const v2 = signal.values[cursor2Idx];
            const p1 = getPlotValue(entry, cursorIdx);
            const p2 = getPlotValue(entry, cursor2Idx);
            const [mn, mx] = yRanges[si];
            if (v1 !== null && p1 !== null) c1Pills.push({ v: v1, y: pad.top + plotH - ((p1 - mn) / (mx - mn)) * plotH, color: c2color, unit, isAvg: !!isAvg });
            if (v2 !== null && p2 !== null) c2Pills.push({ v: v2, y: pad.top + plotH - ((p2 - mn) / (mx - mn)) * plotH, color: c2color, unit, isAvg: !!isAvg });
          });

          // Layout helper
          const layoutPills = (pills, anchorX, side) => {
            if (!pills.length) return;
            pills.sort((a, b) => a.y - b.y);
            const placed = [];
            pills.forEach(p => {
              let py = p.y - pillH / 2;
              for (const prev of placed) { if (py < prev + pillH + pillGap) py = prev + pillH + pillGap; }
              py = Math.max(pad.top + 14, Math.min(pad.top + plotH - pillH, py));
              p._py = py; placed.push(py);
            });
            ctx.textBaseline = "middle";
            pills.forEach(p => {
              const valStr = (p.isAvg ? "x\u0305 " : "") + p.v.toFixed(3) + (p.unit ? " " + p.unit : "");
              ctx.font = `bold 9px ${FONT_MONO}`;
              const tw = ctx.measureText(valStr).width;
              const pw = tw + 12; // 6px padding each side
              const px = side === "left" ? anchorX - pw - 6 : anchorX + 6;
              const py = p._py;
              // Background
              ctx.fillStyle = t.chart; ctx.globalAlpha = p.isAvg ? 0.92 : 0.88;
              ctx.beginPath();
              ctx.moveTo(px + 4, py); ctx.lineTo(px + pw - 4, py);
              ctx.quadraticCurveTo(px + pw, py, px + pw, py + 4);
              ctx.lineTo(px + pw, py + pillH - 4);
              ctx.quadraticCurveTo(px + pw, py + pillH, px + pw - 4, py + pillH);
              ctx.lineTo(px + 4, py + pillH);
              ctx.quadraticCurveTo(px, py + pillH, px, py + pillH - 4);
              ctx.lineTo(px, py + 4);
              ctx.quadraticCurveTo(px, py, px + 4, py);
              ctx.fill();
              // Border — dashed for avg
              ctx.strokeStyle = p.color; ctx.globalAlpha = p.isAvg ? 0.6 : 0.4; ctx.lineWidth = 1;
              if (p.isAvg) ctx.setLineDash([3, 2]);
              ctx.beginPath();
              ctx.moveTo(px + 4, py); ctx.lineTo(px + pw - 4, py);
              ctx.quadraticCurveTo(px + pw, py, px + pw, py + 4);
              ctx.lineTo(px + pw, py + pillH - 4);
              ctx.quadraticCurveTo(px + pw, py + pillH, px + pw - 4, py + pillH);
              ctx.lineTo(px + 4, py + pillH);
              ctx.quadraticCurveTo(px, py + pillH, px, py + pillH - 4);
              ctx.lineTo(px, py + 4);
              ctx.quadraticCurveTo(px, py, px + 4, py);
              ctx.stroke();
              if (p.isAvg) ctx.setLineDash([]);
              ctx.globalAlpha = 1;
              // Value text — centered in pill
              ctx.fillStyle = p.color; ctx.globalAlpha = p.isAvg ? 0.8 : 0.95;
              ctx.textAlign = "center";
              ctx.fillText(valStr, px + pw / 2, py + pillH / 2 + 0.5);
              ctx.globalAlpha = 1;
              ctx.textAlign = "left";
            });
            ctx.textBaseline = "alphabetic";
          };

          // Cursor1 pills on left side of line, cursor2 on right
          const c1Side = x1 <= x2 ? "left" : "right";
          const c2Side = x1 <= x2 ? "right" : "left";
          layoutPills(c1Pills, x1, c1Side);
          layoutPills(c2Pills, x2, c2Side);
        }

        const computeUnrolledDelta = (entry, idxA, idxB) => {
          const span = entry?.seam?.span;
          if (!span || span <= 0 || idxA === idxB) return null;
          const threshold = span * 0.5;
          const dir = idxB > idxA ? 1 : -1;
          let prev = entry.signal.values[idxA];
          if (prev === null || prev === undefined || Number.isNaN(prev)) return null;
          let total = 0;
          let rollovers = 0;
          for (let i = idxA + dir; dir > 0 ? i <= idxB : i >= idxB; i += dir) {
            const cur = entry.signal.values[i];
            if (cur === null || cur === undefined || Number.isNaN(cur)) continue;
            let d = cur - prev;
            if (d > threshold) { d -= span; rollovers++; }
            else if (d < -threshold) { d += span; rollovers++; }
            total += d;
            prev = cur;
          }
          return rollovers > 0 ? { delta: total, rollovers } : null;
        };

        // Midrange delta pill — centered between cursors with ΔT and per-signal ΔV
        const midX = (xL + xR) / 2;
        const deltaT = Math.abs(timestamps[cursor2Idx] - timestamps[cursorIdx]);
        // Build delta text lines
        const deltaLines = [];
        deltaLines.push(`ΔT: ${deltaT.toFixed(1)} ms`);
        signalEntries.forEach((entry, si) => {
          const { signal, color: c2color, unit } = entry;
          const v1 = signal.values[cursorIdx], v2 = signal.values[cursor2Idx];
          if (v1 !== null && v2 !== null) {
            deltaLines.push({ text: `Δ ${(v2 - v1).toFixed(3)}${unit ? " " + unit : ""}`, color: c2color });
            const unrolled = computeUnrolledDelta(entry, cursorIdx, cursor2Idx);
            if (unrolled) {
              deltaLines.push({ text: `Δu ${unrolled.delta.toFixed(3)}${unit ? " " + unit : ""} (${unrolled.rollovers}x)`, color: c2color, isUnrolled: true });
            }
          }
        });

        if (deltaLines.length > 0 && xR - xL > 50) {
          ctx.font = `bold 12px ${FONT_MONO}`;
          const lineH = 15;
          const maxTw = Math.max(...deltaLines.map(l => ctx.measureText(typeof l === "string" ? l : l.text).width));
          const boxW = maxTw + 20, boxH = deltaLines.length * lineH + 10;
          const bx = midX - boxW / 2, by = pad.top + plotH / 2 - boxH / 2;

          // Background
          ctx.fillStyle = t.chart; ctx.globalAlpha = 0.92;
          ctx.fillRect(bx, by, boxW, boxH);
          ctx.strokeStyle = t.cursor2; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
          ctx.strokeRect(bx, by, boxW, boxH); ctx.globalAlpha = 1;

          // Lines
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          deltaLines.forEach((line, li) => {
            const ly = by + 4 + lineH / 2 + li * lineH;
            if (typeof line === "string") {
              ctx.fillStyle = t.cursor2; ctx.globalAlpha = 0.9; ctx.font = `bold 12px ${FONT_MONO}`;
              ctx.fillText(line, midX, ly);
            } else {
              ctx.fillStyle = line.color; ctx.globalAlpha = line.isUnrolled ? 0.95 : 0.88; ctx.font = `bold 11px ${FONT_MONO}`;
              ctx.fillText(line.text, midX, ly);
            }
          });
          ctx.globalAlpha = 1; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        }
      } else {
        // cursor2 not placed yet — show distinct first-handle tag
        drawCursorHandleTag(x1, "1", t.cursor1);
      }
    }
  }, [signalEntries, yRanges, cursorIdx, cursor2Idx, deltaMode, pillsEnabled, start, end, t, getGeo, timestamps, getPlotValue]);

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
    const idx = getIdx(e); if (idx === null) return;

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
  }, [getIdx, getGeo, deltaMode, deltaLocked, cursorIdx, setCursorIdx, setCursor2Idx, timestamps, setViewRange, onOverlayChange, start, end, unifyRange, yRanges]);

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
  const handleWheel = useCallback((e) => { e.preventDefault(); const zoom = e.deltaY > 0 ? 1.15 : 0.85; const idx = getIdx(e); const center = idx !== null ? idx : Math.floor((start + end) / 2); const s2 = end - start; const nc = Math.max(50, Math.min(timestamps.length, Math.round(s2 * zoom))); const fr = (center - start) / s2; let ns = Math.round(center - fr * nc), ne = ns + nc; if (ns < 0) { ne -= ns; ns = 0; } if (ne > timestamps.length) { ns -= (ne - timestamps.length); ne = timestamps.length; } setViewRange([Math.max(0, ns), Math.min(timestamps.length, ne)]); }, [start, end, timestamps, getIdx, setViewRange]);
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
