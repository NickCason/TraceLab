// test/canvas/drawSignals.test.js
import { test, expect } from 'vitest';
import { drawSignals } from '../../src/utils/canvas/drawSignals.js';

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

test('drawSignals is a function', () => {
  expect(typeof drawSignals).toBe('function');
});

test('drawSignals runs without throwing (empty signal list)', () => {
  const t = { chart: '#111', text3: '#999', grid: '#333' };
  expect(() => drawSignals(mkCtx(), mkGeo(), {
    start: 0, end: 10, signalEntries: [], yRanges: [],
    rangeStatsByEntry: [], getPlotValue: () => null,
    showExtrema: false, compact: false, groupColor: null, t,
  })).not.toThrow();
});

test('drawSignals runs without throwing (solid signal)', () => {
  const t = { chart: '#111', text3: '#999', grid: '#333' };
  const values = Array.from({ length: 10 }, (_, i) => i * 10);
  const entry = { signal: { values, isDigital: false }, color: '#f00', strokeMode: 'solid', thickness: 1.5, opacity: 0.9 };
  expect(() => drawSignals(mkCtx(), mkGeo(), {
    start: 0, end: 10, signalEntries: [entry], yRanges: [[0, 90]],
    rangeStatsByEntry: [{ min: 0, max: 90, firstIdx: 0, lastIdx: 9 }],
    getPlotValue: (e, idx) => e.signal.values[idx],
    showExtrema: false, compact: false, groupColor: null, t,
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

test('drawSignals calls beginPath for an analog signal with values', () => {
  const t = { chart: '#111', text3: '#999', grid: '#333' };
  const values = Array.from({ length: 10 }, (_, i) => i * 10);
  const entry = { signal: { values, isDigital: false }, color: '#f00', strokeMode: 'solid', thickness: 1.5, opacity: 0.9 };
  const ctx = mkSpyCtx();

  drawSignals(ctx, mkGeoSpy(), {
    start: 0, end: 10, signalEntries: [entry], yRanges: [[0, 90]],
    rangeStatsByEntry: [{ min: 0, max: 90, firstIdx: 0, lastIdx: 9 }],
    getPlotValue: (e, idx) => e.signal.values[idx],
    showExtrema: false, compact: false, groupColor: null, t,
  });

  expect(ctx._calls.some(c => c.method === 'beginPath')).toBe(true);
});

test('drawSignals produces no path calls when all values are null', () => {
  // drawSignals calls ctx.beginPath() once unconditionally per non-samples signal before iterating,
  // but never calls moveTo or lineTo when all values are null — so beginPath count equals 1 (setup
  // only, no actual path drawn) while moveTo and lineTo counts are both 0.
  const t = { chart: '#111', text3: '#999', grid: '#333' };
  const values = Array.from({ length: 10 }, () => null);
  const entry = { signal: { values, isDigital: false }, color: '#f00', strokeMode: 'solid', thickness: 1.5, opacity: 0.9 };
  const ctx = mkSpyCtx();

  drawSignals(ctx, mkGeoSpy(), {
    start: 0, end: 10, signalEntries: [entry], yRanges: [[0, 1]],
    rangeStatsByEntry: [{ min: 0, max: 0, firstIdx: -1, lastIdx: -1 }],
    getPlotValue: () => null,
    showExtrema: false, compact: false, groupColor: null, t,
  });

  const lineToCount = ctx._calls.filter(c => c.method === 'lineTo').length;
  const moveToCount = ctx._calls.filter(c => c.method === 'moveTo').length;
  const beginPathCount = ctx._calls.filter(c => c.method === 'beginPath').length;
  expect(lineToCount).toBe(0);
  expect(moveToCount).toBe(0);
  // beginPath is called once (path setup) but no drawing commands follow it
  expect(beginPathCount).toBe(1);
});
