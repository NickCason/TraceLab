const CURRENT_PROJECT_VERSION = 6;

function migrateV3ToV4(project) {
  if (!project || project.version !== 3) return project;
  return {
    ...project,
    version: 4,
    showEdgeValues: project.showEdgeValues ?? false,
  };
}

function migrateV4ToV5(project) {
  if (!project || project.version !== 4) return project;
  return {
    ...project,
    version: 5,
  };
}

function migrateV5ToV6(project) {
  if (!project || project.version !== 5) return project;
  return {
    ...project,
    version: 6,
    importMode: project.importMode || null,
    comparisonData: project.comparisonData || null,
    comparisonState: project.comparisonState || null,
  };
}

const STEPS = [migrateV3ToV4, migrateV4ToV5, migrateV5ToV6];

export function migrateProject(rawProject) {
  const project = { ...rawProject };
  const incomingVersion = Number(project.version || 0);
  if (incomingVersion > CURRENT_PROJECT_VERSION) {
    return { ok: false, error: `Project version ${incomingVersion} is newer than supported version ${CURRENT_PROJECT_VERSION}` };
  }

  let next = { ...project, version: incomingVersion || 3 };
  for (const step of STEPS) {
    next = step(next);
  }
  return { ok: true, project: { ...next, version: CURRENT_PROJECT_VERSION } };
}

export { CURRENT_PROJECT_VERSION };
