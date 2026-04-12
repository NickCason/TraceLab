import { test, expect } from 'vitest';

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
  expect(entry.seam).not.toBe(null);
  expect(entry.seam.span).toBe(360);
  expect(entry.seam.offset).toBe(0);
});
