// test/canvas/paneGeo.test.js
import { test, expect } from 'vitest';
import { getGeo } from '../../src/utils/canvas/paneGeo.js';

const mkCanvas = (w, h) => ({
  parentElement: { getBoundingClientRect: () => ({ width: w, height: h }) },
});

test('returns W and H from parentElement bounding rect', () => {
  const geo = getGeo(mkCanvas(800, 300), {
    compact: false, showTimeAxis: false, showEdgeValues: false,
    rightEdgeLabelWidth: 0, leftEdgeLabelWidth: 0,
  });
  expect(geo.W).toBe(800);
  expect(geo.H).toBe(300);
});

test('default padding: left=68, right=20, top=14, bottom=6', () => {
  const { pad } = getGeo(mkCanvas(800, 300), {
    compact: false, showTimeAxis: false, showEdgeValues: false,
    rightEdgeLabelWidth: 0, leftEdgeLabelWidth: 0,
  });
  expect(pad.left).toBe(68);
  expect(pad.right).toBe(20);
  expect(pad.top).toBe(14);
  expect(pad.bottom).toBe(6);
});

test('compact sets top padding to 6', () => {
  const { pad } = getGeo(mkCanvas(800, 300), {
    compact: true, showTimeAxis: false, showEdgeValues: false,
    rightEdgeLabelWidth: 0, leftEdgeLabelWidth: 0,
  });
  expect(pad.top).toBe(6);
});

test('showTimeAxis sets bottom padding to 28', () => {
  const { pad } = getGeo(mkCanvas(800, 300), {
    compact: false, showTimeAxis: true, showEdgeValues: false,
    rightEdgeLabelWidth: 0, leftEdgeLabelWidth: 0,
  });
  expect(pad.bottom).toBe(28);
});

test('showEdgeValues with small label widths uses minimums (right=24, left=68)', () => {
  const { pad } = getGeo(mkCanvas(800, 300), {
    compact: false, showTimeAxis: false, showEdgeValues: true,
    rightEdgeLabelWidth: 0, leftEdgeLabelWidth: 0,
  });
  expect(pad.right).toBe(24);
  expect(pad.left).toBe(68);
});

test('showEdgeValues with large label widths uses label-derived padding', () => {
  const { pad } = getGeo(mkCanvas(800, 300), {
    compact: false, showTimeAxis: false, showEdgeValues: true,
    rightEdgeLabelWidth: 80, leftEdgeLabelWidth: 100,
  });
  expect(pad.right).toBe(80 + 16);
  expect(pad.left).toBe(100 + 20);
});

test('plotW = W - pad.left - pad.right', () => {
  const geo = getGeo(mkCanvas(800, 300), {
    compact: false, showTimeAxis: false, showEdgeValues: false,
    rightEdgeLabelWidth: 0, leftEdgeLabelWidth: 0,
  });
  expect(geo.plotW).toBe(geo.W - geo.pad.left - geo.pad.right);
});

test('plotH = H - pad.top - pad.bottom', () => {
  const geo = getGeo(mkCanvas(800, 300), {
    compact: false, showTimeAxis: false, showEdgeValues: false,
    rightEdgeLabelWidth: 0, leftEdgeLabelWidth: 0,
  });
  expect(geo.plotH).toBe(geo.H - geo.pad.top - geo.pad.bottom);
});
