import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  buildProjectPayload,
  classifyDroppedFile,
  hydrateProjectData,
  normalizeLoadedProject,
  parseProjectFileText,
} from '../../src/utils/projectPersistence.js';

const fixture = (...parts) => fs.readFileSync(path.join(process.cwd(), 'test/fixtures', ...parts), 'utf8');

test('project roundtrip restores derived configs, overlays/groups, and comparison state', () => {
  const projectText = fixture('project', 'comparison-roundtrip.json');
  const parsed = parseProjectFileText(projectText);
  expect(parsed.ok).toBe(true);

  const recomputeCalls = [];
  const hydrated = hydrateProjectData(parsed.project.data, parsed.project.derivedConfigs, (data, cfg) => {
    recomputeCalls.push({ data, cfg });
    return {
      ...data,
      signals: [...data.signals, { name: 'SpeedDelta', values: [1, 2], isDerived: true }],
    };
  });

  expect(recomputeCalls.length).toBe(1);
  expect(hydrated.signals.length).toBe(3);

  const normalized = normalizeLoadedProject(parsed.project, hydrated);
  expect(normalized.groups).toEqual([1, 2, 3]);
  expect(normalized.referenceOverlays).toEqual({ 1: [{ name: 'target', value: 100 }] });
  expect(normalized.importMode).toBe('comparison');
  expect(normalized.comparisonState).toEqual({
    visible: [true],
    groups: [1],
    groupNames: {},
    signalStyles: {},
    metadata: {},
    referenceOverlays: {},
    derivedConfigs: {},
    splitRanges: {},
    avgWindow: {},
    hideOriginal: {},
    viewRange: [0, 2],
    rebaseOffset: 0,
    cursorIdx: null,
    cursor2Idx: null,
  });

  const payload = buildProjectPayload({
    data: hydrated,
    visible: normalized.visible,
    groups: normalized.groups,
    groupNames: normalized.groupNames,
    signalStyles: normalized.signalStyles,
    metadata: normalized.metadata,
    referenceOverlays: normalized.referenceOverlays,
    viewRange: normalized.viewRange,
    rebaseOffset: normalized.rebaseOffset,
    deltaMode: normalized.deltaMode,
    showPills: true,
    showEdgeValues: false,
    splitRanges: normalized.splitRanges,
    avgWindow: normalized.avgWindow,
    hideOriginal: normalized.hideOriginal,
    derivedConfigs: parsed.project.derivedConfigs,
    importMode: normalized.importMode,
    comparisonData: normalized.comparisonData,
    comparisonState: normalized.comparisonState,
  });

  expect(payload.importMode).toBe('comparison');
  expect(payload.comparisonData.meta.trendName).toBe('Compare');
});

test('project payload omits comparison datasets when mode is not comparison', () => {
  const payload = buildProjectPayload({
    data: { meta: {}, timestamps: [1], signals: [] },
    visible: [], groups: [], groupNames: {}, signalStyles: {}, metadata: {},
    referenceOverlays: {}, viewRange: [0, 1], rebaseOffset: 0, deltaMode: false,
    showPills: true, showEdgeValues: false, splitRanges: {}, avgWindow: {}, hideOriginal: {},
    derivedConfigs: {}, importMode: 'unified',
    comparisonData: { timestamps: [2], signals: [] }, comparisonState: { viewRange: [0, 1] },
  });

  expect(payload.comparisonData).toBe(undefined);
  expect(payload.comparisonState).toBe(undefined);
});

test('drag/drop classification routes .tracelab files regardless of case', () => {
  expect(classifyDroppedFile('session.tracelab')).toBe('project');
  expect(classifyDroppedFile('SESSION.TRACELAB')).toBe('project');
  expect(classifyDroppedFile('signals.csv')).toBe('csv');
});

test('legacy/malformed project fields are sanitized and migrated to safe defaults', () => {
  const parsed = parseProjectFileText(fixture('project', 'legacy-v4-invalid-groups.json'));
  expect(parsed.ok).toBe(true);

  const hydrated = hydrateProjectData(parsed.project.data, {}, (d) => d);
  const normalized = normalizeLoadedProject(parsed.project, hydrated);

  expect(normalized.groups).toEqual([1, 8, 1]);
  expect(normalized.splitRanges).toEqual({ 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true });
  expect(normalized.avgWindow).toEqual({ 0: 20, 2: 20 });
  expect(normalized.importMode).toBe(null);
  expect(normalized.comparisonData).toEqual(null);
  expect(normalized.metadata).toEqual({});
  expect(normalized.groupNames).toEqual({});
});

test('partially corrupted project payload fails gracefully with explicit error', () => {
  const parsed = parseProjectFileText('{"version":6, bad json');
  expect(parsed.ok).toBe(false);
  expect(parsed.error).toBe('Failed to parse project file');
});
