import { test, expect, describe, it } from 'vitest';
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

describe('mergeUnified — non-overlapping datasets and alignment info', () => {
  const mkDataset = (start, count, signalCount = 1) => ({
    timestamps: Array.from({ length: count }, (_, i) => start + i * 5),
    signals: Array.from({ length: signalCount }, (_, si) => ({
      name: `S${si}`,
      values: Array.from({ length: count }, (_, i) => i * (si + 1)),
      isDigital: false,
    })),
    tagNames: Array.from({ length: signalCount }, (_, si) => `S${si}`),
    meta: { samplePeriod: 5, sampleUnit: 'ms' },
  });

  it('merges two non-overlapping datasets into a longer timeline', () => {
    const a = mkDataset(0, 10);
    const b = mkDataset(1000, 10);
    const result = mergeUnified(a, b, 0);
    expect(result.timestamps.length).toBe(20); // no overlap, all 20 unique timestamps
    expect(result.signals.length).toBe(a.signals.length + b.signals.length);
  });

  it('interleaves signals — non-b slots are null for new signal, non-a slots are null for existing signal', () => {
    const a = mkDataset(0, 3);
    const b = mkDataset(1000, 3);
    const result = mergeUnified(a, b, 0);
    // First 3 timestamps come from a; b-signal values should be null there
    expect(result.signals[1].values[0]).toBeNull();
    // Last 3 timestamps come from b; a-signal values should be null there
    expect(result.signals[0].values[3]).toBeNull();
  });

  it('computeAlignmentInfo reports non-overlapping when time ranges do not intersect', () => {
    const a = mkDataset(0, 5);
    const b = mkDataset(9999, 5);
    const info = computeAlignmentInfo(a, b, 0);
    expect(info.overlaps).toBe(false);
    expect(info.isValid).toBe(true);
  });

  it('computeAlignmentInfo reports overlapping when time ranges intersect', () => {
    const a = mkDataset(0, 20); // timestamps 0..95
    const b = mkDataset(50, 20); // timestamps 50..145 — overlaps with a
    const info = computeAlignmentInfo(a, b, 0);
    expect(info.overlaps).toBe(true);
    expect(info.isValid).toBe(true);
  });

  it('computeAlignmentInfo applies offsetMs to new dataset range before comparing', () => {
    const a = mkDataset(0, 5);   // range [0, 20]
    const b = mkDataset(0, 5);   // range [0, 20] shifted by 10000 => [10000, 10020]
    const info = computeAlignmentInfo(a, b, 10000);
    expect(info.overlaps).toBe(false);
    expect(info.newRange[0]).toBe(10000);
  });

  it('gapMs is positive when new dataset starts after existing ends', () => {
    const a = mkDataset(0, 3);    // ends at 10
    const b = mkDataset(1000, 3); // starts at 1000
    const info = computeAlignmentInfo(a, b, 0);
    expect(info.gapMs).toBeGreaterThan(0);
  });
});
