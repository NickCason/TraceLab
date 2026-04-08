let movingAverageCache = new WeakMap();
let rangeStatsCache = new WeakMap();

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  return Date.now();
}

export function profilePerf(label, fn) {
  const enabled = Boolean(globalThis?.__TRACE_PERF_ENABLED__);
  if (!enabled) return fn();
  const started = nowMs();
  const result = fn();
  const duration = nowMs() - started;
  const sink = typeof globalThis.__TRACE_PERF_SINK__ === 'function'
    ? globalThis.__TRACE_PERF_SINK__
    : (entry) => console.debug(`[trace-perf] ${entry.label}: ${entry.durationMs.toFixed(2)}ms`);
  sink({ label, durationMs: duration });
  return result;
}

export function buildMovingAverageCached(values, windowSize) {
  if (!Array.isArray(values) || values.length === 0 || windowSize <= 0) return values ? [...values] : [];
  let byWindow = movingAverageCache.get(values);
  if (!byWindow) {
    byWindow = new Map();
    movingAverageCache.set(values, byWindow);
  }
  if (byWindow.has(windowSize)) return byWindow.get(windowSize);

  const avgVals = new Array(values.length);
  const buf = [];
  let bufSum = 0;
  for (let j = 0; j < values.length; j++) {
    if (values[j] !== null) {
      buf.push(values[j]);
      bufSum += values[j];
      if (buf.length > windowSize) bufSum -= buf.shift();
      avgVals[j] = bufSum / buf.length;
    } else {
      avgVals[j] = buf.length > 0 ? bufSum / buf.length : null;
    }
  }

  byWindow.set(windowSize, avgVals);
  return avgVals;
}

export function computeRangeStats(values, start, end, getValueAt = (arr, idx) => arr[idx], keyPart = '') {
  if (!values || start >= end) return null;

  const rangeKey = `${start}:${end}:${keyPart}`;
  let byRange = rangeStatsCache.get(values);
  if (!byRange) {
    byRange = new Map();
    rangeStatsCache.set(values, byRange);
  }
  if (byRange.has(rangeKey)) return byRange.get(rangeKey);

  let min = Infinity;
  let max = -Infinity;
  let minIdx = -1;
  let maxIdx = -1;
  let firstIdx = -1;
  let lastIdx = -1;

  for (let i = start; i < end; i++) {
    const v = getValueAt(values, i);
    if (v === null || v === undefined || Number.isNaN(v)) continue;
    if (firstIdx === -1) firstIdx = i;
    lastIdx = i;
    if (v < min) {
      min = v;
      minIdx = i;
    }
    if (v > max) {
      max = v;
      maxIdx = i;
    }
  }

  const stats = firstIdx === -1
    ? null
    : { min, max, minIdx, maxIdx, firstIdx, lastIdx };

  byRange.set(rangeKey, stats);
  return stats;
}

export function buildDecimatedIndices(values, start, end, targetPoints, getValueAt = (arr, idx) => arr[idx]) {
  const span = end - start;
  if (!values || span <= 0) return [];
  if (!Number.isFinite(targetPoints) || targetPoints < 8 || span <= targetPoints * 2) {
    return Array.from({ length: span }, (_, i) => start + i);
  }

  const bucketSize = Math.max(1, Math.floor(span / targetPoints));
  const out = [];

  for (let bucketStart = start; bucketStart < end; bucketStart += bucketSize) {
    const bucketEnd = Math.min(end, bucketStart + bucketSize);
    let firstIdx = -1;
    let lastIdx = -1;
    let minIdx = -1;
    let maxIdx = -1;
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let i = bucketStart; i < bucketEnd; i++) {
      const v = getValueAt(values, i);
      if (v === null || v === undefined || Number.isNaN(v)) continue;
      if (firstIdx === -1) firstIdx = i;
      lastIdx = i;
      if (v < minVal) {
        minVal = v;
        minIdx = i;
      }
      if (v > maxVal) {
        maxVal = v;
        maxIdx = i;
      }
    }

    if (firstIdx === -1) continue;
    const bucketIdxs = [firstIdx, minIdx, maxIdx, lastIdx].filter((idx, i, arr) => idx !== -1 && arr.indexOf(idx) === i);
    bucketIdxs.sort((a, b) => a - b);
    out.push(...bucketIdxs);
  }

  if (!out.length) return Array.from({ length: span }, (_, i) => start + i);
  return out;
}

export function clearChartPerfCaches() {
  movingAverageCache = new WeakMap();
  rangeStatsCache = new WeakMap();
}
