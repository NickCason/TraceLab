import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { parseDeterministicTimestamp, parseStudio5000CSV } from '../../src/utils/parser.js';

const csvFixture = (name) => fs.readFileSync(path.join(process.cwd(), 'test/fixtures/csv', name), 'utf8');

test('quote-heavy CSV fixture parses embedded commas, escaped quotes, and blank fields safely', () => {
  const parsed = parseStudio5000CSV(csvFixture('quote-heavy.csv'));
  expect(parsed).toBeTruthy();
  expect(parsed.meta.controller).toBe('Line A, "Primary"');
  expect(parsed.tagNames).toEqual(['Flow, Main', 'Valve "A" Position', 'Comment']);
  expect(parsed.signals[0].values[0]).toBe(1);
  expect(parsed.signals[0].values[1]).toBe(null);
  expect(parsed.signals[1].values[2]).toBe(null);
  expect(parsed.signals[2].values[0]).toBe(null);
});

test('timestamp-shape fixture resolves multiple supported date/time formats to deterministic epochs', () => {
  const parsed = parseStudio5000CSV(csvFixture('timestamp-shapes.csv'));
  expect(parsed).toBeTruthy();
  expect(parsed.timestamps).toEqual([
    new Date(2024, 2, 5, 1, 2, 3, 4).getTime(),
    new Date(2024, 2, 5, 1, 2, 3, 250).getTime(),
    new Date(2024, 2, 5, 1, 2, 3, 40).getTime(),
    new Date(2024, 2, 5, 1, 2, 3, 500).getTime(),
  ]);
  expect(parseDeterministicTimestamp('bad', '01:02:03;000')).toBe(null);
  expect(parseDeterministicTimestamp('2024-03-05', '99:99:99;999')).toBe(null);
});

test('malformed rows are skipped without crashing and malformed files fail explicitly', () => {
  const parsed = parseStudio5000CSV(csvFixture('malformed-rows.csv'));
  expect(parsed).toBeTruthy();
  expect(parsed.timestamps.length).toBe(3);
  expect(parsed.signals[0].values).toEqual([1, 7, null]);
  expect(parsed.signals[1].values).toEqual([2, null, 10]);

  const noHeader = parseStudio5000CSV('Trend Name:,"No Header"\nData,2024-01-01,00:00:00;000,1');
  expect(noHeader).toBe(null);
});
