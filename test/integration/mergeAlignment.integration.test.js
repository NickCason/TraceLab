import { test, expect } from 'vitest';

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
  expect(merged.timestamps).toEqual([1000, 1010, 1015, 1020]);
  expect(merged.signals[0].values).toEqual([1, 2, null, 3]);
  expect(merged.signals[1].values).toEqual([8, null, 9, 10]);
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
  expect(merged.sampleRateWarning).toBe(true);
  expect(merged.timestamps).toEqual([0, 5, 10, 20]);
  expect(merged.meta.samplePeriod).toBe(5);
});

test('alignment guards empty datasets and reports invalid alignment metadata', () => {
  const info = computeAlignmentInfo({ timestamps: [1, 2] }, { timestamps: [] });
  expect(info.isValid).toBe(false);

  expect(() => mergeUnified({ timestamps: [1], signals: [], meta: {} }, { timestamps: [], signals: [], meta: {} })).toThrow(/empty timestamps/);
});
