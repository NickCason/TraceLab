// test/utils/computeUnrolledDelta.test.js
import { test, expect } from 'vitest';
import { computeUnrolledDelta } from '../../src/utils/computeUnrolledDelta.js';

const makeEntry = (values, span = null) => ({
  seam: span ? { span } : null,
  signal: { values },
});

test('returns null when entry has no seam', () => {
  expect(computeUnrolledDelta(makeEntry([0, 90, 180]), 0, 2)).toBe(null);
});

test('returns null when idxA === idxB', () => {
  expect(computeUnrolledDelta(makeEntry([0, 90], 360), 1, 1)).toBe(null);
});

test('returns null when span <= 0', () => {
  expect(computeUnrolledDelta(makeEntry([0, 90], 0), 0, 1)).toBe(null);
  expect(computeUnrolledDelta(makeEntry([0, 90], -1), 0, 1)).toBe(null);
});

test('returns null when starting value is null', () => {
  expect(computeUnrolledDelta(makeEntry([null, 90], 360), 0, 1)).toBe(null);
});

test('returns null when no rollovers occur (plain monotone movement)', () => {
  expect(computeUnrolledDelta(makeEntry([0, 90, 180], 360), 0, 2)).toBe(null);
});

test('detects forward rollover and returns delta + count', () => {
  const result = computeUnrolledDelta(makeEntry([350, 10], 360), 0, 1);
  expect(result).not.toBe(null);
  expect(result.rollovers).toBe(1);
  expect(result.delta).toBeCloseTo(20, 9);
});

test('detects backward rollover', () => {
  const result = computeUnrolledDelta(makeEntry([10, 350], 360), 0, 1);
  expect(result).not.toBe(null);
  expect(result.rollovers).toBe(1);
  expect(result.delta).toBeCloseTo(-20, 9);
});

test('works in reverse direction (idxB < idxA)', () => {
  const result = computeUnrolledDelta(makeEntry([350, 10], 360), 1, 0);
  expect(result).not.toBe(null);
  expect(result.rollovers).toBe(1);
  expect(result.delta).toBeCloseTo(-20, 9);
});

test('skips null and NaN values mid-sequence', () => {
  const result = computeUnrolledDelta(makeEntry([350, null, 10], 360), 0, 2);
  expect(result).not.toBe(null);
  expect(result.rollovers).toBe(1);
});
