// src/components/sidebar/SignalsTab.jsx
import GroupPanel from "../GroupPanel";
import { MAX_GROUPS } from "../../constants/groups";
import { FONT_DISPLAY, FONT_MONO } from "../../constants/theme";

export default function SignalsTab({
  t, theme, gc, data,
  groups, visible, cursorValues, cursor2Values, deltaMode,
  metadata, signalStyles, referenceOverlays, derivedConfigs,
  importMode, activeSidebarDataset, comparisonData, comparisonState,
  updateComparisonState, getDisplayName, getGroupLabel,
  toggleSignal, toggleGroup, setGroup,
  onEditDerived, deleteDerivedPen, setGroupNames,
  addOverlay, updateOverlay, deleteOverlay,
  onStyleChange, handleRenameDisplay, setDerivedDialog,
}) {
  // Comparison dataset signal list
  if (importMode === "comparison" && activeSidebarDataset === "comparison" && comparisonData && comparisonState) {
    return (
      <div>
        <div style={{ fontSize: 11, color: t.green, fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
          {comparisonData.meta?.trendName || "Comparison Dataset"} · {comparisonData.signals.length} tags
        </div>
        {comparisonData.signals.map((sig, i) => {
          const isVis = comparisonState.visible?.[i] ?? true;
          const displayName = comparisonState.metadata?.[i]?.displayName || comparisonData.tagNames[i] || `Signal ${i}`;
          const color = comparisonState.signalStyles?.[i]?.color || (t.sigColors[i % t.sigColors.length]);
          return (
            <div
              key={i}
              onClick={() => updateComparisonState("visible", prev => { const n = [...(prev || [])]; n[i] = !n[i]; return n; })}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 6, cursor: "pointer", opacity: isVis ? 1 : 0.45, marginBottom: 2, background: isVis ? color + "10" : "transparent" }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: t.text1, fontFamily: FONT_MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</span>
              {sig.isDigital && <span style={{ fontSize: 9, color: t.text4, fontFamily: FONT_DISPLAY, marginLeft: "auto" }}>DIG</span>}
            </div>
          );
        })}
      </div>
    );
  }

  // Primary dataset GroupPanel grid
  return (
    <div>
      {Array.from({ length: MAX_GROUPS }, (_, i) => {
        const g = i + 1;
        return (
          <GroupPanel
            key={g}
            groupIdx={g}
            label={getGroupLabel(g)}
            color={gc[i]}
            signals={data.signals}
            sigColors={t.sigColors}
            visible={visible}
            groups={groups}
            cursorValues={cursorValues}
            cursor2Values={cursor2Values}
            deltaMode={deltaMode}
            metadata={metadata}
            data={data}
            signalStyles={signalStyles}
            referenceOverlays={referenceOverlays[g] || []}
            derivedConfigs={derivedConfigs}
            onDrop={(sigIdx, targetGroup) => setGroup(sigIdx, targetGroup)}
            onToggleVisible={toggleSignal}
            onToggleGroup={toggleGroup}
            onEditDerived={(idx) => {
              const cfg = derivedConfigs[idx];
              if (!cfg) return;
              setDerivedDialog({
                open: true,
                mode: "edit",
                editIdx: idx,
                groupIdx: groups[idx] || 1,
                type: cfg.type || "equation",
                initialDraft: {
                  name: metadata[idx]?.displayName || data?.tagNames?.[idx] || "",
                  groupIdx: groups[idx] || 1,
                  type: cfg.type || "equation",
                  expression: cfg.expression || "s0 - s1",
                  source: cfg.source ?? 0,
                  window: cfg.window ?? 20,
                  sources: cfg.sources || [0, 1],
                  absDiff: !!cfg.absDiff,
                  unwrapDiff: !!cfg.unwrapDiff,
                },
              });
            }}
            onDeleteDerived={deleteDerivedPen}
            onSetGroupName={(g, name) => setGroupNames(prev => {
              const n = { ...prev };
              if (name) n[g] = name;
              else delete n[g];
              return n;
            })}
            onAddOverlay={(groupIdx, type) => addOverlay(groupIdx, type)}
            onUpdateOverlay={updateOverlay}
            onDeleteOverlay={deleteOverlay}
            onStyleChange={(idx, updates) => {
              onStyleChange(idx, updates);
            }}
            theme={theme}
            getDisplayName={getDisplayName}
            onRenameDisplay={handleRenameDisplay}
          />
        );
      })}
    </div>
  );
}
