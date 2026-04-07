import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeToSeam,
  denormalizeFromSeam,
  hasSeamAdjustment,
  inferSeamDomain,
  clampSeamPercent,
  snapSeamPercent,
  seamPercentToOffset,
  seamOffsetToPercent,
} from '../src/utils/seamAdjustment.js';

test('normalizeToSeam wraps values into the seam span', () => {
  const seam = { origin: 0, span: 360, offset: 0 };
  assert.equal(normalizeToSeam(370, seam), 10);
  assert.equal(normalizeToSeam(-10, seam), 350);
});

test('denormalizeFromSeam applies inverse offset wrapping behavior', () => {
  const seam = { origin: 0, span: 360, offset: 30 };
  assert.equal(denormalizeFromSeam(10, seam), 340);
});

test('normalize/denormalize return null for invalid values', () => {
  assert.equal(normalizeToSeam(null, {}), null);
  assert.equal(denormalizeFromSeam(Number.NaN, {}), null);
});

test('hasSeamAdjustment detects meaningful offsets', () => {
  assert.equal(hasSeamAdjustment({ offset: 0 }), false);
  assert.equal(hasSeamAdjustment({ offset: 0.0000000001 }), false);
  assert.equal(hasSeamAdjustment({ offset: 1 }), true);
});

test('inferSeamDomain keeps legacy 0..360 behavior and supports arbitrary ranges', () => {
  assert.deepEqual(inferSeamDomain([0, 90, 180, 359]), { origin: 0, span: 360 });
  assert.deepEqual(inferSeamDomain([-10, 20, 50]), { origin: -10, span: 60 });
  assert.deepEqual(inferSeamDomain([null, undefined]), { origin: 0, span: 360 });
});

test('percent/offset helpers clamp and convert reliably', () => {
  assert.equal(clampSeamPercent(120), 100);
  assert.equal(clampSeamPercent(-500), -100);
  assert.equal(clampSeamPercent('oops'), 0);

  assert.equal(snapSeamPercent(26, 5), 25);
  assert.equal(snapSeamPercent(-26, 5), -25);

  assert.equal(seamPercentToOffset(50, 360), 90);
  assert.equal(seamOffsetToPercent(90, 360), 50);
  assert.equal(seamOffsetToPercent(9999, 360), 100);
});
