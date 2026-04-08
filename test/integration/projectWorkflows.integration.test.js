import test from 'node:test';
import assert from 'node:assert/strict';
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
  assert.equal(parsed.ok, true);

  const recomputeCalls = [];
  const hydrated = hydrateProjectData(parsed.project.data, parsed.project.derivedConfigs, (data, cfg) => {
    recomputeCalls.push({ data, cfg });
    return {
      ...data,
      signals: [...data.signals, { name: 'SpeedDelta', values: [1, 2], isDerived: true }],
    };
  });

  assert.equal(recomputeCalls.length, 1);
  assert.equal(hydrated.signals.length, 3);

  const normalized = normalizeLoadedProject(parsed.project, hydrated);
  assert.deepEqual(normalized.groups, [1, 2, 3]);
  assert.deepEqual(normalized.referenceOverlays, { 1: [{ name: 'target', value: 100 }] });
  assert.equal(normalized.importMode, 'comparison');
  assert.deepEqual(normalized.comparisonState, {
    visible: [true],
    groups: [1],
    viewRange: [0, 2],
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

  assert.equal(payload.importMode, 'comparison');
  assert.equal(payload.comparisonData.meta.trendName, 'Compare');
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

  assert.equal(payload.comparisonData, undefined);
  assert.equal(payload.comparisonState, undefined);
});

test('drag/drop classification routes .tracelab files regardless of case', () => {
  assert.equal(classifyDroppedFile('session.tracelab'), 'project');
  assert.equal(classifyDroppedFile('SESSION.TRACELAB'), 'project');
  assert.equal(classifyDroppedFile('signals.csv'), 'csv');
});

test('legacy/malformed project fields are sanitized and migrated to safe defaults', () => {
  const parsed = parseProjectFileText(fixture('project', 'legacy-v4-invalid-groups.json'));
  assert.equal(parsed.ok, true);

  const hydrated = hydrateProjectData(parsed.project.data, {}, (d) => d);
  const normalized = normalizeLoadedProject(parsed.project, hydrated);

  assert.deepEqual(normalized.groups, [1, 8, 1]);
  assert.deepEqual(normalized.splitRanges, { 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true });
  assert.deepEqual(normalized.avgWindow, { 0: 20, 2: 20 });
  assert.equal(normalized.importMode, null);
  assert.deepEqual(normalized.comparisonData, null);
  assert.deepEqual(normalized.metadata, {});
  assert.deepEqual(normalized.groupNames, {});
});

test('partially corrupted project payload fails gracefully with explicit error', () => {
  const parsed = parseProjectFileText('{"version":6, bad json');
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error, 'Failed to parse project file');
});
