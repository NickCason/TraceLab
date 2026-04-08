import { MAX_GROUPS } from '../constants/groups.js';

export function buildProjectPayload(state) {
  const {
    data,
    visible,
    groups,
    groupNames,
    signalStyles,
    metadata,
    referenceOverlays,
    viewRange,
    rebaseOffset,
    deltaMode,
    showPills,
    showEdgeValues,
    splitRanges,
    avgWindow,
    hideOriginal,
    derivedConfigs,
    importMode,
    comparisonData,
    comparisonState,
  } = state;

  return {
    version: 6,
    data,
    visible,
    groups,
    groupNames,
    signalStyles,
    metadata,
    referenceOverlays,
    viewRange,
    rebaseOffset,
    deltaMode,
    showPills,
    showEdgeValues,
    splitRanges,
    avgWindow,
    hideOriginal,
    derivedConfigs,
    importMode,
    comparisonData: importMode === 'comparison' ? comparisonData : undefined,
    comparisonState: importMode === 'comparison' ? comparisonState : undefined,
  };
}

export function hydrateProjectData(rawData, derivedConfigs, recomputeDerivedSignals) {
  const hydratedData = {
    ...rawData,
    signals: (rawData?.signals || []).map((sig) => {
      const uniq = new Set((sig.values || []).filter((v) => v !== null));
      const isDigital = uniq.size <= 2 && [...uniq].every((v) => v === 0 || v === 1 || Math.abs(v) < 0.01 || Math.abs(v - 1) < 0.01);
      return { ...sig, isDigital };
    }),
  };
  const hasDerived = derivedConfigs && Object.keys(derivedConfigs).length > 0;
  return hasDerived ? recomputeDerivedSignals(hydratedData, derivedConfigs) : hydratedData;
}

function sanitizeGroups(groups, signalCount, maxGroups = MAX_GROUPS) {
  if (!Array.isArray(groups) || groups.length === 0) {
    return Array.from({ length: signalCount }, (_, i) => (i % maxGroups) + 1);
  }
  return Array.from({ length: signalCount }, (_, i) => {
    const raw = Number(groups[i]);
    if (!Number.isFinite(raw)) return (i % maxGroups) + 1;
    return Math.min(maxGroups, Math.max(1, Math.round(raw)));
  });
}

function migrateLockedRangesToSplitRanges(lockedRanges) {
  if (!lockedRanges) return {};
  const splitRanges = {};
  for (let g = 1; g <= MAX_GROUPS; g++) {
    if (!lockedRanges[g]) splitRanges[g] = true;
  }
  return splitRanges;
}

export function normalizeLoadedProject(proj, finalData) {
  const signalCount = finalData?.signals?.length || 0;
  const loadedVisible = Array.isArray(proj?.visible) && proj.visible.length
    ? Array.from({ length: signalCount }, (_, i) => proj.visible[i] ?? true)
    : finalData.signals.map(() => true);

  const groups = proj?.groups
    ? sanitizeGroups(proj.groups, signalCount)
    : (proj?.isolated
      ? sanitizeGroups(proj.isolated.map((iso, i) => (iso ? (i % MAX_GROUPS) + 1 : 1)), signalCount)
      : sanitizeGroups([], signalCount));

  const avgWindow = proj?.avgWindow
    ? proj.avgWindow
    : (proj?.showAvg
      ? Object.keys(proj.showAvg).reduce((acc, key) => {
        if (proj.showAvg[key]) acc[key] = 20;
        return acc;
      }, {})
      : {});

  const splitRanges = proj?.splitRanges || migrateLockedRangesToSplitRanges(proj?.lockedRanges);

  const comparisonModeValid = proj?.importMode === 'comparison' && proj?.comparisonData;

  return {
    visible: loadedVisible,
    groups,
    metadata: proj?.metadata || {},
    groupNames: proj?.groupNames || {},
    signalStyles: proj?.signalStyles || {},
    referenceOverlays: proj?.referenceOverlays || {},
    viewRange: proj?.viewRange || [0, finalData?.timestamps?.length || 0],
    rebaseOffset: proj?.rebaseOffset || 0,
    deltaMode: proj?.deltaMode || false,
    showPills: proj?.showPills,
    showEdgeValues: proj?.showEdgeValues,
    splitRanges,
    avgWindow,
    hideOriginal: proj?.hideOriginal || {},
    importMode: proj?.importMode === 'comparison' ? (comparisonModeValid ? 'comparison' : null) : (proj?.importMode || null),
    comparisonData: comparisonModeValid ? proj.comparisonData : null,
    comparisonState: comparisonModeValid ? proj.comparisonState : null,
  };
}

export function parseProjectFileText(rawText) {
  try {
    const proj = JSON.parse(rawText);
    if (proj?.version && proj?.data) return { ok: true, project: proj };
    return { ok: false, error: 'Invalid project file' };
  } catch {
    return { ok: false, error: 'Failed to parse project file' };
  }
}

export function classifyDroppedFile(filename = '') {
  return String(filename).toLowerCase().endsWith('.tracelab') ? 'project' : 'csv';
}
