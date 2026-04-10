// test/drawSignals.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { drawSignals } from '../src/utils/canvas/drawSignals.js';

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
  assert.equal(typeof drawSignals, 'function');
});

test('drawSignals runs without throwing (empty signal list)', () => {
  const t = { chart: '#111', text3: '#999', grid: '#333' };
  assert.doesNotThrow(() => drawSignals(mkCtx(), mkGeo(), {
    start: 0, end: 10, signalEntries: [], yRanges: [],
    rangeStatsByEntry: [], getPlotValue: () => null,
    showExtrema: false, compact: false, groupColor: null, t,
  }));
});

test('drawSignals runs without throwing (solid signal)', () => {
  const t = { chart: '#111', text3: '#999', grid: '#333' };
  const values = Array.from({ length: 10 }, (_, i) => i * 10);
  const entry = { signal: { values, isDigital: false }, color: '#f00', strokeMode: 'solid', thickness: 1.5, opacity: 0.9 };
  assert.doesNotThrow(() => drawSignals(mkCtx(), mkGeo(), {
    start: 0, end: 10, signalEntries: [entry], yRanges: [[0, 90]],
    rangeStatsByEntry: [{ min: 0, max: 90, firstIdx: 0, lastIdx: 9 }],
    getPlotValue: (e, idx) => e.signal.values[idx],
    showExtrema: false, compact: false, groupColor: null, t,
  }));
});
