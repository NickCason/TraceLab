import { test, expect } from 'vitest';
import {
  normalizeToSeam,
  denormalizeFromSeam,
  hasSeamAdjustment,
  inferSeamDomain,
  clampSeamPercent,
  snapSeamPercent,
  seamPercentToOffset,
  seamOffsetToPercent,
} from '../../src/utils/seamAdjustment.js';

test('normalizeToSeam wraps values into the seam span', () => {
  const seam = { origin: 0, span: 360, offset: 0 };
  expect(normalizeToSeam(370, seam)).toBe(10);
  expect(normalizeToSeam(-10, seam)).toBe(350);
});

test('denormalizeFromSeam applies inverse offset wrapping behavior', () => {
  const seam = { origin: 0, span: 360, offset: 30 };
  expect(denormalizeFromSeam(10, seam)).toBe(340);
});

test('normalize/denormalize return null for invalid values', () => {
  expect(normalizeToSeam(null, {})).toBe(null);
  expect(denormalizeFromSeam(Number.NaN, {})).toBe(null);
});

test('hasSeamAdjustment detects meaningful offsets', () => {
  expect(hasSeamAdjustment({ offset: 0 })).toBe(false);
  expect(hasSeamAdjustment({ offset: 0.0000000001 })).toBe(false);
  expect(hasSeamAdjustment({ offset: 1 })).toBe(true);
});

test('inferSeamDomain keeps legacy 0..360 behavior and supports arbitrary ranges', () => {
  expect(inferSeamDomain([0, 90, 180, 359])).toEqual({ origin: 0, span: 360, isCyclic: true });
  expect(inferSeamDomain([-10, 20, 50])).toEqual({ origin: -10, span: 60, isCyclic: false });
  // Empty/all-null values use the safe fallback — not cyclic
  expect(inferSeamDomain([null, undefined])).toEqual({ origin: 0, span: 360, isCyclic: false });
  // Non-regression: counter-style values (min far above 0) stay isCyclic: false
  expect(inferSeamDomain([479, 500, 600, 797])).toEqual({ origin: 479, span: 318, isCyclic: false });
});

test('percent/offset helpers clamp and convert reliably', () => {
  expect(clampSeamPercent(120)).toBe(100);
  expect(clampSeamPercent(-500)).toBe(-100);
  expect(clampSeamPercent('oops')).toBe(0);

  expect(snapSeamPercent(26, 5)).toBe(25);
  expect(snapSeamPercent(-26, 5)).toBe(-25);

  expect(seamPercentToOffset(50, 360)).toBe(90);
  expect(seamOffsetToPercent(90, 360)).toBe(50);
  expect(seamOffsetToPercent(9999, 360)).toBe(100);
});
