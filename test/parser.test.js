import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStudio5000CSV } from '../src/utils/parser.js';

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
