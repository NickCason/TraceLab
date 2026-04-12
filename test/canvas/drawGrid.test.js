// test/canvas/drawGrid.test.js
import { test, expect } from 'vitest';
import { drawGrid } from '../../src/utils/canvas/drawGrid.js';

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

test('drawGrid is a function', () => {
  expect(typeof drawGrid).toBe('function');
});

test('drawGrid runs without throwing (no time axis)', () => {
  const t = { grid: '#333', text3: '#999' };
  expect(() => drawGrid(mkCtx(), mkGeo(), {
    start: 0, end: 1000, timestamps: [], rebaseOffset: 0,
    showTimeAxis: false, compact: false, t,
  })).not.toThrow();
});

test('drawGrid runs without throwing (with time axis)', () => {
  const t = { grid: '#333', text3: '#999' };
  const timestamps = Array.from({ length: 1000 }, (_, i) => i * 10);
  expect(() => drawGrid(mkCtx(), mkGeo(), {
    start: 0, end: 1000, timestamps, rebaseOffset: 0,
    showTimeAxis: true, compact: true, t,
  })).not.toThrow();
});
