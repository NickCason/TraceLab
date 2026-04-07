import test from 'node:test';
import assert from 'node:assert/strict';
import { arrayMinMax, computeStats } from '../src/utils/stats.js';

test('arrayMinMax computes min/max/count/sum while ignoring nullish values', () => {
  const result = arrayMinMax([null, 2, undefined, -1, 3]);
  assert.deepEqual(result, { min: -1, max: 3, count: 3, sum: 4 });
});

test('arrayMinMax supports start/end slices', () => {
  const result = arrayMinMax([100, 1, 2, 3, 200], 1, 4);
  assert.deepEqual(result, { min: 1, max: 3, count: 3, sum: 6 });
});

test('arrayMinMax returns null when no numeric samples are present', () => {
  assert.equal(arrayMinMax([null, undefined]), null);
});

test('computeStats returns formatted numeric summary', () => {
  const result = computeStats([1, 2, 3]);
  assert.deepEqual(result, {
    min: '1.0000',
    max: '3.0000',
    avg: '2.0000',
    range: '2.0000',
  });
});

test('computeStats returns placeholders when no data is available', () => {
  const result = computeStats([null, undefined]);
  assert.deepEqual(result, { min: '—', max: '—', avg: '—', range: '—' });
});
