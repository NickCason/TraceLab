import { test, expect } from 'vitest';

import {
  buildMovingAverageCached,
  buildDecimatedIndices,
  computeRangeStats,
} from '../../src/utils/chartPerf.js';

test('moving-average cache returns stable ref and invalidates by window/source', () => {
  const values = [1, 2, 3, 4, 5];
  const avg2a = buildMovingAverageCached(values, 2);
  const avg2b = buildMovingAverageCached(values, 2);
  const avg3 = buildMovingAverageCached(values, 3);
  const avg2newSource = buildMovingAverageCached([1, 2, 3, 4, 5], 2);

  expect(avg2a).toBe(avg2b);
  expect(avg2a).not.toBe(avg3);
  expect(avg2a).not.toBe(avg2newSource);
});

test('range-stat cache returns stable result for unchanged input', () => {
  const values = [null, 5, 2, 7, 4, null];
  const a = computeRangeStats(values, 0, values.length);
  const b = computeRangeStats(values, 0, values.length);

  expect(a).toBe(b);
  expect(a).toEqual({
    min: 2,
    max: 7,
    minIdx: 2,
    maxIdx: 3,
    firstIdx: 1,
    lastIdx: 4,
  });
});

test('range-stat cache invalidates when source data ref or range changes', () => {
  const valuesA = [1, 9, 3, 4];
  const valuesB = [1, 2, 3, 4];

  const a = computeRangeStats(valuesA, 0, 4);
  const b = computeRangeStats(valuesB, 0, 4);
  const c = computeRangeStats(valuesA, 1, 4);

  expect(a).not.toBe(b);
  expect(a).not.toBe(c);
  expect(a.max).toBe(9);
  expect(b.max).toBe(4);
  expect(c.firstIdx).toBe(1);
});

test('downsampling preserves extrema and bypasses for small windows', () => {
  const values = Array.from({ length: 2000 }, (_, i) => Math.sin(i / 20));
  values[750] = 12;
  values[1234] = -9;

  const decimated = buildDecimatedIndices(values, 0, values.length, 120);
  expect(decimated).toContain(750);
  expect(decimated).toContain(1234);

  const small = buildDecimatedIndices(values, 10, 40, 50);
  expect(small).toEqual(Array.from({ length: 30 }, (_, i) => i + 10));
});
