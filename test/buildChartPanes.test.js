import test from 'node:test';
import assert from 'node:assert/strict';

import { buildChartPanes } from '../src/utils/buildChartPanes.js';
import { resolveSignalSeam } from '../src/utils/signalRemapping.js';

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

  assert.equal(primary.length, 1);
  assert.equal(comparison.length, 1);
  assert.equal(primary[0].entries.length, comparison[0].entries.length);
  assert.deepEqual(primary[0].entries.map(e => e.displayName), comparison[0].entries.map(e => e.displayName));
});

test('pane builder applies styles, moving averages, and visibility filters', () => {
  const panes = buildChartPanes({
    ...baseInput,
    visible: [true, false],
    avgWindow: { 0: 2 },
    signalStyles: { 0: { color: '#f00', thickness: 3, opacity: 0.8 } },
    paneIdPrefix: 'group',
  });

  assert.equal(panes.length, 1);
  assert.equal(panes[0].entries.length, 2);
  assert.equal(panes[0].entries[0].color, '#f00');
  assert.equal(panes[0].entries[1].isAvg, true);
  assert.equal(panes[0].entries[1].displayName, 'A (avg 2)');
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

  assert.equal(panes.length, 1);
  const entry = panes[0].entries[0];
  assert.notEqual(entry.seam, null, 'seam must not be null for a cyclic signal');
  assert.equal(entry.seam.span, 360, 'span should be 360 for an angular signal');
  assert.equal(entry.seam.offset, 0, 'offset should be 0 when no manual seam is configured');
});
