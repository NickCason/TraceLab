import test from 'node:test';
import assert from 'node:assert/strict';

import { CURRENT_PROJECT_VERSION, migrateProject } from '../src/utils/projectMigration.js';
import { parseProjectFileText } from '../src/utils/projectPersistence.js';

test('migration pipeline upgrades v3 -> current with explicit step outputs', () => {
  const legacy = {
    version: 3,
    data: { timestamps: [1], signals: [] },
    lockedRanges: { 1: true },
  };
  const migrated = migrateProject(legacy);
  assert.equal(migrated.ok, true);
  assert.equal(migrated.project.version, CURRENT_PROJECT_VERSION);
  assert.equal(migrated.project.showEdgeValues, false);
  assert.equal(migrated.project.splitRanges, undefined);
  assert.equal(migrated.project.importMode, null);
});

test('unknown future project version is rejected with explicit error', () => {
  const future = migrateProject({ version: CURRENT_PROJECT_VERSION + 1, data: { timestamps: [], signals: [] } });
  assert.equal(future.ok, false);
  assert.match(future.error, /newer than supported/);
});

test('fixture parse/migrate matches legacy loader output expectations', () => {
  const raw = JSON.stringify({ version: 4, data: { timestamps: [1, 2], signals: [] }, lockedRanges: { 2: false } });
  const parsed = parseProjectFileText(raw);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.project.version, CURRENT_PROJECT_VERSION);
  assert.equal(parsed.project.lockedRanges[2], false);
});
