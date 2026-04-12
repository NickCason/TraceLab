import { test, expect } from 'vitest';
import { computeAlignmentInfo, mergeUnified } from '../../src/utils/mergeDatasets.js';

test('mergeUnified preserves same-source samples that fall within one tolerance bucket', () => {
  const existing = {
    meta: {},
    timestamps: [1000, 1000.2],
    signals: [{ name: 'ex', values: [1, 2] }],
    tagNames: ['ex'],
  };
  const incoming = {
    meta: {},
    timestamps: [1000.1],
    signals: [{ name: 'new', values: [9] }],
    tagNames: ['new'],
  };

  const merged = mergeUnified(existing, incoming, 0);
  expect(merged.timestamps.length).toBe(2);
  expect(merged.signals[0].values).toEqual([1, 2]);
  expect(merged.signals[1].values).toEqual([9, null]);
});

test('computeAlignmentInfo safely handles empty timestamp arrays', () => {
  const info = computeAlignmentInfo({ timestamps: [] }, { timestamps: [10, 20] }, 0);
  expect(info.isValid).toBe(false);
  expect(info.existingRange).toEqual([null, null]);
});

test('mergeUnified rejects empty timestamp datasets', () => {
  expect(() => mergeUnified({ timestamps: [], signals: [], meta: {} }, { timestamps: [1], signals: [], meta: {} })).toThrow(/empty timestamps/);
});

test('mergeUnified accumulates addedSourceFiles in mergedMeta', () => {
  const existing = {
    meta: { sourceFile: 'run1.csv', addedSourceFiles: [] },
    timestamps: [1000, 2000],
    signals: [{ name: 'A', values: [1, 2] }],
    tagNames: ['A'],
  };
  const incoming = {
    meta: { sourceFile: 'run2.csv' },
    timestamps: [3000, 4000],
    signals: [{ name: 'B', values: [3, 4] }],
    tagNames: ['B'],
  };

  const merged = mergeUnified(existing, incoming, 0);
  expect(merged.meta.addedSourceFiles).toEqual(['run2.csv']);
});

test('mergeUnified omits falsy sourceFile from addedSourceFiles', () => {
  const existing = {
    meta: {},
    timestamps: [1000, 2000],
    signals: [{ name: 'A', values: [1, 2] }],
    tagNames: ['A'],
  };
  const incoming = {
    meta: {},  // no sourceFile set
    timestamps: [3000, 4000],
    signals: [{ name: 'B', values: [3, 4] }],
    tagNames: ['B'],
  };

  const merged = mergeUnified(existing, incoming, 0);
  expect(merged.meta.addedSourceFiles).toEqual([]);
});
