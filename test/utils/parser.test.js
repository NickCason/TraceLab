import { test, expect } from 'vitest';
import { parseStudio5000CSV, parseDeterministicTimestamp } from '../../src/utils/parser.js';

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
  expect(parsed).toBeTruthy();
  expect(parsed.meta.controller).toBe('MainController');
  expect(parsed.meta.trendName).toBe('Trend1');
  expect(parsed.meta.samplePeriod).toBe(5);
  expect(parsed.tagNames).toEqual(['TagA', 'TagB']);
  expect(parsed.timestamps.length).toBe(2);
  expect(parsed.timestamps[1] - parsed.timestamps[0]).toBe(5);
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
  expect(parsed.signals[0].isDigital).toBe(true);
  expect(parsed.signals[1].isDigital).toBe(false);
});

test('parseStudio5000CSV handles quoted commas, embedded quotes, and trailing empty cells', () => {
  const csv = [
    'Header:,"Date","Time","Tag,One","Tag""Two""","TagThree"',
    'Data,2024-01-01,00:00:00;000,"1,234","""quoted, value""",',
    'Data,2024-01-01,00:00:00;005,"",5.5,7',
  ].join('\n');

  const parsed = parseStudio5000CSV(csv);
  expect(parsed.tagNames).toEqual(['Tag,One', 'Tag"Two"', 'TagThree']);
  expect(parsed.signals[0].values[0]).toBe(1);
  expect(parsed.signals[1].values[0]).toBe(null);
  expect(parsed.signals[2].values[0]).toBe(null);
  expect(parsed.signals[0].values[1]).toBe(null);
  expect(parsed.signals[1].values[1]).toBe(5.5);
  expect(parsed.signals[2].values[1]).toBe(7);
});

test('parseDeterministicTimestamp is explicit and stable for supported formats', () => {
  const iso = parseDeterministicTimestamp('2024-01-02', '03:04:05;006');
  const us = parseDeterministicTimestamp('1/2/2024', '03:04:05.7');

  expect(iso).toBe(new Date(2024, 0, 2, 3, 4, 5, 6).getTime());
  expect(us).toBe(new Date(2024, 0, 2, 3, 4, 5, 700).getTime());
  expect(parseDeterministicTimestamp('not-a-date', '03:00:00;000')).toBe(null);
});
