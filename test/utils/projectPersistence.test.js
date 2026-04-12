import { test, expect } from 'vitest';
import { buildProjectPayload, hydrateProjectData } from '../../src/utils/projectPersistence.js';

test('buildProjectPayload serializes current comparison state when in comparison mode', () => {
  const payload = buildProjectPayload({
    data: { meta: {}, timestamps: [1], signals: [] },
    visible: [], groups: [], groupNames: {}, signalStyles: {}, metadata: {}, referenceOverlays: {}, viewRange: [0, 1],
    rebaseOffset: 0, deltaMode: false, showPills: true, showEdgeValues: false, splitRanges: {}, avgWindow: {}, hideOriginal: {}, derivedConfigs: {},
    importMode: 'comparison', comparisonData: { timestamps: [2], signals: [] }, comparisonState: { viewRange: [0, 1] },
  });

  expect(payload.importMode).toBe('comparison');
  expect(payload.comparisonData).toEqual({ timestamps: [2], signals: [] });
  expect(payload.comparisonState).toEqual({ viewRange: [0, 1] });
});

test('hydrateProjectData recomputes derived signals before returning loaded dataset', () => {
  const raw = { timestamps: [1], signals: [{ values: [0] }, { values: [0] }] };
  const cfg = { 1: { type: 'equation', expression: 's0 + 1' } };
  let called = false;
  const hydrated = hydrateProjectData(raw, cfg, (source, derivedCfg) => {
    called = true;
    expect(source.signals.length).toBe(2);
    expect(derivedCfg).toEqual(cfg);
    return { ...source, signals: [{ values: [0] }, { values: [1], isDerived: true }] };
  });

  expect(called).toBe(true);
  expect(hydrated.signals[1].values[0]).toBe(1);
});
