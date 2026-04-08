import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProjectPayload, hydrateProjectData } from '../src/utils/projectPersistence.js';

test('buildProjectPayload serializes current comparison state when in comparison mode', () => {
  const payload = buildProjectPayload({
    data: { meta: {}, timestamps: [1], signals: [] },
    visible: [], groups: [], groupNames: {}, signalStyles: {}, metadata: {}, referenceOverlays: {}, viewRange: [0, 1],
    rebaseOffset: 0, deltaMode: false, showPills: true, showEdgeValues: false, splitRanges: {}, avgWindow: {}, hideOriginal: {}, derivedConfigs: {},
    importMode: 'comparison', comparisonData: { timestamps: [2], signals: [] }, comparisonState: { viewRange: [0, 1] },
  });

  assert.equal(payload.importMode, 'comparison');
  assert.deepEqual(payload.comparisonData, { timestamps: [2], signals: [] });
  assert.deepEqual(payload.comparisonState, { viewRange: [0, 1] });
});

test('hydrateProjectData recomputes derived signals before returning loaded dataset', () => {
  const raw = { timestamps: [1], signals: [{ values: [0] }, { values: [0] }] };
  const cfg = { 1: { type: 'equation', expression: 's0 + 1' } };
  let called = false;
  const hydrated = hydrateProjectData(raw, cfg, (source, derivedCfg) => {
    called = true;
    assert.equal(source.signals.length, 2);
    assert.deepEqual(derivedCfg, cfg);
    return { ...source, signals: [{ values: [0] }, { values: [1], isDerived: true }] };
  });

  assert.equal(called, true);
  assert.equal(hydrated.signals[1].values[0], 1);
});
