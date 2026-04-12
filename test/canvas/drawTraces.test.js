// test/canvas/drawTraces.test.js
import { test, expect } from 'vitest';
import { drawTraces } from '../../src/utils/canvas/drawTraces.js';

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

const mkTheme = () => ({
  chart: '#111', grid: '#333', text3: '#999', warn: '#f90',
  border: 'rgba(255,255,255,0.12)',
});

test('drawTraces is a function', () => {
  expect(typeof drawTraces).toBe('function');
});

test('drawTraces runs without throwing (minimal params)', () => {
  expect(() => drawTraces(mkCtx(), mkGeo(), {
    start: 0, end: 100,
    timestamps: Array.from({ length: 100 }, (_, i) => i * 10),
    rebaseOffset: 0, showTimeAxis: false, compact: false,
    referenceOverlays: [], yRanges: [], unifyRange: false,
    signalEntries: [], rangeStatsByEntry: [],
    getPlotValue: () => null, showExtrema: false,
    groupColor: null, showEdgeValues: false,
    t: mkTheme(),
  })).not.toThrow();
});

test('drawTraces calls drawEdgePills branch when showEdgeValues is true', () => {
  const values = Array.from({ length: 100 }, (_, i) => i);
  const entry = { signal: { values, isDigital: false }, color: '#f00', unit: 'rpm', isAvg: false };
  expect(() => drawTraces(mkCtx(), mkGeo(), {
    start: 0, end: 100,
    timestamps: Array.from({ length: 100 }, (_, i) => i * 10),
    rebaseOffset: 0, showTimeAxis: true, compact: false,
    referenceOverlays: [], yRanges: [[0, 99]], unifyRange: false,
    signalEntries: [entry], rangeStatsByEntry: [{ firstIdx: 0, lastIdx: 99, min: 0, max: 99 }],
    getPlotValue: (e, idx) => e.signal.values[idx], showExtrema: false,
    groupColor: '#0f0', showEdgeValues: true,
    t: mkTheme(),
  })).not.toThrow();
});
