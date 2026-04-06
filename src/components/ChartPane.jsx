import { useRef, useCallback, useEffect, useMemo } from "react";
import { THEMES, FONT_DISPLAY, FONT_MONO } from "../constants/theme";
import { fmtTime } from "../utils/date";
import { arrayMinMax } from "../utils/stats";

export default function ChartPane({ timestamps, signalEntries, cursorIdx, setCursorIdx, cursor2Idx, setCursor2Idx, deltaMode, viewRange, setViewRange, showTimeAxis, label, compact, theme, rebaseOffset, groupColor, showPills: pillsEnabled, showEdgeValues, unifyRange, deltaLocked, setDeltaLocked, globalEdgeLabelWidth }) {
  const traceRef = useRef(null), cursorRef = useRef(null), containerRef = useRef(null), panStart = useRef(null), rafPending = useRef(null), pendingIdx = useRef(null);
  const [start, end] = viewRange; const t = THEMES[theme];

  const yRanges = useMemo(() => {
    // First pass: get raw min/max per signal (before any padding)
    const raw = signalEntries.map(({ signal }) => {
      const r = arrayMinMax(signal.values, start, end);
      if (!r) return null;
      return [r.min, r.max];
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
  }, [signalEntries, start, end, unifyRange]);

  // Pre-compute max right-edge label width for dynamic padding
  // Use global width (from App) so all panes align, fall back to local computation
  const edgeLabelWidth = useMemo(() => {
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

  const getGeo = useCallback((c) => {
    const rect = c.parentElement.getBoundingClientRect(); const W = rect.width, H = rect.height;
    const rightPad = showEdgeValues ? Math.max(24, edgeLabelWidth + 16) : 20;
    const pad = { top: compact ? 6 : 14, bottom: showTimeAxis ? 28 : 6, left: 68, right: rightPad };
    return { W, H, pad, plotW: W - pad.left - pad.right, plotH: H - pad.top - pad.bottom };
  }, [compact, showTimeAxis, showEdgeValues, edgeLabelWidth]);

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
    signalEntries.forEach(({ signal, color, dash }, si) => {
      const [yMin, yMax] = yRanges[si]; const yR = yMax - yMin;
      ctx.strokeStyle = color; ctx.lineWidth = signal.isDigital ? 2 : 1.5; ctx.globalAlpha = 0.9;
      if (dash === "dashed") ctx.setLineDash([6, 4]);
      else if (dash === "dotted") ctx.setLineDash([2, 3]);
      else ctx.setLineDash([]);
      ctx.beginPath(); let started = false;
      for (let i = start; i < end; i += stride) {
        const v = signal.values[i]; if (v === null) { started = false; continue; }
        const x = pad.left + ((i - start) / sc) * plotW, y = pad.top + plotH - ((v - yMin) / yR) * plotH;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else if (signal.isDigital && i > start) { const pi2 = Math.max(start, i - stride); const pv = signal.values[pi2]; if (pv !== null) ctx.lineTo(x, pad.top + plotH - ((pv - yMin) / yR) * plotH); ctx.lineTo(x, y); }
        else ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (si === 0) { for (let i = 0; i <= nY; i++) { const val = yMin + ((nY - i) / nY) * yR; ctx.fillStyle = t.text3; ctx.font = `11px ${FONT_MONO}`; ctx.textAlign = "right"; ctx.fillText(val.toFixed(2), pad.left - 6, pad.top + (plotH / nY) * i + 3); } }
    });
    // Edge value indicators — arrows at left/right boundaries with values
    if (showEdgeValues) {
      const edgePillH = 14, edgeGap = 2;
      const drawEdge = (side) => {
        const isLeft = side === "left";
        const edgePills = [];
        signalEntries.forEach(({ signal, color, unit, isAvg }, si) => {
          const [yMin, yMax] = yRanges[si]; const yR = yMax - yMin;
          // Find first/last non-null value in view
          let idx = -1;
          if (isLeft) { for (let i = start; i < end; i++) { if (signal.values[i] !== null) { idx = i; break; } } }
          else { for (let i = end - 1; i >= start; i--) { if (signal.values[i] !== null) { idx = i; break; } } }
          if (idx === -1) return;
          const v = signal.values[idx];
          const y = pad.top + plotH - ((v - yMin) / yR) * plotH;
          edgePills.push({ v, y, color, unit, isAvg: !!isAvg });
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
  }, [signalEntries, yRanges, start, end, timestamps, showTimeAxis, compact, label, t, rebaseOffset, getGeo, groupColor, showEdgeValues]);

  const drawCursors = useCallback(() => {
    const canvas = cursorRef.current; if (!canvas || !traceRef.current) return;
    const ctx = canvas.getContext("2d"); const dpr = window.devicePixelRatio || 1;
    const { W, H, pad, plotW, plotH } = getGeo(traceRef.current);
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px"; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H); const sc = end - start;

    const drawOne = (idx, col, alpha = 0.7, showPills = false) => {
      if (idx === null || idx < start || idx >= end) return;
      const x = pad.left + ((idx - start) / sc) * plotW;
      // Dashed vertical line
      ctx.strokeStyle = col; ctx.globalAlpha = alpha; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + plotH); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;

      const pills = []; // collect pill positions to avoid overlaps
      signalEntries.forEach(({ signal, color: c2, unit, displayName, isAvg }, si) => {
        const v = signal.values[idx]; if (v === null) return;
        const [mn, mx] = yRanges[si]; const y = pad.top + plotH - ((v - mn) / (mx - mn)) * plotH;
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
          pills.push({ v, y, color: c2, unit, displayName, isAvg: !!isAvg });
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

        // 3) Cursor labels — positioned inside plot area to avoid clipping
        ctx.font = `bold 11px ${FONT_MONO}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const lblY = pad.top + 10;
        // Label 1
        ctx.fillStyle = t.chart; ctx.globalAlpha = 0.9;
        ctx.fillRect(x1 - 9, lblY - 6, 18, 12);
        ctx.strokeStyle = t.cursor1; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
        ctx.strokeRect(x1 - 9, lblY - 6, 18, 12); ctx.globalAlpha = 1;
        ctx.fillStyle = t.cursor1; ctx.fillText("1", x1, lblY + 0.5);
        // Label 2
        ctx.fillStyle = t.chart; ctx.globalAlpha = 0.9;
        ctx.fillRect(x2 - 9, lblY - 6, 18, 12);
        ctx.strokeStyle = t.cursor2; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
        ctx.strokeRect(x2 - 9, lblY - 6, 18, 12); ctx.globalAlpha = 1;
        ctx.fillStyle = t.cursor2; ctx.fillText("2", x2, lblY + 0.5);
        ctx.textBaseline = "alphabetic";

        // Per-signal delta pills at both cursors (if pills enabled)
        if (pillsEnabled) {
          const pillH = 14, pillGap = 2, pillPad = 5;
          // Collect values at both cursors
          const c1Pills = [], c2Pills = [];
          signalEntries.forEach(({ signal, color: c2color, unit, isAvg }, si) => {
            const v1 = signal.values[cursorIdx];
            const v2 = signal.values[cursor2Idx];
            const [mn, mx] = yRanges[si];
            if (v1 !== null) c1Pills.push({ v: v1, y: pad.top + plotH - ((v1 - mn) / (mx - mn)) * plotH, color: c2color, unit, isAvg: !!isAvg });
            if (v2 !== null) c2Pills.push({ v: v2, y: pad.top + plotH - ((v2 - mn) / (mx - mn)) * plotH, color: c2color, unit, isAvg: !!isAvg });
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

        // Midrange delta pill — centered between cursors with ΔT and per-signal ΔV
        const midX = (xL + xR) / 2;
        const deltaT = Math.abs(timestamps[cursor2Idx] - timestamps[cursorIdx]);
        // Build delta text lines
        const deltaLines = [];
        deltaLines.push(`ΔT: ${deltaT.toFixed(1)} ms`);
        signalEntries.forEach(({ signal, color: c2color, unit, displayName }, si) => {
          const v1 = signal.values[cursorIdx], v2 = signal.values[cursor2Idx];
          if (v1 !== null && v2 !== null) {
            deltaLines.push({ text: `Δ ${(v2 - v1).toFixed(3)}${unit ? " " + unit : ""}`, color: c2color });
          }
        });

        if (deltaLines.length > 0 && xR - xL > 50) {
          ctx.font = `bold 10px ${FONT_MONO}`;
          const lineH = 13;
          const maxTw = Math.max(...deltaLines.map(l => ctx.measureText(typeof l === "string" ? l : l.text).width));
          const boxW = maxTw + 16, boxH = deltaLines.length * lineH + 8;
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
              ctx.fillStyle = t.cursor2; ctx.globalAlpha = 0.9; ctx.font = `bold 10px ${FONT_MONO}`;
              ctx.fillText(line, midX, ly);
            } else {
              ctx.fillStyle = line.color; ctx.globalAlpha = 0.85; ctx.font = `bold 9px ${FONT_MONO}`;
              ctx.fillText(line.text, midX, ly);
            }
          });
          ctx.globalAlpha = 1; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        }
      } else {
        // cursor2 not placed yet — just show the "1" label on cursor1
        ctx.font = `bold 11px ${FONT_MONO}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const lblY = pad.top + 10;
        ctx.fillStyle = t.chart; ctx.globalAlpha = 0.9;
        ctx.fillRect(x1 - 9, lblY - 6, 18, 12);
        ctx.strokeStyle = t.cursor1; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
        ctx.strokeRect(x1 - 9, lblY - 6, 18, 12); ctx.globalAlpha = 1;
        ctx.fillStyle = t.cursor1; ctx.fillText("1", x1, lblY + 0.5);
        ctx.textBaseline = "alphabetic";
      }
    }
  }, [signalEntries, yRanges, cursorIdx, cursor2Idx, deltaMode, pillsEnabled, start, end, t, getGeo, timestamps]);

  useEffect(() => { drawTraces(); }, [drawTraces]);
  useEffect(() => { drawCursors(); }, [drawCursors]);
  useEffect(() => { const obs = new ResizeObserver(() => { drawTraces(); drawCursors(); }); if (containerRef.current) obs.observe(containerRef.current); return () => obs.disconnect(); }, [drawTraces, drawCursors]);

  const getIdx = useCallback((e) => { const c = traceRef.current; if (!c) return null; const { pad, plotW } = getGeo(c); const r = c.getBoundingClientRect(); const x = e.clientX - r.left - pad.left; const f = x / plotW; if (f < 0 || f > 1) return null; return Math.max(start, Math.min(end - 1, Math.round(start + f * (end - start)))); }, [start, end, getGeo]);

  const handleMouseMove = useCallback((e) => {
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
  }, [getIdx, getGeo, deltaMode, deltaLocked, cursorIdx, setCursorIdx, setCursor2Idx, timestamps, setViewRange]);

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
  const handleMouseDown = useCallback((e) => { if (e.button === 0 && !deltaMode) { panStart.current = { x: e.clientX, start, end }; e.preventDefault(); } if (e.button === 1) { panStart.current = { x: e.clientX, start, end }; e.preventDefault(); } }, [start, end, deltaMode]);
  const handleMouseUp = useCallback(() => { panStart.current = null; }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas ref={traceRef} data-export="trace" style={{ width: "100%", height: "100%", display: "block", position: "absolute", top: 0, left: 0 }} />
      <canvas ref={cursorRef} data-export="cursor" style={{ width: "100%", height: "100%", display: "block", position: "absolute", top: 0, left: 0, cursor: deltaMode ? "crosshair" : "grab" }}
        onMouseMove={handleMouseMove} onClick={handleClick} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />
    </div>
  );
}
