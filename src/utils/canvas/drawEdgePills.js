// src/utils/canvas/drawEdgePills.js
import { FONT_MONO } from "../../constants/theme.js";

export function drawEdgePills(ctx, geo, { signalEntries, yRanges, rangeStatsByEntry, getPlotValue, t }) {
  const { pad, plotW, plotH } = geo;
  const edgePillH = 14, edgeGap = 2, edgeBottomInset = 6;

  const drawEdge = (side) => {
    const isLeft = side === "left";
    const edgePills = [];
    signalEntries.forEach((entry, si) => {
      const { signal, color, unit, isAvg } = entry;
      const [yMin, yMax] = yRanges[si]; const yR = yMax - yMin;
      const stats = rangeStatsByEntry[si];
      const idx = isLeft ? (stats?.firstIdx ?? -1) : (stats?.lastIdx ?? -1);
      if (idx === -1) return;
      const plotV = getPlotValue(entry, idx);
      const rawV = signal.values[idx];
      const y = pad.top + plotH - ((plotV - yMin) / yR) * plotH;
      edgePills.push({ v: rawV, y, color, unit, isAvg: !!isAvg });
    });
    if (!edgePills.length) return;
    edgePills.sort((a, b) => a.y - b.y);
    const placed = [];
    edgePills.forEach(p => {
      let py = p.y - edgePillH / 2;
      for (const prev of placed) { if (py < prev + edgePillH + edgeGap) py = prev + edgePillH + edgeGap; }
      py = Math.max(pad.top, Math.min(pad.top + plotH - edgePillH - edgeBottomInset, py));
      p._py = py; placed.push(py);
    });
    ctx.textBaseline = "middle";
    edgePills.forEach(p => {
      const valStr = (p.isAvg ? "x\u0305 " : "") + p.v.toFixed(2) + (p.unit ? " " + p.unit : "");
      ctx.font = `bold 10px ${FONT_MONO}`;
      const tw = ctx.measureText(valStr).width;
      const pw = tw + 14;
      const py = p._py;
      const ax = isLeft ? pad.left : pad.left + plotW;
      const bx = isLeft ? ax - pw - 5 : ax + 7;
      ctx.fillStyle = p.color; ctx.globalAlpha = 0.5;
      ctx.beginPath();
      if (isLeft) {
        ctx.moveTo(ax, p.y); ctx.lineTo(ax - 4, p.y - 3); ctx.lineTo(ax - 4, p.y + 3);
      } else {
        ctx.moveTo(ax, p.y); ctx.lineTo(ax + 4, p.y - 3); ctx.lineTo(ax + 4, p.y + 3);
      }
      ctx.fill(); ctx.globalAlpha = 1;
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
