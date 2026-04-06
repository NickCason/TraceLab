export function arrayMinMax(arr, start = 0, end = arr.length) {
  let min = Infinity, max = -Infinity, count = 0, sum = 0;
  for (let i = start; i < end; i++) {
    const v = arr[i];
    if (v !== null && v !== undefined) { if (v < min) min = v; if (v > max) max = v; sum += v; count++; }
  }
  return count === 0 ? null : { min, max, count, sum };
}

export function computeStats(values, start = 0, end = values.length) {
  const r = arrayMinMax(values, start, end);
  if (!r) return { min: "—", max: "—", avg: "—", range: "—" };
  return { min: r.min.toFixed(4), max: r.max.toFixed(4), avg: (r.sum / r.count).toFixed(4), range: (r.max - r.min).toFixed(4) };
}
