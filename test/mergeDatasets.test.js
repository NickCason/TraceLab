import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAlignmentInfo, mergeUnified } from '../src/utils/mergeDatasets.js';

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
  assert.equal(merged.timestamps.length, 2);
  assert.deepEqual(merged.signals[0].values, [1, 2]);
  assert.deepEqual(merged.signals[1].values, [9, null]);
});

test('computeAlignmentInfo safely handles empty timestamp arrays', () => {
  const info = computeAlignmentInfo({ timestamps: [] }, { timestamps: [10, 20] }, 0);
  assert.equal(info.isValid, false);
  assert.deepEqual(info.existingRange, [null, null]);
});

test('mergeUnified rejects empty timestamp datasets', () => {
  assert.throws(
    () => mergeUnified({ timestamps: [], signals: [], meta: {} }, { timestamps: [1], signals: [], meta: {} }),
    /empty timestamps/
  );
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
  assert.deepEqual(merged.meta.addedSourceFiles, ['run2.csv']);
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
  assert.deepEqual(merged.meta.addedSourceFiles, []);
});
