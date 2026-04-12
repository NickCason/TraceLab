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

// ── Behavioral spy tests ──────────────────────────────────────────────────────

const mkSpyCtx = () => {
  const calls = [];
  return new Proxy({}, {
    get: (t, k) => {
      if (k === '_calls') return calls;
      if (k === 'measureText') return () => ({ width: 50 });
      if (k in t) return t[k];
      return (...args) => calls.push({ method: k, args });
    },
    set: (t, k, v) => { calls.push({ prop: k, value: v }); t[k] = v; return true; },
  });
};

const mkGeoSpy = () => ({
  W: 800, H: 300,
  pad: { top: 14, bottom: 28, left: 68, right: 20 },
  plotW: 712, plotH: 258,
});

test('drawGrid invokes beginPath at least once when drawing grid lines', () => {
  const ctx = mkSpyCtx();
  const t = { grid: '#333', text3: '#999' };
  drawGrid(ctx, mkGeoSpy(), {
    start: 0, end: 1000, timestamps: [], rebaseOffset: 0,
    showTimeAxis: false, compact: false, t,
  });
  expect(ctx._calls.some(c => c.method === 'beginPath')).toBe(true);
});

test('drawGrid in compact mode produces fewer beginPath calls than non-compact', () => {
  // compact sets nY=3 instead of nY=5, so fewer horizontal grid lines are drawn (4 vs 6)
  const tSetting = { grid: '#333', text3: '#999' };
  const ts = Array.from({ length: 1000 }, (_, i) => i * 10);

  const ctxFull = mkSpyCtx();
  drawGrid(ctxFull, mkGeoSpy(), {
    start: 0, end: 1000, timestamps: ts, rebaseOffset: 0,
    showTimeAxis: false, compact: false, t: tSetting,
  });

  const ctxCompact = mkSpyCtx();
  drawGrid(ctxCompact, mkGeoSpy(), {
    start: 0, end: 1000, timestamps: ts, rebaseOffset: 0,
    showTimeAxis: false, compact: true, t: tSetting,
  });

  const fullBeginPath = ctxFull._calls.filter(c => c.method === 'beginPath').length;
  const compactBeginPath = ctxCompact._calls.filter(c => c.method === 'beginPath').length;
  expect(compactBeginPath).toBeLessThan(fullBeginPath);
});
