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
