// src/utils/canvas/drawCursors.js
import { FONT_MONO } from "../../constants/theme.js";
import { computeUnrolledDelta } from "../computeUnrolledDelta.js";

export function drawCursors(ctx, geo, { start, end, timestamps, signalEntries, yRanges, cursorIdx, cursor2Idx, deltaMode, deltaLocked, pillsEnabled, getPlotValue, t }) {
  const { pad, plotW, plotH } = geo;
  const sc = end - start;
  const allowNullInterpolation = sc <= Math.max(2500, Math.floor(plotW * 3));
  const cursorDensityScore = (signalEntries.length * sc) / Math.max(1, plotW);
  const denseCursorMode = !deltaMode && (sc > Math.max(7000, Math.floor(plotW * 6)) || cursorDensityScore > 90);

  const drawCursorHandleTag = (x, label, color) => {
    const text = `${label} ↕`;
    const tagY = pad.top + 11;
    ctx.font = `bold 10px ${FONT_MONO}`;
    const tw = ctx.measureText(text).width;
    const bw = tw + 12, bh = 14, r = 4;
    const bx = x - bw / 2, by = tagY - bh / 2;
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
    ctx.strokeStyle = color; ctx.globalAlpha = 0.65; ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, x, tagY + 0.5);
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
    ctx.strokeStyle = col; ctx.globalAlpha = alpha; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + plotH); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (denseCursorMode) return;

    const pills = [];
    signalEntries.forEach((entry, si) => {
      const { signal, color: c2, unit, displayName, isAvg } = entry;
      const rawV = signal.values[idx];
      let plotV = getPlotValue(entry, idx);
      let isInterpolated = false;

      if (plotV === null || rawV === null) {
        if (!allowNullInterpolation) return;
        let upV = null, downV = null;
        const searchLimit = Math.min(200, end - start);
        for (let j = idx - 1; j >= Math.max(start, idx - searchLimit); j--) {
          const v = getPlotValue(entry, j); if (v !== null) { upV = v; break; }
        }
        for (let j = idx + 1; j < Math.min(end, idx + searchLimit); j++) {
          const v = getPlotValue(entry, j); if (v !== null) { downV = v; break; }
        }
        if (upV !== null && downV !== null) { plotV = (upV + downV) / 2; isInterpolated = true; }
        else if (upV !== null) { plotV = upV; isInterpolated = true; }
        else if (downV !== null) { plotV = downV; isInterpolated = true; }
        else return;
      }

      const [mn, mx] = yRanges[si]; const y = pad.top + plotH - ((plotV - mn) / (mx - mn)) * plotH;

      if (isInterpolated) {
        ctx.strokeStyle = c2; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.45;
        ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      } else if (isAvg) {
        ctx.strokeStyle = c2; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y); ctx.closePath();
        ctx.stroke(); ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = t.dotStroke; ctx.lineWidth = 1.5; ctx.stroke();
      }

      if (showPills) {
        pills.push({ v: plotV, y, color: c2, unit, displayName, isAvg: !!isAvg, isInterpolated });
      }
    });

    if (showPills && pills.length > 0) {
      ctx.textBaseline = "middle"; ctx.textAlign = "left";
      const pillH = 16, pillGap = 2, pillPad = 6, pillBottomInset = 6;
      const onRight = x < pad.left + plotW * 0.7;
      const sorted = pills.map((p, pi) => ({ ...p, _origIdx: pi }));
      sorted.sort((a, b) => a.y - b.y);
      const placed = [];
      sorted.forEach((p) => {
        let py = p.y - pillH / 2;
        for (const prev of placed) {
          if (py < prev + pillH + pillGap) py = prev + pillH + pillGap;
        }
        py = Math.max(pad.top, Math.min(pad.top + plotH - pillH - pillBottomInset, py));
        p._py = py; placed.push(py);
      });
      const bottommost = placed[placed.length - 1];
      if (bottommost + pillH > pad.top + plotH - pillBottomInset) {
        const overflow = (bottommost + pillH) - (pad.top + plotH - pillBottomInset);
        sorted.forEach(p => { p._py = Math.max(pad.top, p._py - overflow); });
      }
      for (let i = 1; i < sorted.length; i++) {
        const minY = sorted[i - 1]._py + pillH + pillGap;
        if (sorted[i]._py < minY) sorted[i]._py = minY;
      }
      sorted.forEach((p) => {
        const prefix = p.isAvg ? "x̄ " : "";
        const suffix = p.isInterpolated ? "~" : "";
        const valStr = prefix + p.v.toFixed(3) + (p.unit ? " " + p.unit : "") + (suffix ? " " + suffix : "");
        ctx.font = `bold 10px ${FONT_MONO}`;
        const tw = ctx.measureText(valStr).width;
        const pillW = tw + pillPad * 2 + (p.isAvg ? 4 : 10);
        const px = onRight ? x + 10 : x - pillW - 10;
        const py = p._py;
        const pillAlpha = p.isInterpolated ? 0.72 : (p.isAvg ? 0.92 : 0.88);
        ctx.fillStyle = t.chart; ctx.globalAlpha = pillAlpha;
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
        ctx.strokeStyle = p.color; ctx.globalAlpha = p.isInterpolated ? 0.12 : 0.2; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(onRight ? x + 4 : x - 4, p.y);
        ctx.lineTo(onRight ? px : px + pillW, py + pillH / 2); ctx.stroke();
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = p.isInterpolated ? 0.35 : (p.isAvg ? 0.6 : 0.4);
        ctx.lineWidth = 1;
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
        if (p.isAvg) {
          ctx.fillStyle = p.color; ctx.globalAlpha = 0.7;
          const cx = px + pillPad + 2, cy = py + pillH / 2;
          ctx.beginPath(); ctx.moveTo(cx, cy - 2.5); ctx.lineTo(cx + 2.5, cy); ctx.lineTo(cx, cy + 2.5); ctx.lineTo(cx - 2.5, cy); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(px + pillPad + 2, py + pillH / 2, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = p.color; ctx.globalAlpha = p.isInterpolated ? 0.7 : (p.isAvg ? 0.8 : 0.95);
        ctx.fillText(valStr, px + pillPad + (p.isAvg || p.isInterpolated ? 6 : 8), py + pillH / 2 + 0.5);
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
      ctx.fillStyle = t.cursor2Bg; ctx.fillRect(xL, pad.top, xR - xL, plotH);
      drawOne(cursorIdx, t.cursor1, 0.7, false);
      drawOne(cursor2Idx, t.cursor2, 0.6, false);
      drawCursorHandleTag(x1, "1", t.cursor1);
      drawCursorHandleTag(x2, "2", t.cursor2);

      if (pillsEnabled) {
        const pillH = 14, pillGap = 2, pillPad = 5, pillBottomInset = 6;
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

        const layoutPills = (pills, anchorX, side) => {
          if (!pills.length) return;
          pills.sort((a, b) => a.y - b.y);
          const placed = [];
          pills.forEach(p => {
            let py = p.y - pillH / 2;
            for (const prev of placed) { if (py < prev + pillH + pillGap) py = prev + pillH + pillGap; }
            py = Math.max(pad.top + 14, Math.min(pad.top + plotH - pillH - pillBottomInset, py));
            p._py = py; placed.push(py);
          });
          ctx.textBaseline = "middle";
          pills.forEach(p => {
            const valStr = (p.isAvg ? "x\u0305 " : "") + p.v.toFixed(3) + (p.unit ? " " + p.unit : "");
            ctx.font = `bold 9px ${FONT_MONO}`;
            const tw = ctx.measureText(valStr).width;
            const pw = tw + 12;
            const px = side === "left" ? anchorX - pw - 6 : anchorX + 6;
            const py = p._py;
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
            ctx.fillStyle = p.color; ctx.globalAlpha = p.isAvg ? 0.8 : 0.95;
            ctx.textAlign = "center";
            ctx.fillText(valStr, px + pw / 2, py + pillH / 2 + 0.5);
            ctx.globalAlpha = 1;
            ctx.textAlign = "left";
          });
          ctx.textBaseline = "alphabetic";
        };

        const c1Side = x1 <= x2 ? "left" : "right";
        const c2Side = x1 <= x2 ? "right" : "left";
        layoutPills(c1Pills, x1, c1Side);
        layoutPills(c2Pills, x2, c2Side);
      }

      const midX = (xL + xR) / 2;
      const deltaT = Math.abs(timestamps[cursor2Idx] - timestamps[cursorIdx]);
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
        ctx.fillStyle = t.chart; ctx.globalAlpha = 0.92;
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeStyle = t.cursor2; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, boxW, boxH); ctx.globalAlpha = 1;
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
      drawCursorHandleTag(x1, "1", t.cursor1);
    }
  }
}
