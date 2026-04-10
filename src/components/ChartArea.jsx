// src/components/ChartArea.jsx
import ChartPane from "./ChartPane";
import PaneHeader from "./PaneHeader";
import { fmtDate, fmtTime } from "../utils/date";
import { FONT_DISPLAY, FONT_MONO } from "../constants/theme";

export default function ChartArea({
  t, theme, data,
  chartPanes, comparisonChartPanes,
  comparisonData, comparisonState, importMode,
  viewRange, setViewRange,
  cursorIdx, setCursorIdx,
  cursor2Idx, setCursor2Idx,
  deltaMode, deltaLocked, setDeltaLocked,
  rebaseOffset,
  showPills, showEdgeValues, showExtrema,
  referenceOverlays, splitRanges, setSplitRanges,
  globalEdgeLabelWidth, globalLeftEdgeLabelWidth,
  updateOverlay, updateComparisonState,
  overlayPickerGroup, setOverlayPickerGroup,
  addOverlay, setDerivedDialog,
  gc,
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Cursor status bar */}
      <div style={{ height: 30, display: "flex", alignItems: "center", gap: 16, padding: "0 14px", background: t.chart, borderBottom: `1px solid ${t.borderSubtle}`, fontSize: 12, color: t.text3, flexShrink: 0 }}>
        {cursorIdx !== null && (
          <>
            <span>
              <span style={{ color: t.text3, fontFamily: FONT_DISPLAY, fontWeight: 500 }}>T₁</span>{" "}
              <span style={{ color: t.text1, fontFamily: FONT_MONO, fontWeight: 600 }}>{fmtTime(data.timestamps[cursorIdx] + rebaseOffset)}</span>
            </span>
            {deltaMode && cursor2Idx !== null && (
              <>
                <span>
                  <span style={{ color: t.text3, fontFamily: FONT_DISPLAY, fontWeight: 500 }}>T₂</span>{" "}
                  <span style={{ color: t.cursor2, fontFamily: FONT_MONO, fontWeight: 600 }}>{fmtTime(data.timestamps[cursor2Idx] + rebaseOffset)}</span>
                </span>
                <span>
                  <span style={{ color: t.text3, fontFamily: FONT_DISPLAY, fontWeight: 500 }}>ΔT</span>{" "}
                  <span style={{ color: t.cursor2, fontFamily: FONT_MONO, fontWeight: 700 }}>{Math.abs(data.timestamps[cursor2Idx] - data.timestamps[cursorIdx]).toFixed(0)} ms</span>
                </span>
              </>
            )}
          </>
        )}
        {chartPanes.length > 1 && (
          <span style={{ color: t.isolate, fontSize: 12, fontWeight: 700, letterSpacing: 1, padding: "2px 8px", borderRadius: 5, background: t.isolateDim, fontFamily: FONT_DISPLAY }}>
            {chartPanes.length} panes
          </span>
        )}
        <span style={{ marginLeft: "auto", color: t.text4, fontSize: 13, fontFamily: FONT_DISPLAY }}>
          {deltaMode ? "click: place cursors · scroll: zoom" : "drag: pan · scroll: zoom"}
        </span>
      </div>

      {/* Original dataset label in comparison mode */}
      {importMode === "comparison" && comparisonData && (
        <div style={{ height: 20, display: "flex", alignItems: "center", padding: "0 10px", background: t.accent + "18", borderBottom: `1px solid ${t.accent}33`, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.accent, fontFamily: FONT_DISPLAY, letterSpacing: 0.5 }}>
            Original: {data.meta?.trendName || "Dataset 1"}
          </span>
        </div>
      )}

      {/* Primary chart panes */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {chartPanes.map((pane, pi) => {
          const paneGc = gc[pane.groupIdx - 1] || gc[0];
          return (
            <div
              key={pane.id}
              id={pi === 0 ? "chart-pane-0" : undefined}
              style={{ flex: 1, minHeight: 48, position: "relative", display: "flex", flexDirection: "column", borderBottom: pi === chartPanes.length - 1 ? "none" : `1px solid ${t.border}` }}
            >
              <PaneHeader
                pane={pane} paneGc={paneGc}
                splitRanges={splitRanges}
                onToggleSplit={() => setSplitRanges(prev => ({ ...prev, [pane.groupIdx]: !prev[pane.groupIdx] }))}
                overlayPickerGroup={overlayPickerGroup}
                setOverlayPickerGroup={setOverlayPickerGroup}
                addOverlay={addOverlay}
                setDerivedDialog={setDerivedDialog}
                t={t} pi={pi} showDerivedButton={true}
              />
              <div style={{ flex: 1, position: "relative" }}>
                <ChartPane
                  timestamps={data.timestamps}
                  signalEntries={pane.entries}
                  cursorIdx={cursorIdx} setCursorIdx={setCursorIdx}
                  cursor2Idx={cursor2Idx} setCursor2Idx={setCursor2Idx}
                  deltaMode={deltaMode}
                  viewRange={viewRange} setViewRange={setViewRange}
                  showTimeAxis={pi === chartPanes.length - 1}
                  label={paneGc ? null : pane.label}
                  compact={chartPanes.length > 2}
                  theme={theme} rebaseOffset={rebaseOffset}
                  groupColor={paneGc} showPills={showPills}
                  showEdgeValues={showEdgeValues}
                  unifyRange={!splitRanges[pane.groupIdx]}
                  referenceOverlays={referenceOverlays[pane.groupIdx] || []}
                  onOverlayChange={(overlayId, updates) => updateOverlay(pane.groupIdx, overlayId, updates)}
                  deltaLocked={deltaLocked} setDeltaLocked={setDeltaLocked}
                  globalEdgeLabelWidth={globalEdgeLabelWidth}
                  globalLeftEdgeLabelWidth={globalLeftEdgeLabelWidth}
                  showExtrema={showExtrema}
                />
              </div>
            </div>
          );
        })}
        {chartPanes.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: t.text4, fontSize: 13, fontFamily: FONT_DISPLAY }}>No visible signals</div>
        )}
      </div>

      {/* Comparison chart section */}
      {importMode === "comparison" && comparisonData && comparisonState && (
        <>
          <div style={{ height: 2, background: t.green + "55", flexShrink: 0 }} />
          <div style={{ height: 20, display: "flex", alignItems: "center", padding: "0 10px", background: t.green + "14", borderBottom: `1px solid ${t.green}33`, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.green, fontFamily: FONT_DISPLAY, letterSpacing: 0.5 }}>
              Comparison: {comparisonData.meta?.trendName || "Dataset 2"}
            </span>
            <span style={{ fontSize: 11, color: t.text4, fontFamily: FONT_MONO, marginLeft: 8 }}>
              {comparisonData.signals.length} tags · {comparisonData.timestamps.length.toLocaleString()} samples
            </span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {comparisonChartPanes.map((pane, pi) => {
              const paneGc = gc[pane.groupIdx - 1] || gc[0];
              return (
                <div key={pane.id} style={{ flex: 1, minHeight: 48, position: "relative", display: "flex", flexDirection: "column", borderBottom: pi === comparisonChartPanes.length - 1 ? "none" : `1px solid ${t.border}` }}>
                  <PaneHeader
                    pane={pane} paneGc={paneGc}
                    splitRanges={comparisonState.splitRanges || {}}
                    onToggleSplit={() => updateComparisonState("splitRanges", prev => ({ ...prev, [pane.groupIdx]: !prev?.[pane.groupIdx] }))}
                    overlayPickerGroup={null}
                    setOverlayPickerGroup={() => {}}
                    addOverlay={() => {}}
                    setDerivedDialog={() => {}}
                    t={t} pi={pi} showDerivedButton={false}
                  />
                  <div style={{ flex: 1, position: "relative" }}>
                    <ChartPane
                      timestamps={comparisonData.timestamps}
                      signalEntries={pane.entries}
                      cursorIdx={comparisonState.cursorIdx}
                      setCursorIdx={(idx) => updateComparisonState("cursorIdx", idx)}
                      cursor2Idx={comparisonState.cursor2Idx}
                      setCursor2Idx={(idx) => updateComparisonState("cursor2Idx", idx)}
                      deltaMode={deltaMode}
                      viewRange={comparisonState.viewRange}
                      setViewRange={(vr) => updateComparisonState("viewRange", vr)}
                      showTimeAxis={pi === comparisonChartPanes.length - 1}
                      label={paneGc ? null : pane.label}
                      compact={comparisonChartPanes.length > 2}
                      theme={theme}
                      rebaseOffset={comparisonState.rebaseOffset || 0}
                      groupColor={paneGc}
                      showPills={showPills}
                      showEdgeValues={showEdgeValues}
                      unifyRange={!comparisonState.splitRanges?.[pane.groupIdx]}
                      referenceOverlays={comparisonState.referenceOverlays?.[pane.groupIdx] || []}
                      onOverlayChange={() => {}}
                      deltaLocked={false}
                      setDeltaLocked={() => {}}
                      globalEdgeLabelWidth={0}
                      globalLeftEdgeLabelWidth={0}
                      showExtrema={showExtrema}
                    />
                  </div>
                </div>
              );
            })}
            {comparisonChartPanes.length === 0 && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: t.text4, fontSize: 13, fontFamily: FONT_DISPLAY }}>No visible signals</div>
            )}
          </div>
        </>
      )}

      {/* Status bar footer */}
      <div style={{ height: 26, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: t.panel, borderTop: `1px solid ${t.borderSubtle}`, fontSize: 13, color: t.text4, flexShrink: 0, fontFamily: FONT_MONO }}>
        <span>{fmtDate(data.timestamps[0] + rebaseOffset)} {fmtTime(data.timestamps[viewRange[0]] + rebaseOffset)}</span>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 500 }}>
          Viewing {(viewRange[1] - viewRange[0]).toLocaleString()} / {data.timestamps.length.toLocaleString()} ({((viewRange[1] - viewRange[0]) / data.timestamps.length * 100).toFixed(1)}%)
        </span>
        <span>{fmtTime(data.timestamps[Math.min(viewRange[1], data.timestamps.length) - 1] + rebaseOffset)}</span>
      </div>
    </div>
  );
}
