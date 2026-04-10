// src/utils/canvas/drawTraces.js
import { FONT_DISPLAY } from "../../constants/theme.js";
import { drawGrid } from "./drawGrid.js";
import { drawOverlays } from "./drawOverlays.js";
import { drawSignals } from "./drawSignals.js";
import { drawEdgePills } from "./drawEdgePills.js";

export function drawTraces(ctx, geo, params) {
  const { W, H, pad, plotW, plotH } = geo;
  const { t, groupColor, showEdgeValues } = params;

  // Background fill
  ctx.fillStyle = t.chart; ctx.fillRect(0, 0, W, H);

  // Group color bar
  if (groupColor) {
    ctx.fillStyle = groupColor; ctx.globalAlpha = 0.25;
    ctx.fillRect(0, 0, 3, H); ctx.globalAlpha = 1;
  }

  // Grid lines + time axis
  drawGrid(ctx, geo, params);

  // Overlay shapes — returns label/handle queues to flush after signals
  const { overlayLabelQueue, overlayHandleQueue } = drawOverlays(ctx, geo, params);

  // Signal traces, extrema badges, Y-axis labels
  drawSignals(ctx, geo, params);

  // Flush deferred overlay labels (drawn on top of signals)
  if (overlayLabelQueue.length) {
    const placedOverlayLabels = [];
    const intersectsLabel = (a, b) => !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
    overlayLabelQueue.forEach(({ text, prefX, prefY, color }) => {
      ctx.font = `bold 10px ${FONT_DISPLAY}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const tw = ctx.measureText(text).width;
      const w = tw + 6, h = 12;
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
      ctx.globalAlpha = 0.95;
      ctx.fillText(text, x + 3, y);
      ctx.globalAlpha = 1;
    });
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
  }

  // Flush deferred overlay drag handles
  if (overlayHandleQueue.length) {
    overlayHandleQueue.forEach(({ hx, hy, color }) => {
      ctx.fillStyle = t.chart; ctx.globalAlpha = 0.95;
      ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = color || t.warn; ctx.globalAlpha = 0.95; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  // Edge value indicator pills (only when enabled)
  if (showEdgeValues) drawEdgePills(ctx, geo, params);

  // Plot border
  ctx.strokeStyle = t.border; ctx.lineWidth = 1; ctx.strokeRect(pad.left, pad.top, plotW, plotH);
}
