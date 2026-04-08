import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { parseDeterministicTimestamp, parseStudio5000CSV } from '../../src/utils/parser.js';

const csvFixture = (name) => fs.readFileSync(path.join(process.cwd(), 'test/fixtures/csv', name), 'utf8');

test('quote-heavy CSV fixture parses embedded commas, escaped quotes, and blank fields safely', () => {
  const parsed = parseStudio5000CSV(csvFixture('quote-heavy.csv'));
  assert.ok(parsed);
  assert.equal(parsed.meta.controller, 'Line A, "Primary"');
  assert.deepEqual(parsed.tagNames, ['Flow, Main', 'Valve "A" Position', 'Comment']);
  assert.equal(parsed.signals[0].values[0], 1);
  assert.equal(parsed.signals[0].values[1], null);
  assert.equal(parsed.signals[1].values[2], null);
  assert.equal(parsed.signals[2].values[0], null);
});

test('timestamp-shape fixture resolves multiple supported date/time formats to deterministic epochs', () => {
  const parsed = parseStudio5000CSV(csvFixture('timestamp-shapes.csv'));
  assert.ok(parsed);
  assert.deepEqual(parsed.timestamps, [
    new Date(2024, 2, 5, 1, 2, 3, 4).getTime(),
    new Date(2024, 2, 5, 1, 2, 3, 250).getTime(),
    new Date(2024, 2, 5, 1, 2, 3, 40).getTime(),
    new Date(2024, 2, 5, 1, 2, 3, 500).getTime(),
  ]);
  assert.equal(parseDeterministicTimestamp('bad', '01:02:03;000'), null);
  assert.equal(parseDeterministicTimestamp('2024-03-05', '99:99:99;999'), null);
});

test('malformed rows are skipped without crashing and malformed files fail explicitly', () => {
  const parsed = parseStudio5000CSV(csvFixture('malformed-rows.csv'));
  assert.ok(parsed);
  assert.equal(parsed.timestamps.length, 3);
  assert.deepEqual(parsed.signals[0].values, [1, 7, null]);
  assert.deepEqual(parsed.signals[1].values, [2, null, 10]);

  const noHeader = parseStudio5000CSV('Trend Name:,"No Header"\nData,2024-01-01,00:00:00;000,1');
  assert.equal(noHeader, null);
});
