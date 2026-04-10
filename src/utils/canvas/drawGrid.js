// src/utils/canvas/drawGrid.js
import { FONT_MONO } from "../../constants/theme.js";
import { fmtTime } from "../date.js";

export function drawGrid(ctx, geo, { start, end, timestamps, rebaseOffset, showTimeAxis, compact, t }) {
  const { pad, plotW, plotH } = geo;
  const nX = Math.max(2, Math.floor(plotW / 140));
  const nY = compact ? 3 : 5;
  const sc = end - start;
  ctx.strokeStyle = t.grid; ctx.lineWidth = 1;
  for (let i = 0; i <= nY; i++) {
    const y = pad.top + (plotH / nY) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + plotW, y); ctx.stroke();
  }
  for (let i = 0; i <= nX; i++) {
    const x = pad.left + (plotW / nX) * i;
    ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + plotH); ctx.stroke();
    if (showTimeAxis) {
      const idx = start + Math.floor((sc / nX) * i);
      if (idx < timestamps.length) {
        ctx.fillStyle = t.text3; ctx.font = `11px ${FONT_MONO}`; ctx.textAlign = "center";
        ctx.fillText(fmtTime(timestamps[idx] + rebaseOffset), x, pad.top + plotH + 16);
      }
    }
  }
}
