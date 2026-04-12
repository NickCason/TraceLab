import { test, expect } from 'vitest';

import { CURRENT_PROJECT_VERSION, migrateProject } from '../../src/utils/projectMigration.js';
import { parseProjectFileText } from '../../src/utils/projectPersistence.js';

test('migration pipeline upgrades v3 -> current with explicit step outputs', () => {
  const legacy = {
    version: 3,
    data: { timestamps: [1], signals: [] },
    lockedRanges: { 1: true },
  };
  const migrated = migrateProject(legacy);
  expect(migrated.ok).toBe(true);
  expect(migrated.project.version).toBe(CURRENT_PROJECT_VERSION);
  expect(migrated.project.showEdgeValues).toBe(false);
  expect(migrated.project.splitRanges).toBe(undefined);
  expect(migrated.project.importMode).toBe(null);
});

test('unknown future project version is rejected with explicit error', () => {
  const future = migrateProject({ version: CURRENT_PROJECT_VERSION + 1, data: { timestamps: [], signals: [] } });
  expect(future.ok).toBe(false);
  expect(future.error).toMatch(/newer than supported/);
});

test('fixture parse/migrate matches legacy loader output expectations', () => {
  const raw = JSON.stringify({ version: 4, data: { timestamps: [1, 2], signals: [] }, lockedRanges: { 2: false } });
  const parsed = parseProjectFileText(raw);
  expect(parsed.ok).toBe(true);
  expect(parsed.project.version).toBe(CURRENT_PROJECT_VERSION);
  expect(parsed.project.lockedRanges[2]).toBe(false);
});
