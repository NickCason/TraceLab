// src/hooks/useChartPanes.js
import { useCallback, useMemo } from "react";
import { buildChartPanes } from "../utils/buildChartPanes";
import { getAutoSignalColor } from "../constants/colors";
import { GROUP_LABELS } from "../constants/groups";
import { resolveSignalSeam } from "../utils/signalRemapping";

export function useChartPanes(data, signalState, fileIO, theme, t) {
  const buildDatasetPanes = useCallback((dataset, state, paneIdPrefix, includeSeam = false) => {
    if (!dataset || !state) return [];
    return buildChartPanes({
      data: dataset,
      visible: state.visible,
      groups: state.groups,
      signalStyles: state.signalStyles,
      metadata: state.metadata,
      avgWindow: state.avgWindow,
      hideOriginal: state.hideOriginal,
      getDisplayName: (i) => state.metadata?.[i]?.displayName || dataset.tagNames?.[i] || `Signal ${i}`,
      getGroupLabel: (g) => state.groupNames?.[g] || `Group ${GROUP_LABELS[g - 1]}`,
      getAutoSignalColor,
      theme,
      palette: t.sigColors,
      resolveSeam: includeSeam ? resolveSignalSeam : undefined,
      paneIdPrefix,
    });
  }, [theme, t]);

  const chartPanes = useMemo(() => buildDatasetPanes(data, {
    visible: signalState.visible,
    groups: signalState.groups,
    signalStyles: signalState.signalStyles,
    metadata: signalState.metadata,
    avgWindow: signalState.avgWindow,
    hideOriginal: signalState.hideOriginal,
    groupNames: signalState.groupNames,
  }, "group", true), [
    data, signalState.visible, signalState.groups, signalState.signalStyles,
    signalState.metadata, signalState.avgWindow, signalState.hideOriginal,
    signalState.groupNames, buildDatasetPanes,
  ]);

  const comparisonChartPanes = useMemo(() => {
    if (!fileIO.comparisonData || !fileIO.comparisonState) return [];
    return buildDatasetPanes(fileIO.comparisonData, fileIO.comparisonState, "cmp-group", false);
  }, [fileIO.comparisonData, fileIO.comparisonState, buildDatasetPanes]);

  const globalEdgeLabelWidth = useMemo(() => {
    if (!signalState.showEdgeValues || !data) return 0;
    const [start, end] = signalState.viewRange;
    let maxW = 0;
    chartPanes.forEach(pane => {
      pane.entries.forEach(({ signal, unit }) => {
        for (let i = end - 1; i >= start; i--) {
          if (signal.values[i] !== null) {
            const str = signal.values[i].toFixed(2) + (unit ? " " + unit : "");
            maxW = Math.max(maxW, str.length * 6.5 + 14);
            break;
          }
        }
      });
    });
    return maxW;
  }, [signalState.showEdgeValues, data, signalState.viewRange, chartPanes]);

  const globalLeftEdgeLabelWidth = useMemo(() => {
    if (!signalState.showEdgeValues || !data) return 0;
    const [start, end] = signalState.viewRange;
    let maxW = 0;
    chartPanes.forEach(pane => {
      pane.entries.forEach(({ signal, unit, isAvg }) => {
        for (let i = start; i < end; i++) {
          if (signal.values[i] !== null) {
            const prefix = isAvg ? "x̄ " : "";
            const str = prefix + signal.values[i].toFixed(2) + (unit ? " " + unit : "");
            maxW = Math.max(maxW, str.length * 6.5 + 14);
            break;
          }
        }
      });
    });
    return maxW;
  }, [signalState.showEdgeValues, data, signalState.viewRange, chartPanes]);

  return { chartPanes, comparisonChartPanes, globalEdgeLabelWidth, globalLeftEdgeLabelWidth };
}
