// src/components/sidebar/Sidebar.jsx
import ExportPanel from "../ExportPanel";
import SignalsTab from "./SignalsTab";
import StatsTab from "./StatsTab";
import MetaTab from "./MetaTab";
import RebaseTab from "./RebaseTab";
import { FONT_DISPLAY } from "../../constants/theme";

function tabSt(active, accent, t) {
  return {
    padding: "8px 0", fontSize: 10, fontWeight: 600, letterSpacing: 0.3,
    textTransform: "uppercase", cursor: "pointer", background: "none", border: "none",
    borderBottom: `2px solid ${active ? (accent || t.accent) : "transparent"}`,
    color: active ? (accent || t.text1) : t.text3,
    transition: "all 0.15s", fontFamily: FONT_DISPLAY, flex: 1, textAlign: "center", whiteSpace: "nowrap",
  };
}

export default function Sidebar({
  t, theme, gc,
  activePanel, setActivePanel,
  activeSidebarDataset, setActiveSidebarDataset,
  importMode, data,
  // SignalsTab props
  groups, visible, cursorValues, cursor2Values, deltaMode,
  metadata, signalStyles, referenceOverlays, derivedConfigs,
  comparisonData, comparisonState, updateComparisonState,
  getDisplayName, getGroupLabel,
  toggleSignal, toggleGroup, setGroup,
  deleteDerivedPen, setGroupNames,
  addOverlay, updateOverlay, deleteOverlay,
  onStyleChange, handleRenameDisplay, setDerivedDialog,
  // StatsTab props
  viewRange,
  // MetaTab props
  setMetadata, editingMeta, setEditingMeta,
  // RebaseTab props
  rebaseOffset, rebaseInput, setRebaseInput, applyRebase, clearRebase,
  // ExportPanel props
  showToast,
}) {
  return (
    <div style={{ width: 280, flexShrink: 0, background: t.panel, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: t.panelShadow }}>
      {importMode === "comparison" && (
        <div id="sidebar-comparison-tabs" style={{ display: "flex", borderBottom: `1px solid ${t.border}` }}>
          <button onClick={() => setActiveSidebarDataset("primary")} style={tabSt(activeSidebarDataset === "primary", t.accent, t)}>Original</button>
          <button onClick={() => setActiveSidebarDataset("comparison")} style={tabSt(activeSidebarDataset === "comparison", t.green, t)}>Comparison</button>
        </div>
      )}
      <div style={{ display: "flex", borderBottom: `1px solid ${t.border}` }}>
        {["signals", "stats", "meta", "rebase", "export"].map(tab => (
          <button
            key={tab}
            id={`tab-${tab}`}
            onClick={() => setActivePanel(tab)}
            style={tabSt(activePanel === tab, tab === "export" ? t.green : tab === "rebase" ? t.warn : null, t)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 10 }}>
        {activePanel === "signals" && (
          <SignalsTab
            t={t} theme={theme} gc={gc} data={data}
            groups={groups} visible={visible}
            cursorValues={cursorValues} cursor2Values={cursor2Values}
            deltaMode={deltaMode} metadata={metadata}
            signalStyles={signalStyles} referenceOverlays={referenceOverlays}
            derivedConfigs={derivedConfigs}
            importMode={importMode} activeSidebarDataset={activeSidebarDataset}
            comparisonData={comparisonData} comparisonState={comparisonState}
            updateComparisonState={updateComparisonState}
            getDisplayName={getDisplayName} getGroupLabel={getGroupLabel}
            toggleSignal={toggleSignal} toggleGroup={toggleGroup} setGroup={setGroup}
            onEditDerived={undefined}
            deleteDerivedPen={deleteDerivedPen} setGroupNames={setGroupNames}
            addOverlay={addOverlay} updateOverlay={updateOverlay} deleteOverlay={deleteOverlay}
            onStyleChange={onStyleChange} handleRenameDisplay={handleRenameDisplay}
            setDerivedDialog={setDerivedDialog}
          />
        )}
        {activePanel === "stats" && (
          <StatsTab
            t={t} theme={theme} data={data}
            visible={visible} metadata={metadata}
            viewRange={viewRange} signalStyles={signalStyles}
            getDisplayName={getDisplayName}
          />
        )}
        {activePanel === "meta" && (
          <MetaTab
            t={t} theme={theme} data={data}
            visible={visible} metadata={metadata}
            setMetadata={setMetadata} signalStyles={signalStyles}
            editingMeta={editingMeta} setEditingMeta={setEditingMeta}
          />
        )}
        {activePanel === "rebase" && (
          <RebaseTab
            t={t} data={data}
            rebaseOffset={rebaseOffset} rebaseInput={rebaseInput}
            setRebaseInput={setRebaseInput}
            applyRebase={applyRebase} clearRebase={clearRebase}
          />
        )}
        {activePanel === "export" && (
          <ExportPanel
            data={data} metadata={metadata} viewRange={viewRange}
            getDisplayName={getDisplayName} theme={theme}
            onToast={showToast} rebaseOffset={rebaseOffset}
          />
        )}
      </div>
    </div>
  );
}
