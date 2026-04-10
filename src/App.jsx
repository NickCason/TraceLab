import { useState, useRef, useCallback, useEffect } from "react";
import { useSignalState } from "./hooks/useSignalState";
import { useDerivedPens } from "./hooks/useDerivedPens";
import { useOverlays } from "./hooks/useOverlays";
import { useFileIO } from "./hooks/useFileIO";
import { useChartPanes } from "./hooks/useChartPanes";
import EmptyState from "./components/EmptyState";
import AppHeader from "./components/AppHeader";
import Sidebar from "./components/sidebar/Sidebar";
import ChartArea from "./components/ChartArea";
import DerivedPenDialog from "./components/DerivedPenDialog";
import Toast from "./components/Toast";
import ImportDialog from "./components/ImportDialog";
import TutorialOverlay from "./components/tutorial/TutorialOverlay";
import { THEMES, FONT_DISPLAY, FONT_MONO } from "./constants/theme";
import { GROUP_COLORS_DARK, GROUP_COLORS_LIGHT } from "./constants/groups";
import { getAutoSignalColor } from "./constants/colors";
import { fmtDateISO } from "./utils/date";
import { downloadBlob } from "./utils/download";
import { buildProjectPayload } from "./utils/projectPersistence";
import { ensureFonts } from "./utils/fonts";

export default function App() {
  const [data, setData] = useState(null);
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );
  const [activePanel, setActivePanel] = useState("signals");
  const [editingMeta, setEditingMeta] = useState(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const fileInputRef = useRef(null);
  const projectInputRef = useRef(null);

  const t = THEMES[theme];
  const gc = theme === "dark" ? GROUP_COLORS_DARK : GROUP_COLORS_LIGHT;
  const showToast = useCallback((msg, type = "info") => setToast({ msg, type }), []);

  useEffect(() => { ensureFonts(); }, []);

  const signalState = useSignalState(data);
  const derivedPens = useDerivedPens(data, setData, signalState, gc, showToast);
  const overlays = useOverlays(
    data,
    signalState.groups,
    signalState.visible,
    signalState.viewRange,
    signalState.splitRanges
  );
  const fileIO = useFileIO(data, setData, signalState, derivedPens, overlays.setReferenceOverlays, showToast);
  const { chartPanes, comparisonChartPanes, globalEdgeLabelWidth, globalLeftEdgeLabelWidth } =
    useChartPanes(data, signalState, fileIO, theme, t);

  const saveProject = useCallback(() => {
    if (!data) return;
    const project = buildProjectPayload({
      data,
      visible: signalState.visible,
      groups: signalState.groups,
      groupNames: signalState.groupNames,
      signalStyles: signalState.signalStyles,
      metadata: signalState.metadata,
      referenceOverlays: overlays.referenceOverlays,
      viewRange: signalState.viewRange,
      rebaseOffset: fileIO.rebaseOffset,
      deltaMode: signalState.deltaMode,
      showPills: signalState.showPills,
      showEdgeValues: signalState.showEdgeValues,
      splitRanges: signalState.splitRanges,
      avgWindow: signalState.avgWindow,
      hideOriginal: signalState.hideOriginal,
      derivedConfigs: derivedPens.derivedConfigs,
      importMode: fileIO.importMode,
      comparisonData: fileIO.comparisonData,
      comparisonState: fileIO.comparisonState,
    });
    const blob = new Blob([JSON.stringify(project)], { type: "application/json" });
    const filename = `${(data.meta.trendName || "project").replace(/\s+/g, "_")}.tracelab`;
    downloadBlob(blob, filename, () => showToast("Project saved", "success"));
  }, [data, signalState, overlays.referenceOverlays, fileIO, derivedPens.derivedConfigs, showToast]);

  const exportSnapshot = useCallback(() => {
    const traceCanvases = document.querySelectorAll('canvas[data-export="trace"]');
    if (!traceCanvases.length) { showToast("No chart to export", "error"); return; }
    const dpr = window.devicePixelRatio || 1;
    const LEGEND_H = 20 * dpr;
    const maxW = Math.max(...[...traceCanvases].map(c => c.width));
    const totalH = [...traceCanvases].reduce((s, c) => s + c.height, 0) + traceCanvases.length * LEGEND_H;
    const comp = document.createElement("canvas"); comp.width = maxW; comp.height = totalH;
    const ctx = comp.getContext("2d"); let y = 0;
    const gcExport = theme === "dark" ? GROUP_COLORS_DARK : GROUP_COLORS_LIGHT;
    [...traceCanvases].forEach((tc, pi) => {
      const pane = chartPanes[pi];
      const paneColor = pane ? gcExport[pane.groupIdx - 1] || gcExport[0] : t.text2;
      ctx.fillStyle = t.chart; ctx.fillRect(0, y, maxW, LEGEND_H);
      ctx.fillStyle = paneColor; ctx.globalAlpha = 0.3;
      ctx.fillRect(0, y, maxW, LEGEND_H); ctx.globalAlpha = 1;
      ctx.strokeStyle = paneColor; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y + LEGEND_H - 0.5); ctx.lineTo(maxW, y + LEGEND_H - 0.5); ctx.stroke(); ctx.globalAlpha = 1;
      let lx = 10 * dpr;
      const ly = y + LEGEND_H / 2;
      if (pane) {
        ctx.font = `bold ${11 * dpr}px ${FONT_DISPLAY}`;
        ctx.fillStyle = paneColor; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(pane.label.toUpperCase(), lx, ly);
        lx += ctx.measureText(pane.label.toUpperCase()).width + 12 * dpr;
        ctx.fillStyle = t.text4; ctx.globalAlpha = 0.4;
        ctx.fillRect(lx, y + 4 * dpr, 1 * dpr, LEGEND_H - 8 * dpr);
        ctx.globalAlpha = 1; lx += 8 * dpr;
        pane.entries.forEach((entry) => {
          ctx.fillStyle = entry.color;
          ctx.beginPath(); ctx.arc(lx + 3 * dpr, ly, 3 * dpr, 0, Math.PI * 2); ctx.fill();
          lx += 10 * dpr;
          ctx.font = `600 ${11 * dpr}px ${FONT_MONO}`;
          ctx.fillStyle = entry.color;
          const nameWithUnit = entry.displayName + (entry.unit ? ` [${entry.unit}]` : "");
          ctx.fillText(nameWithUnit, lx, ly);
          lx += ctx.measureText(nameWithUnit).width + 14 * dpr;
        });
      }
      ctx.textBaseline = "alphabetic";
      y += LEGEND_H;
      ctx.drawImage(tc, 0, y);
      const cursorCanvas = tc.parentElement?.querySelector('canvas[data-export="cursor"]');
      if (cursorCanvas) ctx.drawImage(cursorCanvas, 0, y);
      y += tc.height;
    });
    try {
      const dataUrl = comp.toDataURL("image/png");
      const byteString = atob(dataUrl.split(",")[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: "image/png" });
      const filename = `${(data?.meta?.trendName || "snapshot").replace(/\s+/g, "_")}_${fmtDateISO(Date.now())}.png`;
      downloadBlob(blob, filename, () => showToast("Chart snapshot saved as PNG", "success"));
    } catch (e) { showToast("Snapshot failed: " + e.message, "error"); }
  }, [data, showToast, chartPanes, theme, t]);

  const handleStyleChange = useCallback((idx, updates) => {
    signalState.setSignalStyles(prev => {
      const cur = prev[idx] || {};
      const next = { ...cur };
      if (updates.color !== undefined) next.color = updates.color;
      if (updates.dash !== undefined) next.dash = updates.dash;
      if (updates.strokeMode !== undefined) { next.strokeMode = updates.strokeMode; next.dash = updates.strokeMode; }
      if (updates.thickness !== undefined) next.thickness = updates.thickness;
      if (updates.opacity !== undefined) next.opacity = updates.opacity;
      if (updates.seamOffset !== undefined) next.seamOffset = updates.seamOffset;
      if (updates.seamOffsetPct !== undefined) next.seamOffsetPct = updates.seamOffsetPct;
      if (!next.color && !next.dash && !next.strokeMode && !next.seamOffset && !next.seamOffsetPct && !next.thickness && !next.opacity) {
        const n = { ...prev }; delete n[idx]; return n;
      }
      return { ...prev, [idx]: next };
    });
  }, [signalState]);

  if (!data) {
    return (
      <EmptyState
        t={t} theme={theme} setTheme={setTheme}
        fileInputRef={fileInputRef}
        loadProject={fileIO.loadProject}
        handleFile={fileIO.handleFile}
        handleDrop={fileIO.handleDrop}
        toast={toast} setToast={setToast}
      />
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: t.bg, fontFamily: FONT_MONO, color: t.text1, overflow: "hidden" }}>
      <AppHeader
        t={t} theme={theme} setTheme={setTheme}
        data={data}
        rebaseOffset={fileIO.rebaseOffset}
        importMode={fileIO.importMode}
        comparisonData={fileIO.comparisonData}
        deltaMode={signalState.deltaMode}
        showPills={signalState.showPills}
        showEdgeValues={signalState.showEdgeValues}
        showExtrema={signalState.showExtrema}
        isCombined={signalState.isCombined}
        fileInputRef={fileInputRef}
        projectInputRef={projectInputRef}
        setDeltaMode={signalState.setDeltaMode}
        setShowPills={signalState.setShowPills}
        setShowEdgeValues={signalState.setShowEdgeValues}
        setShowExtrema={signalState.setShowExtrema}
        setCursorIdx={signalState.setCursorIdx}
        setCursor2Idx={signalState.setCursor2Idx}
        setDeltaLocked={signalState.setDeltaLocked}
        combineAll={signalState.combineAll}
        soloAll={signalState.soloAll}
        resetZoom={signalState.resetZoom}
        exportSnapshot={exportSnapshot}
        saveProject={saveProject}
        loadProject={fileIO.loadProject}
        handleFile={fileIO.handleFile}
        setTutorialOpen={setTutorialOpen}
        setImportDialogOpen={fileIO.setImportDialogOpen}
        setImportMode={fileIO.setImportMode}
        setComparisonData={fileIO.setComparisonData}
        setComparisonState={fileIO.setComparisonState}
        setActiveSidebarDataset={fileIO.setActiveSidebarDataset}
      />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          t={t} theme={theme} gc={gc}
          activePanel={activePanel} setActivePanel={setActivePanel}
          activeSidebarDataset={fileIO.activeSidebarDataset}
          setActiveSidebarDataset={fileIO.setActiveSidebarDataset}
          importMode={fileIO.importMode}
          data={data}
          groups={signalState.groups}
          visible={signalState.visible}
          cursorValues={signalState.cursorValues}
          cursor2Values={signalState.cursor2Values}
          deltaMode={signalState.deltaMode}
          metadata={signalState.metadata}
          signalStyles={signalState.signalStyles}
          referenceOverlays={overlays.referenceOverlays}
          derivedConfigs={derivedPens.derivedConfigs}
          comparisonData={fileIO.comparisonData}
          comparisonState={fileIO.comparisonState}
          updateComparisonState={fileIO.updateComparisonState}
          getDisplayName={signalState.getDisplayName}
          getGroupLabel={signalState.getGroupLabel}
          toggleSignal={signalState.toggleSignal}
          toggleGroup={signalState.toggleGroup}
          setGroup={signalState.setGroup}
          deleteDerivedPen={derivedPens.deleteDerivedPen}
          setGroupNames={signalState.setGroupNames}
          addOverlay={overlays.addOverlay}
          updateOverlay={overlays.updateOverlay}
          deleteOverlay={overlays.deleteOverlay}
          onStyleChange={handleStyleChange}
          handleRenameDisplay={signalState.handleRenameDisplay}
          setDerivedDialog={derivedPens.setDerivedDialog}
          viewRange={signalState.viewRange}
          setMetadata={signalState.setMetadata}
          editingMeta={editingMeta}
          setEditingMeta={setEditingMeta}
          rebaseOffset={fileIO.rebaseOffset}
          rebaseInput={fileIO.rebaseInput}
          setRebaseInput={fileIO.setRebaseInput}
          applyRebase={fileIO.applyRebase}
          clearRebase={fileIO.clearRebase}
          showToast={showToast}
        />
        <ChartArea
          t={t} theme={theme} gc={gc} data={data}
          chartPanes={chartPanes}
          comparisonChartPanes={comparisonChartPanes}
          comparisonData={fileIO.comparisonData}
          comparisonState={fileIO.comparisonState}
          importMode={fileIO.importMode}
          viewRange={signalState.viewRange}
          setViewRange={signalState.setViewRange}
          cursorIdx={signalState.cursorIdx}
          setCursorIdx={signalState.setCursorIdx}
          cursor2Idx={signalState.cursor2Idx}
          setCursor2Idx={signalState.setCursor2Idx}
          deltaMode={signalState.deltaMode}
          deltaLocked={signalState.deltaLocked}
          setDeltaLocked={signalState.setDeltaLocked}
          rebaseOffset={fileIO.rebaseOffset}
          showPills={signalState.showPills}
          showEdgeValues={signalState.showEdgeValues}
          showExtrema={signalState.showExtrema}
          referenceOverlays={overlays.referenceOverlays}
          splitRanges={signalState.splitRanges}
          setSplitRanges={signalState.setSplitRanges}
          globalEdgeLabelWidth={globalEdgeLabelWidth}
          globalLeftEdgeLabelWidth={globalLeftEdgeLabelWidth}
          updateOverlay={overlays.updateOverlay}
          updateComparisonState={fileIO.updateComparisonState}
          overlayPickerGroup={overlays.overlayPickerGroup}
          setOverlayPickerGroup={overlays.setOverlayPickerGroup}
          addOverlay={overlays.addOverlay}
          setDerivedDialog={derivedPens.setDerivedDialog}
        />
      </div>
      <DerivedPenDialog
        open={derivedPens.derivedDialog.open}
        mode={derivedPens.derivedDialog.mode}
        theme={theme}
        signals={data.signals}
        groups={signalState.groups}
        defaultGroupIdx={derivedPens.derivedDialog.groupIdx}
        defaultType={derivedPens.derivedDialog.type}
        initialDraft={derivedPens.derivedDialog.initialDraft}
        getDisplayName={signalState.getDisplayName}
        getGroupLabel={signalState.getGroupLabel}
        onCancel={() => derivedPens.setDerivedDialog(prev => ({ ...prev, open: false, editIdx: null, initialDraft: null }))}
        onCreate={(draft) => {
          if (derivedPens.derivedDialog.mode === "edit" && derivedPens.derivedDialog.editIdx !== null)
            derivedPens.updateDerivedPen(derivedPens.derivedDialog.editIdx, draft);
          else derivedPens.createDerivedPen(draft);
          derivedPens.setDerivedDialog(prev => ({ ...prev, open: false, editIdx: null, initialDraft: null }));
        }}
      />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {data && (
        <ImportDialog
          open={fileIO.importDialogOpen}
          onClose={() => fileIO.setImportDialogOpen(false)}
          existingData={data}
          theme={theme}
          t={t}
          onImportUnified={fileIO.handleUnifiedImport}
          onImportComparison={fileIO.handleComparisonImport}
        />
      )}
      <TutorialOverlay
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        t={t}
        theme={theme}
      />
    </div>
  );
}
