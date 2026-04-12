import { test, expect, describe, it } from 'vitest';

import { buildChartPanes } from '../../src/utils/buildChartPanes.js';
import { resolveSignalSeam } from '../../src/utils/signalRemapping.js';

const data = {
  tagNames: ['A', 'B'],
  signals: [
    { values: [1, 2, 3], isDigital: false },
    { values: [2, 4, 6], isDigital: false },
  ],
};

const baseInput = {
  data,
  visible: [true, true],
  groups: [1, 1],
  signalStyles: {},
  metadata: {},
  avgWindow: {},
  hideOriginal: {},
  getDisplayName: (i) => data.tagNames[i],
  getGroupLabel: (g) => `Group ${g}`,
  getAutoSignalColor: () => '#abc',
  theme: 'dark',
  palette: ['#111', '#222'],
};

test('shared pane builder yields equivalent shapes for primary/comparison inputs', () => {
  const primary = buildChartPanes({ ...baseInput, paneIdPrefix: 'group' });
  const comparison = buildChartPanes({ ...baseInput, paneIdPrefix: 'cmp-group' });

  expect(primary.length).toBe(1);
  expect(comparison.length).toBe(1);
  expect(primary[0].entries.length).toBe(comparison[0].entries.length);
  expect(primary[0].entries.map(e => e.displayName)).toEqual(comparison[0].entries.map(e => e.displayName));
});

test('pane builder applies styles, moving averages, and visibility filters', () => {
  const panes = buildChartPanes({
    ...baseInput,
    visible: [true, false],
    avgWindow: { 0: 2 },
    signalStyles: { 0: { color: '#f00', thickness: 3, opacity: 0.8 } },
    paneIdPrefix: 'group',
  });

  expect(panes.length).toBe(1);
  expect(panes[0].entries.length).toBe(2);
  expect(panes[0].entries[0].color).toBe('#f00');
  expect(panes[0].entries[1].isAvg).toBe(true);
  expect(panes[0].entries[1].displayName).toBe('A (avg 2)');
});

test('cyclic signal with no manual seam offset produces a non-null seam entry', () => {
  // 50 values cycling through 0..360 with no gaps (rawSpan >= 300, min >= -1, max <= 361)
  const cyclicValues = Array.from({ length: 50 }, (_, i) => (i * 7.5) % 360);
  const cyclicData = {
    tagNames: ['Machine_Position'],
    signals: [{ values: cyclicValues, isDigital: false }],
  };

  const panes = buildChartPanes({
    ...baseInput,
    data: cyclicData,
    visible: [true],
    groups: [1],
    signalStyles: {},
    resolveSeam: resolveSignalSeam,
  });

  expect(panes.length).toBe(1);
  const entry = panes[0].entries[0];
  expect(entry.seam, 'seam must not be null for a cyclic signal').not.toBe(null);
  expect(entry.seam.span, 'span should be 360 for an angular signal').toBe(360);
  expect(entry.seam.offset, 'offset should be 0 when no manual seam is configured').toBe(0);
});

describe('buildChartPanes — avgWindow + hideOriginal branch coverage', () => {
  const mkData = () => ({
    timestamps: Array.from({ length: 20 }, (_, i) => i),
    signals: [
      { values: Array.from({ length: 20 }, (_, i) => i), isDigital: false, name: 'S0' },
      { values: Array.from({ length: 20 }, (_, i) => i * 2), isDigital: false, name: 'S1' },
    ],
    tagNames: ['S0', 'S1'],
    meta: {},
  });

  const baseArgs = {
    visible: [true, true],
    groups: [1, 1],
    signalStyles: {},
    metadata: {},
    getDisplayName: (i) => `S${i}`,
    getGroupLabel: () => 'Group A',
    getAutoSignalColor: () => '#39f',
    theme: 'dark',
    palette: [],
    paneIdPrefix: 'group',
  };

  it('includes both source and avg entries when hideOriginal is false', () => {
    const data = mkData();
    const panes = buildChartPanes({
      ...baseArgs,
      data,
      avgWindow: { 0: 5 },
      hideOriginal: { 0: false },
    });
    const entries = panes[0]?.entries || [];
    // Signal 0: hideOriginal is false, so source entry is included, plus avg entry
    const sourceEntries = entries.filter(e => !e.isAvg);
    const avgEntries = entries.filter(e => e.isAvg);
    expect(sourceEntries.length).toBe(2); // S0 (source) + S1 (source)
    expect(avgEntries.length).toBe(1);    // only S0 has avgWindow
  });

  it('excludes source entry for signal 0 when hideOriginal[0] is true', () => {
    const data = mkData();
    const panes = buildChartPanes({
      ...baseArgs,
      data,
      avgWindow: { 0: 5 },
      hideOriginal: { 0: true },
    });
    const entries = panes[0]?.entries || [];
    // S0 source is hidden, only its avg + S1 source remain
    const nonAvgEntries = entries.filter(e => !e.isAvg);
    const avgEntries = entries.filter(e => e.isAvg);
    expect(nonAvgEntries.length).toBe(1);  // only S1 source
    expect(avgEntries.length).toBe(1);     // S0 avg still present
    // Confirm the remaining source entry is S1 (originalIndex 1)
    expect(nonAvgEntries[0].originalIndex).toBe(1);
  });

  it('produces no avg entries when avgWindow is empty', () => {
    const data = mkData();
    const panes = buildChartPanes({
      ...baseArgs,
      data,
      avgWindow: {},
      hideOriginal: {},
    });
    const entries = panes[0]?.entries || [];
    const avgEntries = entries.filter(e => e.isAvg);
    expect(avgEntries.length).toBe(0);
    expect(entries.length).toBe(2); // both sources visible
  });

  it('pane id uses paneIdPrefix correctly', () => {
    const data = mkData();
    const panes = buildChartPanes({
      ...baseArgs,
      data,
      avgWindow: {},
      hideOriginal: {},
      paneIdPrefix: 'cmp-group',
    });
    expect(panes[0].id).toBe('cmp-group-1');
  });
});
