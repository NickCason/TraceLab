// src/hooks/useFileIO.js
import { useState, useCallback, useEffect } from "react";
import { parseStudio5000CSV } from "../utils/parser";
import { buildProjectPayload, classifyDroppedFile, hydrateProjectData, normalizeLoadedProject, parseProjectFileText } from "../utils/projectPersistence";
import { applyLoadedDataset, createComparisonState } from "../utils/sessionState";
import { downloadBlob } from "../utils/download";
import { fmtTsClean } from "../utils/date";
import { MAX_GROUPS } from "../constants/groups";

export function useFileIO(data, setData, signalState, derivedPens, setReferenceOverlays, showToast) {
  const [importMode, setImportMode] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonState, setComparisonState] = useState(null);
  const [rebaseOffset, setRebaseOffset] = useState(0);
  const [rebaseInput, setRebaseInput] = useState("");
  const [activeSidebarDataset, setActiveSidebarDataset] = useState("primary");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const updateComparisonState = useCallback((key, updater) => {
    setComparisonState(prev => ({
      ...prev,
      [key]: typeof updater === "function" ? updater(prev[key]) : updater,
    }));
  }, []);

  // Default CSV auto-load on mount
  useEffect(() => {
    const defaultCsvUrl = import.meta.env.VITE_DEFAULT_CSV_URL;
    if (!defaultCsvUrl) return;
    fetch(defaultCsvUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to fetch ${defaultCsvUrl}`);
        return response.text();
      })
      .then((csvText) => {
        const parsed = parseStudio5000CSV(csvText);
        if (!parsed) throw new Error("Unsupported CSV format");
        const reset = applyLoadedDataset(parsed);
        setData(parsed);
        signalState.setVisible(reset.visible);
        signalState.setGroups(reset.groups);
        signalState.setViewRange(reset.viewRange);
        signalState.setCursorIdx(reset.cursorIdx);
        signalState.setCursor2Idx(reset.cursor2Idx);
        signalState.setMetadata(reset.metadata);
        signalState.setSignalStyles(reset.signalStyles);
        setReferenceOverlays(reset.referenceOverlays);
        derivedPens.setDerivedConfigs(reset.derivedConfigs);
        setRebaseOffset(reset.rebaseOffset);
        setRebaseInput("");
        showToast(`Loaded default CSV: ${parsed.tagNames.length} tags`, "success");
      })
      .catch((error) => {
        console.warn("Default CSV load skipped:", error);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseStudio5000CSV(e.target.result);
      if (parsed) {
        parsed.meta.sourceFile = file.name;
        const reset = applyLoadedDataset(parsed);
        setData(parsed);
        signalState.setVisible(reset.visible);
        signalState.setGroups(reset.groups);
        signalState.setViewRange(reset.viewRange);
        signalState.setCursorIdx(reset.cursorIdx);
        signalState.setCursor2Idx(reset.cursor2Idx);
        signalState.setMetadata(reset.metadata);
        signalState.setSignalStyles(reset.signalStyles);
        setReferenceOverlays(reset.referenceOverlays);
        derivedPens.setDerivedConfigs(reset.derivedConfigs);
        setRebaseOffset(reset.rebaseOffset);
        setRebaseInput("");
        setImportMode(null);
        setComparisonData(null);
        setComparisonState(null);
        setActiveSidebarDataset("primary");
        showToast(`Loaded ${parsed.tagNames.length} tags, ${parsed.timestamps.length.toLocaleString()} samples`, "success");
      } else showToast("Failed to parse CSV — unsupported format", "error");
    };
    reader.readAsText(file);
  }, [showToast, signalState, derivedPens, setData, setReferenceOverlays]);

  const handleUnifiedImport = useCallback((mergedData, newSignalStartIdx) => {
    setData(mergedData);
    signalState.setVisible(prev => {
      const extended = [...prev];
      for (let i = extended.length; i < mergedData.signals.length; i++) extended.push(true);
      return extended;
    });
    signalState.setGroups(prev => {
      const extended = [...prev];
      for (let i = extended.length; i < mergedData.signals.length; i++) extended.push((i % MAX_GROUPS) + 1);
      return extended;
    });
    signalState.setViewRange([0, mergedData.timestamps.length]);
    setImportMode("unified");
    setImportDialogOpen(false);
    if (mergedData.sampleRateWarning) {
      showToast(`Imported ${mergedData.signals.length - newSignalStartIdx} signals — sample rates differ, time spacing may be non-uniform`, "warn");
    } else {
      showToast(`Imported ${mergedData.signals.length - newSignalStartIdx} new signals (${mergedData.signals.length} total)`, "success");
    }
  }, [showToast, signalState, setData]);

  const handleComparisonImport = useCallback((newData) => {
    setComparisonData(newData);
    setComparisonState(createComparisonState(newData));
    setImportMode("comparison");
    setImportDialogOpen(false);
    setActiveSidebarDataset("primary");
    showToast(`Comparison mode: ${newData.tagNames.length} tags loaded`, "success");
  }, [showToast]);

  const loadProject = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseProjectFileText(e.target.result);
      if (!parsed.ok) { showToast(parsed.error, "error"); return; }
      const proj = parsed.project;
      const loadedDerived = proj.derivedConfigs || {};
      const finalData = hydrateProjectData(proj.data, loadedDerived, derivedPens.recomputeDerivedSignals);
      finalData.meta = { ...finalData.meta, projectFile: file.name };
      const normalized = normalizeLoadedProject(proj, finalData);
      setData(finalData);
      signalState.setVisible(normalized.visible);
      signalState.setGroups(normalized.groups);
      signalState.setMetadata(normalized.metadata);
      signalState.setGroupNames(normalized.groupNames);
      signalState.setSignalStyles(normalized.signalStyles);
      setReferenceOverlays(normalized.referenceOverlays);
      signalState.setViewRange(normalized.viewRange);
      derivedPens.setDerivedConfigs(loadedDerived);
      setRebaseOffset(normalized.rebaseOffset);
      signalState.setDeltaMode(normalized.deltaMode);
      if (normalized.showPills !== undefined) signalState.setShowPills(normalized.showPills);
      if (normalized.showEdgeValues !== undefined) signalState.setShowEdgeValues(normalized.showEdgeValues);
      signalState.setSplitRanges(normalized.splitRanges);
      signalState.setAvgWindow(normalized.avgWindow);
      signalState.setHideOriginal(normalized.hideOriginal);
      signalState.setCursorIdx(null);
      signalState.setCursor2Idx(null);
      setImportMode(normalized.importMode);
      setComparisonData(normalized.comparisonData);
      setComparisonState(normalized.comparisonState);
      if (normalized.importMode === "comparison") setActiveSidebarDataset("primary");
      showToast("Project loaded", "success");
    };
    reader.readAsText(file);
  }, [showToast, signalState, derivedPens, setData, setReferenceOverlays]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) { classifyDroppedFile(f.name) === "project" ? loadProject(f) : handleFile(f); }
  }, [handleFile, loadProject]);

  const applyRebase = useCallback(() => {
    if (!data || !rebaseInput.trim()) return;
    try {
      const target = new Date(rebaseInput.trim());
      if (isNaN(target.getTime())) { showToast("Invalid date format", "error"); return; }
      setRebaseOffset(target.getTime() - data.timestamps[0]);
      showToast(`Rebased: start → ${fmtTsClean(target.getTime())}`, "success");
    } catch { showToast("Invalid date format", "error"); }
  }, [data, rebaseInput, showToast]);

  const clearRebase = useCallback(() => {
    setRebaseOffset(0);
    setRebaseInput("");
    showToast("Rebase cleared — original timestamps restored", "info");
  }, [showToast]);

  return {
    importMode, setImportMode,
    comparisonData, setComparisonData,
    comparisonState, setComparisonState,
    rebaseOffset, setRebaseOffset,
    rebaseInput, setRebaseInput,
    activeSidebarDataset, setActiveSidebarDataset,
    importDialogOpen, setImportDialogOpen,
    updateComparisonState,
    handleFile, handleUnifiedImport, handleComparisonImport,
    loadProject, handleDrop,
    applyRebase, clearRebase,
  };
}
