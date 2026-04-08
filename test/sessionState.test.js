import test from 'node:test';
import assert from 'node:assert/strict';

import { applyLoadedDataset, createComparisonState, hydrateComparisonState, resetSessionState } from '../src/utils/sessionState.js';

test('resetSessionState returns consistent default state bundle', () => {
  const state = resetSessionState(3, 99);
  assert.deepEqual(state.visible, [true, true, true]);
  assert.deepEqual(state.groups, [1, 2, 3]);
  assert.deepEqual(state.viewRange, [0, 99]);
  assert.equal(state.cursorIdx, null);
});

test('applyLoadedDataset and createComparisonState hydrate identical defaults', () => {
  const dataset = { timestamps: [1, 2, 3], signals: [{}, {}] };
  assert.deepEqual(applyLoadedDataset(dataset), createComparisonState(dataset));
});

test('hydrateComparisonState handles partial and extra fields safely', () => {
  const dataset = { timestamps: [1, 2], signals: [{}, {}] };
  const hydrated = hydrateComparisonState({ visible: [false], groups: [8], extraField: true }, dataset);
  assert.deepEqual(hydrated.visible, [false, true]);
  assert.deepEqual(hydrated.groups, [8, 2]);
  assert.equal(hydrated.extraField, undefined);
  assert.deepEqual(hydrated.viewRange, [0, 2]);
});
