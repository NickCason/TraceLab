/**
 * mergeDatasets.js
 * Utilities for merging two parsed CSV datasets (Studio 5000 format) into one.
 */

/**
 * Determine whether two datasets' time ranges overlap or are disjoint.
 * Returns info needed by the rebase UI.
 *
 * @param {object} existingData - The current loaded dataset
 * @param {object} newData      - The freshly parsed dataset to be merged
 * @param {number} [offsetMs=0] - Optional offset already applied to newData's timestamps
 * @returns {{ existingRange: [number,number], newRange: [number,number], overlaps: boolean, gapMs: number }}
 */
export function computeAlignmentInfo(existingData, newData, offsetMs = 0) {
  const exTs = existingData.timestamps;
  const newTs = newData.timestamps;

  const existingRange = [exTs[0], exTs[exTs.length - 1]];
  const newStart = newTs[0] + offsetMs;
  const newEnd = newTs[newTs.length - 1] + offsetMs;
  const newRange = [newStart, newEnd];

  const overlaps = newStart <= existingRange[1] && newEnd >= existingRange[0];

  // Positive gap = new data is entirely after existing; negative = entirely before
  let gapMs = 0;
  if (!overlaps) {
    if (newStart > existingRange[1]) {
      gapMs = newStart - existingRange[1];
    } else {
      gapMs = newEnd - existingRange[0]; // negative
    }
  }

  return { existingRange, newRange, overlaps, gapMs };
}

/**
 * Merge two datasets into one, interleaving by real timestamp.
 * Signals from each dataset are null-filled where the other dataset has coverage.
 *
 * @param {object} existingData - The current loaded dataset
 * @param {object} newData      - The freshly parsed dataset
 * @param {number} [offsetMs=0] - Offset in ms added to all of newData's timestamps before merging
 * @returns {object} Merged data object compatible with the app's data model
 */
export function mergeUnified(existingData, newData, offsetMs = 0) {
  const exTs = existingData.timestamps;
  const newTs = newData.timestamps.map(t => t + offsetMs);

  // Build a sorted, deduplicated combined timestamp array.
  // Dedup tolerance: 0.5ms — timestamps within this range are considered identical.
  const DEDUP_TOL = 0.5;

  // Tag each timestamp with its source so we can map back later.
  // entry: [timestamp, sourceIndex ('ex'=existing idx, 'new'=new idx)]
  const all = [];
  for (let i = 0; i < exTs.length; i++) all.push([exTs[i], 'ex', i]);
  for (let i = 0; i < newTs.length; i++) all.push([newTs[i], 'new', i]);
  all.sort((a, b) => a[0] - b[0]);

  // Build combined timestamps, tracking which source index maps to each combined index.
  // exMap[combined_idx] = existing source index, or -1
  // newMap[combined_idx] = new source index, or -1
  const combinedTs = [];
  const exMap = [];   // combined index → existing timestamp index (-1 if none)
  const newMap = [];  // combined index → new timestamp index (-1 if none)

  let i = 0;
  while (i < all.length) {
    const [ts, , ] = all[i];
    let exIdx = -1;
    let newIdx = -1;

    // Collect all entries within DEDUP_TOL of this timestamp
    let j = i;
    while (j < all.length && all[j][0] - ts <= DEDUP_TOL) {
      if (all[j][1] === 'ex') exIdx = all[j][2];
      else newIdx = all[j][2];
      j++;
    }

    combinedTs.push(ts);
    exMap.push(exIdx);
    newMap.push(newIdx);
    i = j;
  }

  const N = combinedTs.length;

  // Build merged signals array
  const mergedSignals = [];

  // Existing signals
  for (const sig of existingData.signals) {
    const values = new Array(N).fill(null);
    for (let ci = 0; ci < N; ci++) {
      const ei = exMap[ci];
      if (ei !== -1) values[ci] = sig.values[ei] ?? null;
    }
    mergedSignals.push({ ...sig, values });
  }

  // New signals
  for (const sig of newData.signals) {
    const values = new Array(N).fill(null);
    for (let ci = 0; ci < N; ci++) {
      const ni = newMap[ci];
      if (ni !== -1) values[ci] = sig.values[ni] ?? null;
    }
    mergedSignals.push({ ...sig, values });
  }

  // Merge tagNames
  const mergedTagNames = [
    ...(existingData.tagNames || existingData.signals.map(s => s.name)),
    ...(newData.tagNames || newData.signals.map(s => s.name)),
  ];

  // Detect sample rate mismatch
  const exPeriod = existingData.meta?.samplePeriod;
  const newPeriod = newData.meta?.samplePeriod;
  const sampleRateWarning = exPeriod && newPeriod && exPeriod !== newPeriod;

  // Merged metadata: prefer finer (smaller) sample period
  const mergedMeta = {
    ...existingData.meta,
    trendName: `${existingData.meta?.trendName || 'Original'} + ${newData.meta?.trendName || 'Imported'}`,
    samplePeriod: exPeriod && newPeriod ? Math.min(exPeriod, newPeriod) : (exPeriod || newPeriod),
    tagCount: mergedSignals.length,
  };

  return {
    meta: mergedMeta,
    timestamps: combinedTs,
    signals: mergedSignals,
    tagNames: mergedTagNames,
    sampleRateWarning: sampleRateWarning || false,
  };
}
