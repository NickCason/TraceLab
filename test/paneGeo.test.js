// test/paneGeo.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getGeo } from '../src/utils/canvas/paneGeo.js';

const mkCanvas = (w, h) => ({
  parentElement: { getBoundingClientRect: () => ({ width: w, height: h }) },
});

test('returns W and H from parentElement bounding rect', () => {
  const geo = getGeo(mkCanvas(800, 300), {
    compact: false, showTimeAxis: false, showEdgeValues: false,
    rightEdgeLabelWidth: 0, leftEdgeLabelWidth: 0,
  });
  assert.equal(geo.W, 800);
  assert.equal(geo.H, 300);
});

test('default padding: left=68, right=20, top=14, bottom=6', () => {
  const { pad } = getGeo(mkCanvas(800, 300), {
    compact: false, showTimeAxis: false, showEdgeValues: false,
    rightEdgeLabelWidth: 0, leftEdgeLabelWidth: 0,
  });
  assert.equal(pad.left, 68);
  assert.equal(pad.right, 20);
  assert.equal(pad.top, 14);
  assert.equal(pad.bottom, 6);
});

test('compact sets top padding to 6', () => {
  const { pad } = getGeo(mkCanvas(800, 300), {
    compact: true, showTimeAxis: false, showEdgeValues: false,
    rightEdgeLabelWidth: 0, leftEdgeLabelWidth: 0,
  });
  assert.equal(pad.top, 6);
});

test('showTimeAxis sets bottom padding to 28', () => {
  const { pad } = getGeo(mkCanvas(800, 300), {
    compact: false, showTimeAxis: true, showEdgeValues: false,
    rightEdgeLabelWidth: 0, leftEdgeLabelWidth: 0,
  });
  assert.equal(pad.bottom, 28);
});

test('showEdgeValues with small label widths uses minimums (right=24, left=68)', () => {
  const { pad } = getGeo(mkCanvas(800, 300), {
    compact: false, showTimeAxis: false, showEdgeValues: true,
    rightEdgeLabelWidth: 0, leftEdgeLabelWidth: 0,
  });
  assert.equal(pad.right, 24);
  assert.equal(pad.left, 68);
});

test('showEdgeValues with large label widths uses label-derived padding', () => {
  const { pad } = getGeo(mkCanvas(800, 300), {
    compact: false, showTimeAxis: false, showEdgeValues: true,
    rightEdgeLabelWidth: 80, leftEdgeLabelWidth: 100,
  });
  assert.equal(pad.right, 80 + 16);  // rightEdgeLabelWidth + 16
  assert.equal(pad.left, 100 + 20);  // leftEdgeLabelWidth + 20
});

test('plotW = W - pad.left - pad.right', () => {
  const geo = getGeo(mkCanvas(800, 300), {
    compact: false, showTimeAxis: false, showEdgeValues: false,
    rightEdgeLabelWidth: 0, leftEdgeLabelWidth: 0,
  });
  assert.equal(geo.plotW, geo.W - geo.pad.left - geo.pad.right);
});

test('plotH = H - pad.top - pad.bottom', () => {
  const geo = getGeo(mkCanvas(800, 300), {
    compact: false, showTimeAxis: false, showEdgeValues: false,
    rightEdgeLabelWidth: 0, leftEdgeLabelWidth: 0,
  });
  assert.equal(geo.plotH, geo.H - geo.pad.top - geo.pad.bottom);
});
