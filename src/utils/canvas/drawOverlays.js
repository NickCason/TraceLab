// src/utils/canvas/drawOverlays.js
export function drawOverlays(ctx, geo, { start, end, referenceOverlays, yRanges, unifyRange, t }) {
  const { pad, plotW, plotH } = geo;
  const overlayLabelQueue = [];
  const overlayHandleQueue = [];
  if (!referenceOverlays?.length) return { overlayLabelQueue, overlayHandleQueue };

  const sc = end - start;
  const overlayYRange = unifyRange && yRanges.length ? yRanges[0] : null;

  const queueOverlayLabel = (text, prefX, prefY, color) => {
    if (!text) return;
    overlayLabelQueue.push({ text, prefX, prefY, color });
  };
  const queueOverlayHandle = (hx, hy, color) => {
    overlayHandleQueue.push({ hx, hy, color });
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
          queueOverlayLabel(ov.label, Math.max(pad.left + 6, drawX + 8), pad.top + 16, ov.color || t.warn);
        }
        queueOverlayHandle(drawX, pad.top + 4, ov.color || t.warn);
        queueOverlayHandle(drawX + drawW, pad.top + 4, ov.color || t.warn);
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
          queueOverlayLabel(ov.label, Math.max(pad.left + 6, x + 8), pad.top + 16, ov.color || t.warn);
        }
        queueOverlayHandle(x, pad.top + 4, ov.color || t.warn);
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
        queueOverlayLabel(ov.label, pad.left + 8, Math.max(pad.top + 14, y1 + 14), ov.color || t.warn);
      }
      queueOverlayHandle(pad.left + plotW - 4, y1, ov.color || t.warn);
      queueOverlayHandle(pad.left + plotW - 4, y2, ov.color || t.warn);
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
        queueOverlayLabel(ov.label, pad.left + 8, Math.max(pad.top + 14, y - 8), ov.color || t.warn);
      }
      queueOverlayHandle(pad.left + plotW - 4, y, ov.color || t.warn);
    }
    ctx.globalAlpha = 1;
  });

  return { overlayLabelQueue, overlayHandleQueue };
}
