// test/computeUnrolledDelta.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeUnrolledDelta } from '../src/utils/computeUnrolledDelta.js';

const makeEntry = (values, span = null) => ({
  seam: span ? { span } : null,
  signal: { values },
});

test('returns null when entry has no seam', () => {
  assert.equal(computeUnrolledDelta(makeEntry([0, 90, 180]), 0, 2), null);
});

test('returns null when idxA === idxB', () => {
  assert.equal(computeUnrolledDelta(makeEntry([0, 90], 360), 1, 1), null);
});

test('returns null when span <= 0', () => {
  assert.equal(computeUnrolledDelta(makeEntry([0, 90], 0), 0, 1), null);
  assert.equal(computeUnrolledDelta(makeEntry([0, 90], -1), 0, 1), null);
});

test('returns null when starting value is null', () => {
  assert.equal(computeUnrolledDelta(makeEntry([null, 90], 360), 0, 1), null);
});

test('returns null when no rollovers occur (plain monotone movement)', () => {
  assert.equal(computeUnrolledDelta(makeEntry([0, 90, 180], 360), 0, 2), null);
});

test('detects forward rollover and returns delta + count', () => {
  const result = computeUnrolledDelta(makeEntry([350, 10], 360), 0, 1);
  assert.notEqual(result, null);
  assert.equal(result.rollovers, 1);
  assert.ok(Math.abs(result.delta - 20) < 1e-9, `expected delta ~20, got ${result.delta}`);
});

test('detects backward rollover', () => {
  const result = computeUnrolledDelta(makeEntry([10, 350], 360), 0, 1);
  assert.notEqual(result, null);
  assert.equal(result.rollovers, 1);
  assert.ok(Math.abs(result.delta - (-20)) < 1e-9, `expected delta ~-20, got ${result.delta}`);
});

test('works in reverse direction (idxB < idxA)', () => {
  const result = computeUnrolledDelta(makeEntry([350, 10], 360), 1, 0);
  assert.notEqual(result, null);
  assert.equal(result.rollovers, 1);
  assert.ok(Math.abs(result.delta - (-20)) < 1e-9);
});

test('skips null and NaN values mid-sequence', () => {
  const result = computeUnrolledDelta(makeEntry([350, null, 10], 360), 0, 2);
  assert.notEqual(result, null);
  assert.equal(result.rollovers, 1);
});
