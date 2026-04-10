// test/drawCursors.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { drawCursors } from '../src/utils/canvas/drawCursors.js';

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
  assert.equal(typeof drawCursors, 'function');
});

test('drawCursors runs without throwing (no cursor)', () => {
  assert.doesNotThrow(() => drawCursors(mkCtx(), mkGeo(), {
    start: 0, end: 100, timestamps: Array.from({ length: 100 }, (_, i) => i * 10),
    signalEntries: [], yRanges: [],
    cursorIdx: null, cursor2Idx: null, deltaMode: false, deltaLocked: false,
    pillsEnabled: false, getPlotValue: () => null, t: mkTheme(),
  }));
});

test('drawCursors runs without throwing (cursor in view)', () => {
  const values = Array.from({ length: 100 }, (_, i) => i);
  const entry = { signal: { values, isDigital: false }, color: '#f00', unit: '', displayName: 'sig', isAvg: false };
  assert.doesNotThrow(() => drawCursors(mkCtx(), mkGeo(), {
    start: 0, end: 100, timestamps: Array.from({ length: 100 }, (_, i) => i * 10),
    signalEntries: [entry], yRanges: [[0, 99]],
    cursorIdx: 50, cursor2Idx: null, deltaMode: false, deltaLocked: false,
    pillsEnabled: true, getPlotValue: (e, idx) => e.signal.values[idx], t: mkTheme(),
  }));
});

test('drawCursors runs without throwing (delta mode, both cursors placed)', () => {
  const values = Array.from({ length: 100 }, (_, i) => i);
  const entry = { signal: { values, isDigital: false }, color: '#f00', unit: 'rpm', displayName: 'sig', isAvg: false };
  assert.doesNotThrow(() => drawCursors(mkCtx(), mkGeo(), {
    start: 0, end: 100, timestamps: Array.from({ length: 100 }, (_, i) => i * 10),
    signalEntries: [entry], yRanges: [[0, 99]],
    cursorIdx: 20, cursor2Idx: 70, deltaMode: true, deltaLocked: true,
    pillsEnabled: true, getPlotValue: (e, idx) => e.signal.values[idx], t: mkTheme(),
  }));
});
