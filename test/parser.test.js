import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStudio5000CSV, parseDeterministicTimestamp } from '../src/utils/parser.js';

test('parseStudio5000CSV parses metadata, tags, and timestamp spacing', () => {
  const csv = [
    'Controller Name:,"MainController"',
    'Trend Name:,"Trend1"',
    'Sample Period:,"5" ms',
    'Header:,"Date","Time","TagA","TagB"',
    'Data,2024-01-01,00:00:00;000,1,0',
    'Data,2024-01-01,00:00:00;005,2,1',
  ].join('\n');

  const parsed = parseStudio5000CSV(csv);
  assert.ok(parsed);
  assert.equal(parsed.meta.controller, 'MainController');
  assert.equal(parsed.meta.trendName, 'Trend1');
  assert.equal(parsed.meta.samplePeriod, 5);
  assert.deepEqual(parsed.tagNames, ['TagA', 'TagB']);
  assert.equal(parsed.timestamps.length, 2);
  assert.equal(parsed.timestamps[1] - parsed.timestamps[0], 5);
});

test('parseStudio5000CSV detects digital-like vs analog signals', () => {
  const csv = [
    'Header:,"Date","Time","DigitalLike","Analog"',
    'Data,2024-01-01,00:00:00;000,0,10.1',
    'Data,2024-01-01,00:00:00;005,1,10.3',
    'Data,2024-01-01,00:00:00;010,0,10.5',
    'Data,2024-01-01,00:00:00;015,1,10.7',
  ].join('\n');

  const parsed = parseStudio5000CSV(csv);
  assert.equal(parsed.signals[0].isDigital, true);
  assert.equal(parsed.signals[1].isDigital, false);
});

test('parseStudio5000CSV handles quoted commas, embedded quotes, and trailing empty cells', () => {
  const csv = [
    'Header:,"Date","Time","Tag,One","Tag""Two""","TagThree"',
    'Data,2024-01-01,00:00:00;000,"1,234","""quoted, value""",',
    'Data,2024-01-01,00:00:00;005,"",5.5,7',
  ].join('\n');

  const parsed = parseStudio5000CSV(csv);
  assert.deepEqual(parsed.tagNames, ['Tag,One', 'Tag"Two"', 'TagThree']);
  assert.equal(parsed.signals[0].values[0], 1);
  assert.equal(parsed.signals[1].values[0], null);
  assert.equal(parsed.signals[2].values[0], null);
  assert.equal(parsed.signals[0].values[1], null);
  assert.equal(parsed.signals[1].values[1], 5.5);
  assert.equal(parsed.signals[2].values[1], 7);
});

test('parseDeterministicTimestamp is explicit and stable for supported formats', () => {
  const iso = parseDeterministicTimestamp('2024-01-02', '03:04:05;006');
  const us = parseDeterministicTimestamp('1/2/2024', '03:04:05.7');

  assert.equal(iso, new Date(2024, 0, 2, 3, 4, 5, 6).getTime());
  assert.equal(us, new Date(2024, 0, 2, 3, 4, 5, 700).getTime());
  assert.equal(parseDeterministicTimestamp('not-a-date', '03:00:00;000'), null);
});
