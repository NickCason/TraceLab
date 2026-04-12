import { test, expect } from 'vitest';
import { buildDefaultExportPens, resolveExportWindow } from '../../src/utils/exportPens.js';

test('buildDefaultExportPens returns one selected entry per signal', () => {
  const data = {
    signals: [{ values: [] }, { values: [] }, { values: [] }],
  };

  expect(buildDefaultExportPens(data)).toEqual([true, true, true]);
});

test('buildDefaultExportPens adapts to changed signal counts', () => {
  const shortData = { signals: [{ values: [] }] };
  const longData = { signals: [{ values: [] }, { values: [] }, { values: [] }, { values: [] }] };

  expect(buildDefaultExportPens(shortData).length).toBe(1);
  expect(buildDefaultExportPens(longData).length).toBe(4);
});

test('resolveExportWindow guards empty and out-of-bounds ranges', () => {
  expect(resolveExportWindow([], [0, 1], 'all').ok).toBe(false);
  expect(resolveExportWindow([1, 2, 3], [9, 12], 'view').ok).toBe(false);

  const clamped = resolveExportWindow([1, 2, 3], [-5, 10], 'view');
  expect(clamped.ok).toBe(true);
  expect([clamped.start, clamped.end]).toEqual([0, 3]);
});
