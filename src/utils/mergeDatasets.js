/**
 * mergeDatasets.js
 * Utilities for merging two parsed CSV datasets (Studio 5000 format) into one.
 */

function getRange(timestamps = []) {
  if (!Array.isArray(timestamps) || timestamps.length === 0) return null;
  return [timestamps[0], timestamps[timestamps.length - 1]];
}

/**
 * Determine whether two datasets' time ranges overlap or are disjoint.
 */
export function computeAlignmentInfo(existingData, newData, offsetMs = 0) {
  const exTs = existingData?.timestamps || [];
  const newTs = newData?.timestamps || [];

  const existingRange = getRange(exTs);
  const shiftedNewRange = getRange(newTs)?.map((v) => v + offsetMs) || null;

  if (!existingRange || !shiftedNewRange) {
    return {
      existingRange: existingRange || [null, null],
      newRange: shiftedNewRange || [null, null],
      overlaps: false,
      gapMs: 0,
      isValid: false,
    };
  }

  const [newStart, newEnd] = shiftedNewRange;
  const newRange = [newStart, newEnd];
  const overlaps = newStart <= existingRange[1] && newEnd >= existingRange[0];

  let gapMs = 0;
  if (!overlaps) {
    gapMs = newStart > existingRange[1]
      ? newStart - existingRange[1]
      : newEnd - existingRange[0];
  }

  return { existingRange, newRange, overlaps, gapMs, isValid: true };
}

/**
 * Merge two datasets into one, interleaving by real timestamp.
 */
export function mergeUnified(existingData, newData, offsetMs = 0) {
  const exTs = existingData?.timestamps || [];
  const newTs = (newData?.timestamps || []).map((t) => t + offsetMs);

  if (!exTs.length || !newTs.length) {
    throw new Error("Cannot merge datasets with empty timestamps");
  }

  const DEDUP_TOL = 0.5;

  const combinedTs = [];
  const exMap = [];
  const newMap = [];

  let exIdx = 0;
  let newIdx = 0;
  while (exIdx < exTs.length || newIdx < newTs.length) {
    const exVal = exIdx < exTs.length ? exTs[exIdx] : null;
    const newVal = newIdx < newTs.length ? newTs[newIdx] : null;

    if (exVal !== null && newVal !== null && Math.abs(exVal - newVal) <= DEDUP_TOL) {
      combinedTs.push(Math.min(exVal, newVal));
      exMap.push(exIdx);
      newMap.push(newIdx);
      exIdx++;
      newIdx++;
      continue;
    }

    if (newVal === null || (exVal !== null && exVal < newVal)) {
      combinedTs.push(exVal);
      exMap.push(exIdx);
      newMap.push(-1);
      exIdx++;
    } else {
      combinedTs.push(newVal);
      exMap.push(-1);
      newMap.push(newIdx);
      newIdx++;
    }
  }

  const N = combinedTs.length;
  const mergedSignals = [];

  for (const sig of existingData.signals) {
    const values = new Array(N).fill(null);
    for (let ci = 0; ci < N; ci++) {
      const ei = exMap[ci];
      if (ei !== -1) values[ci] = sig.values[ei] ?? null;
    }
    mergedSignals.push({ ...sig, values });
  }

  for (const sig of newData.signals) {
    const values = new Array(N).fill(null);
    for (let ci = 0; ci < N; ci++) {
      const ni = newMap[ci];
      if (ni !== -1) values[ci] = sig.values[ni] ?? null;
    }
    mergedSignals.push({ ...sig, values });
  }

  const mergedTagNames = [
    ...(existingData.tagNames || existingData.signals.map((s) => s.name)),
    ...(newData.tagNames || newData.signals.map((s) => s.name)),
  ];

  const exPeriod = existingData.meta?.samplePeriod;
  const newPeriod = newData.meta?.samplePeriod;
  const sampleRateWarning = exPeriod && newPeriod && exPeriod !== newPeriod;

  const mergedMeta = {
    ...existingData.meta,
    trendName: `${existingData.meta?.trendName || 'Original'} + ${newData.meta?.trendName || 'Imported'}`,
    samplePeriod: exPeriod && newPeriod ? Math.min(exPeriod, newPeriod) : (exPeriod || newPeriod),
    tagCount: mergedSignals.length,
    addedSourceFiles: [
      ...(existingData.meta?.addedSourceFiles || []),
      newData.meta?.sourceFile,
    ].filter(Boolean),
  };

  return {
    meta: mergedMeta,
    timestamps: combinedTs,
    signals: mergedSignals,
    tagNames: mergedTagNames,
    sampleRateWarning: sampleRateWarning || false,
  };
}
