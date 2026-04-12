import { test, expect } from 'vitest';
import {
  remapSignalIndex,
  shiftIndexedMap,
  remapEquationExpression,
  remapDerivedConfig,
  resolveSignalSeam,
  shiftSeriesBackward,
} from '../../src/utils/signalRemapping.js';

// ── remapSignalIndex ──────────────────────────────────────────────────────────

test('remapSignalIndex returns null when index matches removed', () => {
  expect(remapSignalIndex(2, 2)).toBe(null);
});

test('remapSignalIndex shifts down when index is above removed', () => {
  expect(remapSignalIndex(3, 2)).toBe(2);
  expect(remapSignalIndex(5, 2)).toBe(4);
});

test('remapSignalIndex is unchanged when index is below removed', () => {
  expect(remapSignalIndex(1, 2)).toBe(1);
  expect(remapSignalIndex(0, 5)).toBe(0);
});

// ── shiftIndexedMap ───────────────────────────────────────────────────────────

test('shiftIndexedMap removes the key matching removedIdx', () => {
  const result = shiftIndexedMap({ 0: 'a', 1: 'b' }, 1);
  expect(result[1]).toBe(undefined);
});

test('shiftIndexedMap shifts keys above removed down by 1', () => {
  const result = shiftIndexedMap({ 0: 'a', 1: 'b', 2: 'c' }, 1);
  expect(result[0]).toBe('a');
  expect(result[1]).toBe('c');
});

test('shiftIndexedMap returns empty object for empty input', () => {
  expect(shiftIndexedMap({}, 0)).toEqual({});
  expect(shiftIndexedMap(null, 0)).toEqual({});
});

test('shiftIndexedMap ignores NaN keys', () => {
  const result = shiftIndexedMap({ notANumber: 'x', 1: 'y' }, 0);
  expect(result['notANumber']).toBe(undefined);
  expect(result[0]).toBe('y');
});

// ── remapEquationExpression ───────────────────────────────────────────────────

test('remapEquationExpression shifts token above removed', () => {
  expect(remapEquationExpression('s2 - s1', 0)).toBe('s1 - s0');
});

test('remapEquationExpression replaces removed token with NaN', () => {
  expect(remapEquationExpression('s1 + s2', 1)).toBe('NaN + s1');
});

test('remapEquationExpression returns expression unchanged when no tokens affected', () => {
  expect(remapEquationExpression('s0 + s1', 5)).toBe('s0 + s1');
});

test('remapEquationExpression handles empty/null expression safely', () => {
  expect(remapEquationExpression('', 0)).toBe('');
  expect(remapEquationExpression(null, 0)).toBe('');
});

// ── remapDerivedConfig ────────────────────────────────────────────────────────

test('remapDerivedConfig rolling_avg remaps source index', () => {
  const result = remapDerivedConfig({ type: 'rolling_avg', source: 3 }, 1);
  expect(result.source).toBe(2);
});

test('remapDerivedConfig rolling_avg marks invalidRef when source is removed', () => {
  const result = remapDerivedConfig({ type: 'rolling_avg', source: 1 }, 1);
  expect(result.invalidRef).toBe(true);
  expect(result.source).toBe(0);
});

test('remapDerivedConfig difference remaps both sources', () => {
  const result = remapDerivedConfig({ type: 'difference', sources: [2, 4] }, 1);
  expect(result.sources).toEqual([1, 3]);
});

test('remapDerivedConfig difference marks invalidRef when either source is removed', () => {
  const result = remapDerivedConfig({ type: 'difference', sources: [1, 4] }, 1);
  expect(result.invalidRef).toBe(true);
});

test('remapDerivedConfig equation remaps expression tokens', () => {
  const result = remapDerivedConfig({ type: 'equation', expression: 's2 - s0' }, 1);
  expect(result.expression).toBe('s1 - s0');
});

test('remapDerivedConfig sum remaps both sources like difference', () => {
  const result = remapDerivedConfig({ type: 'sum', sources: [2, 4] }, 1);
  expect(result.sources).toEqual([1, 3]);
});

test('remapDerivedConfig returns cfg unchanged for unknown type', () => {
  const cfg = { type: 'unknown_future_type', foo: 'bar' };
  expect(remapDerivedConfig(cfg, 1)).toEqual(cfg);
});

test('remapDerivedConfig returns cfg for null input', () => {
  expect(remapDerivedConfig(null, 1)).toBe(null);
});

// ── resolveSignalSeam ─────────────────────────────────────────────────────────

test('resolveSignalSeam active is false when offset resolves to zero', () => {
  const values = Array.from({ length: 10 }, (_, i) => i * 36);
  const result = resolveSignalSeam({ seamOffsetPct: 0 }, values);
  expect(result.active).toBe(false);
});

test('resolveSignalSeam clamps percent to [-100, 100]', () => {
  const values = Array.from({ length: 10 }, (_, i) => i * 36);
  const over = resolveSignalSeam({ seamOffsetPct: 150 }, values);
  const under = resolveSignalSeam({ seamOffsetPct: -200 }, values);
  expect(over.percent).toBe(100);
  expect(under.percent).toBe(-100);
});

test('resolveSignalSeam returns active true for non-zero offset', () => {
  const values = Array.from({ length: 360 }, (_, i) => i);
  const result = resolveSignalSeam({ seamOffsetPct: 25 }, values);
  expect(result.active).toBe(true);
  expect(result.percent).toBe(25);
});

test('resolveSignalSeam falls back to seamOffset when seamOffsetPct is absent', () => {
  const values = Array.from({ length: 360 }, (_, i) => i);
  const result = resolveSignalSeam({ seamOffset: 90 }, values);
  expect(result.percent).toBeCloseTo(50, 0);
  expect(result.active).toBe(true);
});

// ── shiftSeriesBackward ───────────────────────────────────────────────────────

test('shiftSeriesBackward returns original values when shift is zero', () => {
  const values = [1, 2, 3, 4, 5];
  const result = shiftSeriesBackward(values, 0);
  expect(result).toBe(values);
});

test('shiftSeriesBackward fills nulls at the tail beyond available data', () => {
  const values = [10, 20, 30, 40, 50];
  const shifted = shiftSeriesBackward(values, 2);
  expect(shifted[shifted.length - 1]).toBe(null);
  expect(shifted[shifted.length - 2]).toBe(null);
});

test('shiftSeriesBackward interpolates between adjacent values', () => {
  const values = [0, 10, 20, 30, 40];
  const shifted = shiftSeriesBackward(values, 0.5);
  expect(shifted[0]).toBeCloseTo(5, 1);
});

test('shiftSeriesBackward propagates null gaps correctly', () => {
  const values = [1, null, 3, 4, 5];
  const shifted = shiftSeriesBackward(values, 1);
  expect(shifted[0]).toBe(null);
});
