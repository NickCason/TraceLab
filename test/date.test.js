import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtTime, fmtDate, fmtDateISO, fmtTsClean } from '../src/utils/date.js';

test('date formatting utilities return expected padded values', () => {
  const ms = new Date(2024, 0, 2, 3, 4, 5, 6).getTime();

  assert.equal(fmtTime(ms), '03:04:05.006');
  assert.equal(fmtDate(ms), '1/2/2024');
  assert.equal(fmtDateISO(ms), '2024-01-02');
  assert.equal(fmtTsClean(ms), '2024-01-02 03:04:05.006');
});
