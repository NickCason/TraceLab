import { test, expect } from 'vitest';
import { fmtTime, fmtDate, fmtDateISO, fmtTsClean } from '../../src/utils/date.js';

test('date formatting utilities return expected padded values', () => {
  const ms = new Date(2024, 0, 2, 3, 4, 5, 6).getTime();

  expect(fmtTime(ms)).toBe('03:04:05.006');
  expect(fmtDate(ms)).toBe('1/2/2024');
  expect(fmtDateISO(ms)).toBe('2024-01-02');
  expect(fmtTsClean(ms)).toBe('2024-01-02 03:04:05.006');
});
