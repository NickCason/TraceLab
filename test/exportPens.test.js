import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDefaultExportPens } from '../src/utils/exportPens.js';

test('buildDefaultExportPens returns one selected entry per signal', () => {
  const data = {
    signals: [{ values: [] }, { values: [] }, { values: [] }],
  };

  assert.deepEqual(buildDefaultExportPens(data), [true, true, true]);
});

test('buildDefaultExportPens adapts to changed signal counts', () => {
  const shortData = { signals: [{ values: [] }] };
  const longData = { signals: [{ values: [] }, { values: [] }, { values: [] }, { values: [] }] };

  assert.equal(buildDefaultExportPens(shortData).length, 1);
  assert.equal(buildDefaultExportPens(longData).length, 4);
});
