import { MAX_GROUPS } from '../constants/groups.js';

export function createDefaultGroups(signalCount) {
  return Array.from({ length: signalCount }, (_, i) => (i % MAX_GROUPS) + 1);
}

export function resetSessionState(signalCount, timestampCount) {
  return {
    visible: Array.from({ length: signalCount }, () => true),
    groups: createDefaultGroups(signalCount),
    groupNames: {},
    signalStyles: {},
    metadata: {},
    referenceOverlays: {},
    derivedConfigs: {},
    splitRanges: {},
    avgWindow: {},
    hideOriginal: {},
    viewRange: [0, timestampCount],
    rebaseOffset: 0,
    cursorIdx: null,
    cursor2Idx: null,
  };
}

export function applyLoadedDataset(dataset) {
  const signalCount = dataset?.signals?.length || 0;
  const timestampCount = dataset?.timestamps?.length || 0;
  return resetSessionState(signalCount, timestampCount);
}

export function hydrateComparisonState(rawState, comparisonData) {
  const signalCount = comparisonData?.signals?.length || 0;
  const timestampCount = comparisonData?.timestamps?.length || 0;
  const base = resetSessionState(signalCount, timestampCount);
  if (!rawState || typeof rawState !== 'object') return base;

  return {
    ...base,
    visible: Array.isArray(rawState.visible)
      ? Array.from({ length: signalCount }, (_, i) => rawState.visible[i] ?? true)
      : base.visible,
    groups: Array.isArray(rawState.groups)
      ? Array.from({ length: signalCount }, (_, i) => Number(rawState.groups[i]) || base.groups[i])
      : base.groups,
    groupNames: rawState.groupNames || base.groupNames,
    signalStyles: rawState.signalStyles || base.signalStyles,
    metadata: rawState.metadata || base.metadata,
    referenceOverlays: rawState.referenceOverlays || base.referenceOverlays,
    derivedConfigs: rawState.derivedConfigs || base.derivedConfigs,
    splitRanges: rawState.splitRanges || base.splitRanges,
    avgWindow: rawState.avgWindow || base.avgWindow,
    hideOriginal: rawState.hideOriginal || base.hideOriginal,
    viewRange: Array.isArray(rawState.viewRange) ? rawState.viewRange : base.viewRange,
    rebaseOffset: Number(rawState.rebaseOffset) || 0,
    cursorIdx: rawState.cursorIdx ?? null,
    cursor2Idx: rawState.cursor2Idx ?? null,
  };
}

export function createComparisonState(comparisonData) {
  return hydrateComparisonState(null, comparisonData);
}
