// src/utils/canvas/paneGeo.js
export function getGeo(canvas, { compact, showTimeAxis, showEdgeValues, rightEdgeLabelWidth, leftEdgeLabelWidth }) {
  const rect = canvas.parentElement.getBoundingClientRect();
  const W = rect.width, H = rect.height;
  const rightPad = showEdgeValues ? Math.max(24, rightEdgeLabelWidth + 16) : 20;
  const leftPad = showEdgeValues ? Math.max(68, leftEdgeLabelWidth + 20) : 68;
  const pad = { top: compact ? 6 : 14, bottom: showTimeAxis ? 28 : 6, left: leftPad, right: rightPad };
  return { W, H, pad, plotW: W - pad.left - pad.right, plotH: H - pad.top - pad.bottom };
}
