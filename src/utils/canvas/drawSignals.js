// src/utils/canvas/drawSignals.js
import { FONT_MONO } from "../../constants/theme.js";
import { buildDecimatedIndices } from "../chartPerf.js";

export function drawSignals(ctx, geo, { start, end, signalEntries, yRanges, rangeStatsByEntry, getPlotValue, showExtrema, compact, groupColor, t }) {
  const { pad, plotW, plotH } = geo;
  const sc = end - start;
  const nY = compact ? 3 : 5;
  const stride = Math.max(1, Math.floor(sc / (plotW * 2)));
  const shouldDecimate = sc > Math.max(5000, plotW * 6);

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

  signalEntries.forEach((entry, si) => {
    const { signal, color, dash, strokeMode, thickness, opacity } = entry;
    const [yMin, yMax] = yRanges[si];
    const yR = yMax - yMin;
    let minV = Infinity, maxV = -Infinity, minIdx = -1, maxIdx = -1;
    const activeMode = strokeMode || dash || "solid";
    const strokePx = Math.max(0.8, Number(thickness) || (signal.isDigital ? 2 : 1.5));
    const strokeAlpha = Math.max(0.1, Math.min(1, Number(opacity) || 0.9));
    ctx.strokeStyle = color;
    ctx.lineWidth = strokePx;
    ctx.globalAlpha = strokeAlpha;
    if (activeMode === "dashed") ctx.setLineDash([6, 4]);
    else if (activeMode === "dotted") ctx.setLineDash([2, 3]);
    else if (activeMode === "long_dash") ctx.setLineDash([12, 6]);
    else if (activeMode === "dash_dot") ctx.setLineDash([10, 4, 2, 4]);
    else if (activeMode === "dash_dot_dot") ctx.setLineDash([10, 4, 2, 3, 2, 4]);
    else ctx.setLineDash([]);

    const lookAhead = Math.max(stride, 8);
    const findInWindow = (i) => {
      const wEnd = Math.min(i + lookAhead, end);
      for (let j = i; j < wEnd; j++) {
        const cv = getPlotValue(entry, j);
        if (cv !== null) return { v: cv, vi: j };
      }
      return null;
    };
    const renderIdxs = shouldDecimate
      ? buildDecimatedIndices(signal.values, start, end, Math.floor(plotW * 1.8), (_, idx) => getPlotValue(entry, idx))
      : null;
    const useWindowSearch = !renderIdxs?.length;
    const readSample = (i) => {
      if (useWindowSearch) return findInWindow(i);
      const v = getPlotValue(entry, i);
      if (v === null) return null;
      return { v, vi: i };
    };
    const walkIndices = (cb) => {
      if (renderIdxs?.length) {
        for (const i of renderIdxs) cb(i);
        return;
      }
      for (let i = start; i < end; i += stride) cb(i);
    };

    if (activeMode === "samples") {
      walkIndices((i) => {
        const found = readSample(i);
        if (!found) return;
        const { v, vi } = found;
        if (v < minV) { minV = v; minIdx = vi; }
        if (v > maxV) { maxV = v; maxIdx = vi; }
        const x = pad.left + ((vi - start) / sc) * plotW, y = pad.top + plotH - ((v - yMin) / yR) * plotH;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.4, strokePx * 0.95), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = strokeAlpha;
        ctx.fill();
      });
    } else {
      ctx.beginPath();
      let started = false;
      walkIndices((i) => {
        const found = readSample(i);
        if (!found) { started = false; return; }
        const { v, vi } = found;
        if (v < minV) { minV = v; minIdx = vi; }
        if (v > maxV) { maxV = v; maxIdx = vi; }
        const x = pad.left + ((vi - start) / sc) * plotW, y = pad.top + plotH - ((v - yMin) / yR) * plotH;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else if (signal.isDigital && vi > start) {
          let pv = null;
          for (let j = vi - 1; j >= Math.max(start, vi - lookAhead); j--) {
            const cv = getPlotValue(entry, j);
            if (cv !== null) { pv = cv; break; }
          }
          if (pv !== null) ctx.lineTo(x, pad.top + plotH - ((pv - yMin) / yR) * plotH);
          ctx.lineTo(x, y);
        }
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      if (activeMode === "hybrid_line_points") {
        const markerStride = Math.max(stride, Math.floor((end - start) / Math.max(30, plotW / 10)));
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.min(1, strokeAlpha + 0.05);
        for (let i = start; i < end; i += markerStride) {
          const found = readSample(i);
          if (!found) continue;
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
        ctx.fillStyle = t.chart;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.95;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(text, bx + 5, by + 10.5);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(bx + (kind === "MAX" ? 3 : Math.max(3, Math.min(bw - 3, x - bx))), kind === "MAX" ? by + bh : by);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.35;
        ctx.stroke();
        ctx.globalAlpha = 1;
      };
      drawExtremaBadge(maxIdx, maxV, "MAX");
      if (minIdx !== maxIdx) drawExtremaBadge(minIdx, minV, "MIN");
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
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
}
