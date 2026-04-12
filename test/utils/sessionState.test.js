import { test, expect } from 'vitest';

import { applyLoadedDataset, createComparisonState, hydrateComparisonState, resetSessionState } from '../../src/utils/sessionState.js';

test('resetSessionState returns consistent default state bundle', () => {
  const state = resetSessionState(3, 99);
  expect(state.visible).toEqual([true, true, true]);
  expect(state.groups).toEqual([1, 2, 3]);
  expect(state.viewRange).toEqual([0, 99]);
  expect(state.cursorIdx).toBe(null);
});

test('applyLoadedDataset and createComparisonState hydrate identical defaults', () => {
  const dataset = { timestamps: [1, 2, 3], signals: [{}, {}] };
  expect(applyLoadedDataset(dataset)).toEqual(createComparisonState(dataset));
});

test('hydrateComparisonState handles partial and extra fields safely', () => {
  const dataset = { timestamps: [1, 2], signals: [{}, {}] };
  const hydrated = hydrateComparisonState({ visible: [false], groups: [8], extraField: true }, dataset);
  expect(hydrated.visible).toEqual([false, true]);
  expect(hydrated.groups).toEqual([8, 2]);
  expect(hydrated.extraField).toBe(undefined);
  expect(hydrated.viewRange).toEqual([0, 2]);
});
