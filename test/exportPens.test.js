import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDefaultExportPens, resolveExportWindow } from '../src/utils/exportPens.js';

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

test('resolveExportWindow guards empty and out-of-bounds ranges', () => {
  assert.equal(resolveExportWindow([], [0, 1], 'all').ok, false);
  assert.equal(resolveExportWindow([1, 2, 3], [9, 12], 'view').ok, false);

  const clamped = resolveExportWindow([1, 2, 3], [-5, 10], 'view');
  assert.equal(clamped.ok, true);
  assert.deepEqual([clamped.start, clamped.end], [0, 3]);
});
