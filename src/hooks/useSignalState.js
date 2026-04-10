// src/hooks/useSignalState.js
import { useState, useCallback, useMemo } from "react";
import { GROUP_LABELS, MAX_GROUPS } from "../constants/groups";

export function useSignalState(data) {
  const [visible, setVisible] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupNames, setGroupNames] = useState({});
  const [signalStyles, setSignalStyles] = useState({});
  const [metadata, setMetadata] = useState({});
  const [avgWindow, setAvgWindow] = useState({});
  const [hideOriginal, setHideOriginal] = useState({});
  const [splitRanges, setSplitRanges] = useState({});
  const [cursorIdx, setCursorIdx] = useState(null);
  const [cursor2Idx, setCursor2Idx] = useState(null);
  const [deltaMode, setDeltaMode] = useState(false);
  const [deltaLocked, setDeltaLocked] = useState(false);
  const [showPills, setShowPills] = useState(true);
  const [showEdgeValues, setShowEdgeValues] = useState(false);
  const [showExtrema, setShowExtrema] = useState(false);
  const [viewRange, setViewRange] = useState([0, 0]);

  const toggleSignal = useCallback((i) =>
    setVisible(v => { const n = [...v]; n[i] = !n[i]; return n; }), []);

  const setGroup = useCallback((i, g) =>
    setGroups(p => { const n = [...p]; n[i] = g; return n; }), []);

  const combineAll = useCallback(() => setGroups(p => p.map(() => 1)), []);

  const soloAll = useCallback(() =>
    setGroups(p => p.map((_, i) => (i % MAX_GROUPS) + 1)), []);

  const isCombined = useMemo(() =>
    groups.length > 0 && groups.every(g => g === groups[0]), [groups]);

  const resetZoom = useCallback(() => {
    if (data) setViewRange([0, data.timestamps.length]);
  }, [data]);

  const getDisplayName = useCallback((i) =>
    metadata[i]?.displayName || data?.tagNames[i] || `Signal ${i}`, [metadata, data]);

  const handleRenameDisplay = useCallback((idx, newName) => {
    setMetadata(prev => {
      const entry = { ...(prev[idx] || {}) };
      if (newName) entry.displayName = newName;
      else delete entry.displayName;
      return { ...prev, [idx]: entry };
    });
  }, []);

  const getGroupLabel = useCallback((g) =>
    groupNames[g] || `Group ${GROUP_LABELS[g - 1]}`, [groupNames]);

  const toggleGroup = useCallback((groupIdx) => {
    if (!data) return;
    const members = [];
    data.signals.forEach((_, i) => { if (groups[i] === groupIdx) members.push(i); });
    if (!members.length) return;
    const allVisible = members.every(i => visible[i]);
    setVisible(v => { const n = [...v]; members.forEach(i => { n[i] = !allVisible; }); return n; });
  }, [data, groups, visible]);

  const cursorValues = useMemo(() => {
    if (!data || cursorIdx === null) return null;
    return data.signals.map(s => {
      const raw = s.values[cursorIdx];
      if (raw !== null && raw !== undefined) return { value: raw, isInterpolated: false };
      const limit = Math.min(200, data.timestamps.length);
      let upV = null, downV = null;
      for (let j = cursorIdx - 1; j >= Math.max(0, cursorIdx - limit); j--) {
        const v = s.values[j]; if (v !== null && v !== undefined) { upV = v; break; }
      }
      for (let j = cursorIdx + 1; j < Math.min(data.timestamps.length, cursorIdx + limit); j++) {
        const v = s.values[j]; if (v !== null && v !== undefined) { downV = v; break; }
      }
      if (upV !== null && downV !== null) return { value: (upV + downV) / 2, isInterpolated: true };
      if (upV !== null) return { value: upV, isInterpolated: true };
      if (downV !== null) return { value: downV, isInterpolated: true };
      return null;
    });
  }, [data, cursorIdx]);

  const cursor2Values = useMemo(() => {
    if (!data || cursor2Idx === null) return null;
    return data.signals.map(s => s.values[cursor2Idx]);
  }, [data, cursor2Idx]);

  return {
    visible, setVisible,
    groups, setGroups,
    groupNames, setGroupNames,
    signalStyles, setSignalStyles,
    metadata, setMetadata,
    avgWindow, setAvgWindow,
    hideOriginal, setHideOriginal,
    splitRanges, setSplitRanges,
    cursorIdx, setCursorIdx,
    cursor2Idx, setCursor2Idx,
    deltaMode, setDeltaMode,
    deltaLocked, setDeltaLocked,
    showPills, setShowPills,
    showEdgeValues, setShowEdgeValues,
    showExtrema, setShowExtrema,
    viewRange, setViewRange,
    toggleSignal, setGroup,
    combineAll, soloAll, isCombined,
    resetZoom, getDisplayName, handleRenameDisplay, getGroupLabel,
    toggleGroup, cursorValues, cursor2Values,
  };
}
