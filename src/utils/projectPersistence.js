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
