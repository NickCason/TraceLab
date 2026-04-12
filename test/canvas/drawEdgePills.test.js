// test/canvas/drawEdgePills.test.js
import { test, expect } from 'vitest';
import { drawEdgePills } from '../../src/utils/canvas/drawEdgePills.js';

const mkCtx = () => new Proxy({}, {
  get: (t, k) => {
    if (k === 'measureText') return () => ({ width: 50 });
    if (k in t) return t[k];
    return () => {};
  },
  set: (t, k, v) => { t[k] = v; return true; },
});

const mkGeo = () => ({
  W: 800, H: 300,
  pad: { top: 14, bottom: 28, left: 68, right: 20 },
  plotW: 712, plotH: 258,
});

test('drawEdgePills is a function', () => {
  expect(typeof drawEdgePills).toBe('function');
});

test('drawEdgePills runs without throwing (no signals)', () => {
  const t = { chart: '#111' };
  expect(() => drawEdgePills(mkCtx(), mkGeo(), {
    signalEntries: [], yRanges: [], rangeStatsByEntry: [],
    getPlotValue: () => null, t,
  })).not.toThrow();
});

test('drawEdgePills runs without throwing (one signal with valid edge values)', () => {
  const t = { chart: '#111' };
  const values = Array.from({ length: 10 }, (_, i) => i * 10);
  const entry = { signal: { values }, color: '#f00', unit: 'rpm', isAvg: false };
  expect(() => drawEdgePills(mkCtx(), mkGeo(), {
    signalEntries: [entry],
    yRanges: [[0, 90]],
    rangeStatsByEntry: [{ firstIdx: 0, lastIdx: 9 }],
    getPlotValue: (e, idx) => e.signal.values[idx],
    t,
  })).not.toThrow();
});
