export function normalizeToSeam(value, seam = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const span = Math.max(1e-9, Number(seam.span) || 360);
  const origin = Number(seam.origin) || 0;
  const offset = Number(seam.offset) || 0;
  const shifted = value - origin + offset;
  const wrapped = ((shifted % span) + span) % span;
  return wrapped + origin;
}

export function denormalizeFromSeam(value, seam = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const span = Math.max(1e-9, Number(seam.span) || 360);
  const origin = Number(seam.origin) || 0;
  const offset = Number(seam.offset) || 0;
  const shifted = value - origin - offset;
  const wrapped = ((shifted % span) + span) % span;
  return wrapped + origin;
}

export function hasSeamAdjustment(seam = {}) {
  return Math.abs(Number(seam.offset) || 0) > 1e-9;
}

export function inferSeamDomain(values = []) {
  let min = Infinity;
  let max = -Infinity;
  values.forEach((v) => {
    if (v === null || v === undefined || Number.isNaN(v)) return;
    if (v < min) min = v;
    if (v > max) max = v;
  });
  if (min === Infinity || max === -Infinity) return { origin: 0, span: 360 };
  const rawSpan = Math.max(1e-9, max - min);
  // Preserve legacy behavior for angular tags that are effectively 0..360.
  if (min >= -1 && max <= 361 && rawSpan >= 300) return { origin: 0, span: 360 };
  return { origin: min, span: rawSpan };
}

export function clampSeamPercent(percent) {
  const n = Number(percent);
  if (Number.isNaN(n)) return 0;
  const snapped = Math.round(n / 5) * 5;
  return Math.max(-100, Math.min(100, snapped));
}

export function seamPercentToOffset(percent, span) {
  return (clampSeamPercent(percent) / 100) * (Math.max(1e-9, Number(span) || 360) / 2);
}

export function seamOffsetToPercent(offset, span) {
  const s = Math.max(1e-9, Number(span) || 360);
  const pct = (Number(offset) || 0) / (s / 2) * 100;
  return clampSeamPercent(pct);
}
