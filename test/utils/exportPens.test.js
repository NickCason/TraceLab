import { test, expect, describe, it } from 'vitest';
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

describe('resolveExportWindow — branch coverage', () => {
  it('returns ok: false when timestamps array is empty', () => {
    const result = resolveExportWindow([], [0, 0], 'all');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('No samples');
  });

  it('returns ok: false when view range results in empty slice (end <= start)', () => {
    const timestamps = [0, 1, 2, 3, 4];
    const result = resolveExportWindow(timestamps, [3, 2], 'view');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('empty');
  });

  it('clamps out-of-bounds view start to 0', () => {
    const timestamps = [0, 1, 2, 3, 4];
    const result = resolveExportWindow(timestamps, [-5, 3], 'view');
    expect(result.ok).toBe(true);
    expect(result.start).toBe(0);
  });

  it('clamps out-of-bounds view end to timestamps.length', () => {
    const timestamps = [0, 1, 2, 3, 4];
    const result = resolveExportWindow(timestamps, [0, 999], 'view');
    expect(result.ok).toBe(true);
    expect(result.end).toBe(5);
  });

  it('uses full range for exportRange "all" regardless of viewRange', () => {
    const timestamps = [0, 1, 2, 3, 4];
    const result = resolveExportWindow(timestamps, [1, 3], 'all');
    expect(result.ok).toBe(true);
    expect(result.start).toBe(0);
    expect(result.end).toBe(5);
  });
});
