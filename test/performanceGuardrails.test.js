import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

import { buildChartPanes } from '../src/utils/buildChartPanes.js';

function makeDataset(signalCount, sampleCount) {
  const timestamps = Array.from({ length: sampleCount }, (_, i) => i);
  const signals = Array.from({ length: signalCount }, (_, si) => ({
    values: Array.from({ length: sampleCount }, (_, i) => Math.sin((i + si) / 17) * 100 + si),
    isDigital: false,
  }));
  return {
    timestamps,
    signals,
    tagNames: Array.from({ length: signalCount }, (_, i) => `S${i}`),
  };
}

function timedBuild(args, runs = 1) {
  const started = performance.now();
  let last;
  for (let i = 0; i < runs; i++) last = buildChartPanes(args);
  return { ms: performance.now() - started, panes: last };
}

function buildArgs(data, paneIdPrefix = 'group') {
  return {
    data,
    visible: Array.from({ length: data.signals.length }, () => true),
    groups: Array.from({ length: data.signals.length }, (_, i) => (i % 4) + 1),
    signalStyles: {},
    metadata: {},
    avgWindow: Object.fromEntries(Array.from({ length: data.signals.length }, (_, i) => [i, i % 3 === 0 ? 8 : 0])),
    hideOriginal: {},
    getDisplayName: (i) => data.tagNames[i],
    getGroupLabel: (g) => `Group ${g}`,
    getAutoSignalColor: () => '#39f',
    theme: 'dark',
    palette: ['#39f', '#f39', '#3f9', '#fc3'],
    paneIdPrefix,
  };
}

test('benchmark fixtures: small/medium/large pane build baselines', () => {
  const fixtures = [
    { name: 'small', data: makeDataset(8, 500), budgetMs: 60 },
    { name: 'medium', data: makeDataset(24, 5000), budgetMs: 400 },
    { name: 'large', data: makeDataset(60, 20000), budgetMs: 2200 },
  ];

  fixtures.forEach(({ name, data, budgetMs }) => {
    const { ms, panes } = timedBuild(buildArgs(data));
    assert.ok(panes.length > 0, `${name} should emit panes`);
    assert.ok(ms < budgetMs, `${name} baseline exceeded budget (${ms.toFixed(2)}ms >= ${budgetMs}ms)`);
  });
});

test('regression guardrail: many visible signals over large window', () => {
  const large = makeDataset(120, 12000);
  const result = timedBuild(buildArgs(large));
  assert.ok(result.panes.length >= 4);
  assert.ok(result.ms < 2500, `many-signal build too slow: ${result.ms.toFixed(2)}ms`);
});

test('comparison-mode path reuses shared pane builder performance characteristics', () => {
  const primary = makeDataset(40, 10000);
  const comparison = makeDataset(40, 10000);

  const p = timedBuild(buildArgs(primary, 'group'));
  const c = timedBuild(buildArgs(comparison, 'cmp-group'));

  assert.ok(p.panes.length > 0 && c.panes.length > 0);
  const slower = Math.max(p.ms, c.ms);
  const faster = Math.max(1, Math.min(p.ms, c.ms));
  assert.ok(slower / faster < 1.75, `comparison path regressed: primary=${p.ms.toFixed(1)}ms comparison=${c.ms.toFixed(1)}ms`);
});

test('moving-average memoization improves repeated pane builds', () => {
  const data = makeDataset(50, 15000);
  const args = buildArgs(data);
  const cold = timedBuild(args, 1).ms;
  const warm = timedBuild(args, 3).ms / 3;

  assert.ok(warm <= cold * 1.15, `expected warm cache <= cold; cold=${cold.toFixed(2)}ms warm=${warm.toFixed(2)}ms`);
});
