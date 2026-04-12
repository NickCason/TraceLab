import { test, expect, describe, it } from 'vitest';
import { buildProjectPayload, hydrateProjectData, parseProjectFileText, classifyDroppedFile } from '../../src/utils/projectPersistence.js';

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

describe('parseProjectFileText — branch coverage', () => {
  it('returns ok: false for invalid JSON', () => {
    const result = parseProjectFileText('not json at all!!!');
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns ok: false for valid JSON that lacks the required data field', () => {
    const result = parseProjectFileText(JSON.stringify({ version: 5 }));
    expect(result.ok).toBe(false);
  });

  it('returns ok: false for null input', () => {
    const result = parseProjectFileText('null');
    expect(result.ok).toBe(false);
  });
});

describe('classifyDroppedFile — branch coverage', () => {
  it('returns "project" for .tracelab extension', () => {
    expect(classifyDroppedFile('myfile.tracelab')).toBe('project');
  });

  it('returns "csv" for .csv extension', () => {
    expect(classifyDroppedFile('data.csv')).toBe('csv');
  });

  it('returns "csv" for uppercase .CSV extension (case-insensitive check)', () => {
    expect(classifyDroppedFile('DATA.CSV')).toBe('csv');
  });

  it('returns "csv" when no extension is provided', () => {
    expect(classifyDroppedFile('justfilename')).toBe('csv');
  });

  it('returns "csv" for empty string', () => {
    expect(classifyDroppedFile('')).toBe('csv');
  });
});
