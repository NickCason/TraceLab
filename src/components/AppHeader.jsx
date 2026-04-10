// src/components/AppHeader.jsx
import ThemeToggle from "./ThemeToggle";
import ToolBtn from "./ToolBtn";
import { FONT_DISPLAY, FONT_MONO } from "../constants/theme";

export default function AppHeader({
  t, theme, setTheme, data, rebaseOffset, importMode, comparisonData,
  deltaMode, showPills, showEdgeValues, showExtrema, isCombined,
  fileInputRef, projectInputRef,
  setDeltaMode, setShowPills, setShowEdgeValues, setShowExtrema,
  setCursorIdx, setCursor2Idx, setDeltaLocked,
  combineAll, soloAll, resetZoom,
  exportSnapshot, saveProject, loadProject, handleFile,
  setTutorialOpen, setImportDialogOpen,
  setImportMode, setComparisonData, setComparisonState, setActiveSidebarDataset,
}) {
  return (
    <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: `1px solid ${t.border}`, background: t.panel, flexShrink: 0, boxShadow: theme === "dark" ? "0 1px 8px rgba(0,0,0,0.3)" : "0 1px 4px rgba(0,0,0,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 800, letterSpacing: -0.5 }}>
          <span style={{ color: t.accent }}>Trace</span>
          <span style={{ color: t.text3 }}>Lab</span>
        </div>
        <div style={{ width: 1, height: 22, background: t.border }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text1, fontFamily: FONT_DISPLAY }}>
            {data.meta.projectFile || data.meta.sourceFile || data.meta.trendName || "Untitled"}
          </div>
          {(() => {
            const subtext = data.meta.projectFile
              ? data.meta.sourceFile
              : data.meta.addedSourceFiles?.length
                ? `+ ${data.meta.addedSourceFiles.join(", ")}`
                : data.meta.trendName;
            return subtext
              ? <div style={{ fontSize: 11, color: t.text3, fontFamily: FONT_MONO }}>{subtext}</div>
              : null;
          })()}
        </div>
        <div style={{ fontSize: 12, color: t.text3, fontFamily: FONT_MONO }}>{data.signals.length} tags · {data.timestamps.length.toLocaleString()} samples · {data.meta.samplePeriod}{data.meta.sampleUnit}</div>
        {rebaseOffset !== 0 && (
          <div style={{ fontSize: 12, color: t.warn, fontWeight: 700, letterSpacing: 1, padding: "2px 8px", borderRadius: 6, background: `${t.warn}18`, border: `1px solid ${t.warn}33`, fontFamily: FONT_DISPLAY }}>REBASED</div>
        )}
        {importMode === "unified" && (
          <div style={{ fontSize: 12, color: t.green, fontWeight: 700, letterSpacing: 1, padding: "2px 8px", borderRadius: 6, background: `${t.green}18`, border: `1px solid ${t.green}33`, fontFamily: FONT_DISPLAY }}>
            UNIFIED · {data?.signals.length} tags
          </div>
        )}
        {importMode === "comparison" && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: t.green, fontWeight: 700, letterSpacing: 1, padding: "2px 8px", borderRadius: 6, background: `${t.green}18`, border: `1px solid ${t.green}33`, fontFamily: FONT_DISPLAY }}>
            COMPARISON{comparisonData?.meta?.sourceFile ? ` · ${comparisonData.meta.sourceFile}` : ""}
            <span
              onClick={() => { setImportMode(null); setComparisonData(null); setComparisonState(null); setActiveSidebarDataset("primary"); }}
              title="Exit comparison mode"
              style={{ cursor: "pointer", opacity: 0.7, fontSize: 13, lineHeight: 1 }}
            >✕</span>
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <ThemeToggle theme={theme} setTheme={setTheme} />
        <button
          id="btn-tutorial"
          onClick={() => setTutorialOpen(true)}
          title="Open tutorial"
          style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO, fontWeight: 700, fontSize: 13, padding: 0, flexShrink: 0, color: t.accent, background: "transparent", border: `1.5px solid ${t.accentBorder}`, cursor: "pointer", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = t.accentDim; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >?</button>
        <div style={{ width: 1, height: 22, background: t.border, marginLeft: 4, marginRight: 4 }} />
        <ToolBtn id="btn-delta" onClick={() => { setDeltaMode(!deltaMode); setCursorIdx(null); setCursor2Idx(null); setDeltaLocked(false); }} active={deltaMode} activeColor={t.cursor2} t={t}>Δ Delta</ToolBtn>
        <ToolBtn onClick={() => setShowPills(!showPills)} active={showPills} activeColor={t.green} t={t} title="Toggle cursor value pills">Pills</ToolBtn>
        <ToolBtn id="btn-edges" onClick={() => setShowEdgeValues(!showEdgeValues)} active={showEdgeValues} activeColor={t.warn} t={t} title="Show entry/exit values at view edges">Edges</ToolBtn>
        <ToolBtn id="btn-peaks" onClick={() => setShowExtrema(!showExtrema)} active={showExtrema} activeColor={t.accent} t={t} title="Show per-signal max/min markers in current view">Peaks</ToolBtn>
        <ToolBtn onClick={isCombined ? soloAll : combineAll} active={!isCombined} activeColor={t.isolate} t={t}>{isCombined ? "Solo All" : "Combine"}</ToolBtn>
        <ToolBtn id="btn-fit" onClick={resetZoom} t={t}>Fit</ToolBtn>
        <ToolBtn onClick={exportSnapshot} title="Save chart as PNG" t={t}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21,15 16,10 5,21" />
          </svg>
        </ToolBtn>
        <ToolBtn id="btn-save-project" onClick={saveProject} title="Save project" t={t}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17,21 17,13 7,13 7,21" /><polyline points="7,3 7,8 15,8" />
          </svg>
        </ToolBtn>
        <ToolBtn id="btn-load-project" onClick={() => projectInputRef.current?.click()} title="Load project" t={t}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </ToolBtn>
        <input ref={projectInputRef} type="file" accept=".tracelab" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) loadProject(e.target.files[0]); }} />
        <ToolBtn id="btn-load-csv" onClick={() => fileInputRef.current?.click()} t={t} style={{ background: t.accentDim, borderColor: `${t.accent}33`, color: t.accent }}>Load CSV</ToolBtn>
        <input ref={fileInputRef} type="file" accept=".csv,.CSV,.tracelab" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { f.name.endsWith(".tracelab") ? loadProject(f) : handleFile(f); } }} />
        {data && <ToolBtn id="btn-add-csv" onClick={() => setImportDialogOpen(true)} t={t} style={{ background: t.green + "18", borderColor: t.green + "33", color: t.green }}>+ CSV</ToolBtn>}
      </div>
    </div>
  );
}
