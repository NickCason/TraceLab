import test from 'node:test';
import assert from 'node:assert/strict';

import { computeAlignmentInfo, mergeUnified } from '../../src/utils/mergeDatasets.js';

test('merge remains stable with near-duplicate timestamps across datasets', () => {
  const existing = {
    meta: { trendName: 'A', samplePeriod: 10 },
    timestamps: [1000, 1010, 1020],
    signals: [{ name: 'A1', values: [1, 2, 3] }],
    tagNames: ['A1'],
  };
  const incoming = {
    meta: { trendName: 'B', samplePeriod: 10 },
    timestamps: [1000.4, 1015, 1020.3],
    signals: [{ name: 'B1', values: [8, 9, 10] }],
    tagNames: ['B1'],
  };

  const merged = mergeUnified(existing, incoming);
  assert.deepEqual(merged.timestamps, [1000, 1010, 1015, 1020]);
  assert.deepEqual(merged.signals[0].values, [1, 2, null, 3]);
  assert.deepEqual(merged.signals[1].values, [8, null, 9, 10]);
});

test('sample-rate mismatch surfaces warning while preserving merged ordering', () => {
  const existing = {
    meta: { trendName: 'Fast', samplePeriod: 5 },
    timestamps: [0, 5, 10],
    signals: [{ name: 'fast', values: [1, 2, 3] }],
    tagNames: ['fast'],
  };
  const incoming = {
    meta: { trendName: 'Slow', samplePeriod: 20 },
    timestamps: [0, 20],
    signals: [{ name: 'slow', values: [50, 60] }],
    tagNames: ['slow'],
  };

  const merged = mergeUnified(existing, incoming);
  assert.equal(merged.sampleRateWarning, true);
  assert.deepEqual(merged.timestamps, [0, 5, 10, 20]);
  assert.equal(merged.meta.samplePeriod, 5);
});

test('alignment guards empty datasets and reports invalid alignment metadata', () => {
  const info = computeAlignmentInfo({ timestamps: [1, 2] }, { timestamps: [] });
  assert.equal(info.isValid, false);

  assert.throws(
    () => mergeUnified({ timestamps: [1], signals: [], meta: {} }, { timestamps: [], signals: [], meta: {} }),
    /empty timestamps/
  );
});
