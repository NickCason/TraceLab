// test/drawOverlays.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { drawOverlays } from '../src/utils/canvas/drawOverlays.js';

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

test('drawOverlays is a function', () => {
  assert.equal(typeof drawOverlays, 'function');
});

test('returns empty queues when referenceOverlays is empty', () => {
  const t = { warn: '#f90', chart: '#111' };
  const result = drawOverlays(mkCtx(), mkGeo(), {
    start: 0, end: 100, referenceOverlays: [], yRanges: [[0, 1]], unifyRange: false, t,
  });
  assert.deepEqual(result, { overlayLabelQueue: [], overlayHandleQueue: [] });
});

test('returns empty queues when referenceOverlays is null/undefined', () => {
  const t = { warn: '#f90', chart: '#111' };
  const result = drawOverlays(mkCtx(), mkGeo(), {
    start: 0, end: 100, referenceOverlays: null, yRanges: [[0, 1]], unifyRange: false, t,
  });
  assert.deepEqual(result, { overlayLabelQueue: [], overlayHandleQueue: [] });
});

test('queues label when x-line overlay has a label', () => {
  const t = { warn: '#f90', chart: '#111' };
  const ov = { axis: 'x', type: 'line', sample: 50, label: 'ref', color: '#f90' };
  const { overlayLabelQueue } = drawOverlays(mkCtx(), mkGeo(), {
    start: 0, end: 100, referenceOverlays: [ov], yRanges: [[0, 1]], unifyRange: false, t,
  });
  assert.equal(overlayLabelQueue.length, 1);
  assert.equal(overlayLabelQueue[0].text, 'ref');
});

test('runs without throwing for y-band overlay', () => {
  const t = { warn: '#f90', chart: '#111' };
  const ov = { axis: 'y', type: 'band', min: 0.2, max: 0.8, label: 'band', color: '#f90', opacity: 0.3 };
  assert.doesNotThrow(() => drawOverlays(mkCtx(), mkGeo(), {
    start: 0, end: 100, referenceOverlays: [ov], yRanges: [[0, 1]], unifyRange: false, t,
  }));
});
