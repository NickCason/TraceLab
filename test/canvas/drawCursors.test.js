// test/canvas/drawCursors.test.js
import { test, expect } from 'vitest';
import { drawCursors } from '../../src/utils/canvas/drawCursors.js';

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
  chart: '#111', cursor1: '#fff', cursor2: '#f90', cursor2Bg: 'rgba(240,184,102,0.1)',
  dotStroke: '#111',
});

test('drawCursors is a function', () => {
  expect(typeof drawCursors).toBe('function');
});

test('drawCursors runs without throwing (no cursor)', () => {
  expect(() => drawCursors(mkCtx(), mkGeo(), {
    start: 0, end: 100, timestamps: Array.from({ length: 100 }, (_, i) => i * 10),
    signalEntries: [], yRanges: [],
    cursorIdx: null, cursor2Idx: null, deltaMode: false, deltaLocked: false,
    pillsEnabled: false, getPlotValue: () => null, t: mkTheme(),
  })).not.toThrow();
});

test('drawCursors runs without throwing (cursor in view)', () => {
  const values = Array.from({ length: 100 }, (_, i) => i);
  const entry = { signal: { values, isDigital: false }, color: '#f00', unit: '', displayName: 'sig', isAvg: false };
  expect(() => drawCursors(mkCtx(), mkGeo(), {
    start: 0, end: 100, timestamps: Array.from({ length: 100 }, (_, i) => i * 10),
    signalEntries: [entry], yRanges: [[0, 99]],
    cursorIdx: 50, cursor2Idx: null, deltaMode: false, deltaLocked: false,
    pillsEnabled: true, getPlotValue: (e, idx) => e.signal.values[idx], t: mkTheme(),
  })).not.toThrow();
});

test('drawCursors runs without throwing (delta mode, both cursors placed)', () => {
  const values = Array.from({ length: 100 }, (_, i) => i);
  const entry = { signal: { values, isDigital: false }, color: '#f00', unit: 'rpm', displayName: 'sig', isAvg: false };
  expect(() => drawCursors(mkCtx(), mkGeo(), {
    start: 0, end: 100, timestamps: Array.from({ length: 100 }, (_, i) => i * 10),
    signalEntries: [entry], yRanges: [[0, 99]],
    cursorIdx: 20, cursor2Idx: 70, deltaMode: true, deltaLocked: true,
    pillsEnabled: true, getPlotValue: (e, idx) => e.signal.values[idx], t: mkTheme(),
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

const mkThemeSpy = () => ({
  chart: '#111', cursor1: '#fff', cursor2: '#f90', cursor2Bg: 'rgba(240,184,102,0.1)',
  dotStroke: '#111',
});

test('drawCursors draws nothing when cursorIdx is null', () => {
  const ctx = mkSpyCtx();
  drawCursors(ctx, mkGeoSpy(), {
    start: 0, end: 100, timestamps: Array.from({ length: 100 }, (_, i) => i * 10),
    signalEntries: [], yRanges: [],
    cursorIdx: null, cursor2Idx: null, deltaMode: false, deltaLocked: false,
    pillsEnabled: false, getPlotValue: () => null, t: mkThemeSpy(),
  });
  expect(ctx._calls.filter(c => c.method === 'beginPath').length).toBe(0);
});

test('drawCursors draws at least one path when cursorIdx is set', () => {
  const ctx = mkSpyCtx();
  const values = Array.from({ length: 100 }, (_, i) => i);
  const entry = { signal: { values, isDigital: false }, color: '#f00', unit: '', displayName: 'sig', isAvg: false };

  drawCursors(ctx, mkGeoSpy(), {
    start: 0, end: 100, timestamps: Array.from({ length: 100 }, (_, i) => i * 10),
    signalEntries: [entry], yRanges: [[0, 99]],
    cursorIdx: 50, cursor2Idx: null, deltaMode: false, deltaLocked: false,
    pillsEnabled: false, getPlotValue: (e, idx) => e.signal.values[idx], t: mkThemeSpy(),
  });

  expect(ctx._calls.some(c => c.method === 'beginPath')).toBe(true);
});
