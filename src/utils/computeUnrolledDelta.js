// src/utils/computeUnrolledDelta.js
export function computeUnrolledDelta(entry, idxA, idxB) {
  const span = entry?.seam?.span;
  if (!span || span <= 0 || idxA === idxB) return null;
  const threshold = span * 0.5;
  const dir = idxB > idxA ? 1 : -1;
  let prev = entry.signal.values[idxA];
  if (prev === null || prev === undefined || Number.isNaN(prev)) return null;
  let total = 0;
  let rollovers = 0;
  for (let i = idxA + dir; dir > 0 ? i <= idxB : i >= idxB; i += dir) {
    const cur = entry.signal.values[i];
    if (cur === null || cur === undefined || Number.isNaN(cur)) continue;
    let d = cur - prev;
    if (d > threshold) { d -= span; rollovers++; }
    else if (d < -threshold) { d += span; rollovers++; }
    total += d;
    prev = cur;
  }
  return rollovers > 0 ? { delta: total, rollovers } : null;
}
