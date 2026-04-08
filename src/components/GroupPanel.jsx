import { useState, useRef } from "react";
import { THEMES, FONT_DISPLAY, FONT_MONO } from "../constants/theme";
import { GROUP_LABELS } from "../constants/groups";
import { EXTENDED_COLOR_SWATCHES, getAutoSignalColor } from "../constants/colors";
import SignalCard from "./SignalCard";
import ColorPicker from "./ColorPicker";

export default function GroupPanel({ groupIdx, label, color, signals, sigColors, visible, groups, cursorValues, cursor2Values, deltaMode, metadata, data, onDrop, onToggleVisible, onToggleGroup, onSetGroupName, onStyleChange, signalStyles, referenceOverlays = [], derivedConfigs, onEditDerived, onDeleteDerived, onAddOverlay, onUpdateOverlay, onDeleteOverlay, theme, getDisplayName }) {
  const t = THEMES[theme];
  const [dragOver, setDragOver] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(label);
  const nameRef = useRef(null);

  // Signals in this group
  const members = [];
  if (data) {
    data.signals.forEach((sig, i) => {
      if (groups[i] === groupIdx) members.push(i);
    });
  }

  const isEmpty = members.length === 0;
  const allVisible = members.length > 0 && members.every(i => visible[i]);
  const noneVisible = members.length > 0 && members.every(i => !visible[i]);

  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const idx = parseInt(e.dataTransfer.getData("text/plain"));
    if (!isNaN(idx)) onDrop(idx, groupIdx);
  };

  const startEditing = (e) => {
    e.stopPropagation();
    setNameInput(label);
    setEditingName(true);
    setTimeout(() => nameRef.current?.select(), 0);
  };
  const commitName = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== `Group ${GROUP_LABELS[groupIdx - 1]}`) {
      onSetGroupName(groupIdx, trimmed);
    } else {
      onSetGroupName(groupIdx, null); // reset to default
    }
    setEditingName(false);
  };

  return (
    <div
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      style={{
        borderRadius: 8, marginBottom: 4, overflow: "visible",
        border: `1px solid ${dragOver ? color + "66" : isEmpty ? t.borderSubtle : color + "22"}`,
        background: dragOver ? color + "0c" : "transparent",
        transition: "all 0.15s",
        minHeight: isEmpty ? 0 : undefined,
      }}
    >
      {/* Panel header */}
      <div
        onClick={() => !isEmpty && !editingName && setCollapsed(!collapsed)}
        style={{
          display: "flex", alignItems: "center", gap: 5, padding: isEmpty ? "3px 8px" : "5px 8px",
          cursor: isEmpty ? "default" : "pointer", userSelect: "none",
          background: color + (isEmpty ? "06" : "10"),
          borderBottom: !collapsed && !isEmpty ? `1px solid ${color}15` : "none",
        }}
      >
        {/* Toggle-all visibility button */}
        {!isEmpty && (
          <div
            onClick={(e) => { e.stopPropagation(); onToggleGroup(groupIdx); }}
            title={allVisible ? "Hide all in group" : "Show all in group"}
            style={{
              width: 14, height: 14, borderRadius: 3, flexShrink: 0, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `1.5px solid ${allVisible ? color : noneVisible ? t.text4 : color + "88"}`,
              background: allVisible ? color + "33" : "transparent",
              transition: "all 0.15s",
            }}
          >
            {allVisible && <svg width="8" height="8" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            {!allVisible && !noneVisible && <div style={{ width: 6, height: 2, borderRadius: 1, background: color }} />}
          </div>
        )}
        {isEmpty && <div style={{ width: 7, height: 7, borderRadius: 2, flexShrink: 0, background: color, opacity: 0.3 }} />}
        {/* Editable label */}
        {editingName ? (
          <input
            ref={nameRef}
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") setEditingName(false); }}
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
              fontFamily: FONT_DISPLAY, color, background: t.inputBg, border: `1px solid ${color}44`,
              borderRadius: 4, padding: "1px 5px", outline: "none", minWidth: 0,
            }}
          />
        ) : (
          <div
            onDoubleClick={!isEmpty ? startEditing : undefined}
            title={!isEmpty ? "Double-click to rename" : undefined}
            style={{
              flex: 1, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
              fontFamily: FONT_DISPLAY,
              color: isEmpty ? t.text4 : color,
            }}
          >
            {label}
            {!isEmpty && <span style={{ fontWeight: 500, color: t.text3, letterSpacing: 0, textTransform: "none", marginLeft: 4 }}>({members.length})</span>}
          </div>
        )}
        {/* Collapse chevron */}
        {!isEmpty && (
          <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0, transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
            <polyline points="2,3 5,6 8,3" fill="none" stroke={t.text3} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>

      {/* Signal cards */}
      {!collapsed && !isEmpty && (
        <div style={{ padding: "3px 3px 2px" }}>
          {members.map(i => (
            <SignalCard
              key={i} index={i} signal={data.signals[i]}
              color={signalStyles[i]?.color || getAutoSignalColor(theme, i) || sigColors[i % sigColors.length]}
              dash={signalStyles[i]?.dash || "solid"}
              strokeMode={signalStyles[i]?.strokeMode || signalStyles[i]?.dash || "solid"}
              thickness={Math.max(0.8, Number(signalStyles[i]?.thickness) || (data.signals[i].isDigital ? 2 : 1.5))}
              opacity={Math.max(0.1, Math.min(1, Number(signalStyles[i]?.opacity) || 0.92))}
              displayName={getDisplayName(i)}
              tagName={data.tagNames[i]}
              unit={(metadata[i] || {}).unit || ""}
              visible={visible[i]}
              cursorValue={cursorValues?.[i]?.value ?? cursorValues?.[i]}
              cursorValueIsInterpolated={cursorValues?.[i]?.isInterpolated ?? false}
              cursor2Value={cursor2Values?.[i]}
              deltaMode={deltaMode}
              isDigital={data.signals[i].isDigital}
              onToggleVisible={onToggleVisible}
              onStyleChange={onStyleChange}
              isDerived={!!data.signals[i].isDerived}
              seamOffsetPct={signalStyles[i]?.seamOffsetPct}
              seamOffset={signalStyles[i]?.seamOffset || 0}
              derivedType={data.signals[i].derivedType || derivedConfigs?.[i]?.type || null}
              onEditDerived={onEditDerived}
              onDeleteDerived={onDeleteDerived}
              theme={theme}
            />
          ))}
        </div>
      )}
      {!collapsed && !isEmpty && (
        <div style={{ padding: "2px 6px 6px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
            <div onClick={() => setShowOverlays(v => !v)} style={{ fontSize: 11, color: t.text3, fontWeight: 700, letterSpacing: 0.6, fontFamily: FONT_DISPLAY, cursor: "pointer", userSelect: "none" }}>
              OVERLAYS <span style={{ color: t.text4, fontWeight: 500 }}>({referenceOverlays.length})</span> {showOverlays ? "▾" : "▸"}
            </div>
          </div>
          {showOverlays && referenceOverlays.map((ov) => (
            <div key={ov.id} style={{ display: "grid", gridTemplateColumns: "16px 1fr 54px 28px", gap: 4, alignItems: "center", marginBottom: 3, padding: "4px 5px", borderRadius: 6, border: `1px solid ${t.borderSubtle}`, background: t.surface }}>
              <input type="checkbox" checked={ov.visible !== false} onChange={(e) => onUpdateOverlay?.(groupIdx, ov.id, { visible: e.target.checked })} />
              <input value={ov.label || ""} onChange={(e) => onUpdateOverlay?.(groupIdx, ov.id, { label: e.target.value })} placeholder={ov.type === "band" ? "Band" : "Line"} style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 5, color: t.text1, fontSize: 11, padding: "2px 5px", fontFamily: FONT_MONO }} />
              <input type="number" step={ov.axis === "x" ? "1" : "0.001"} value={ov.axis === "x" ? (ov.sample ?? 0) : (ov.type === "band" ? (ov.min ?? 0) : (ov.value ?? 0))} onChange={(e) => onUpdateOverlay?.(groupIdx, ov.id, ov.axis === "x" ? { sample: parseFloat(e.target.value) || 0 } : (ov.type === "band" ? { min: parseFloat(e.target.value) || 0 } : { value: parseFloat(e.target.value) || 0 }))} style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 5, color: t.text1, fontSize: 11, padding: "2px 4px", fontFamily: FONT_MONO }} />
              <button onClick={() => onDeleteOverlay?.(groupIdx, ov.id)} style={{ fontSize: 11, borderRadius: 5, border: `1px solid ${t.red}55`, background: `${t.red}14`, color: t.red, cursor: "pointer", height: 22 }}>×</button>
              <div />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, gridColumn: "2 / span 3" }}>
                <select value={ov.axis || "y"} onChange={(e) => onUpdateOverlay?.(groupIdx, ov.id, { axis: e.target.value })} style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 5, color: t.text1, fontSize: 11, padding: "2px 4px", fontFamily: FONT_MONO }}>
                  <option value="y">Horizontal (Y)</option>
                  <option value="x">Vertical (Sample)</option>
                </select>
                <ColorPicker
                  value={ov.color}
                  fallbackColor={color}
                  swatches={EXTENDED_COLOR_SWATCHES}
                  onChange={(nextColor) => onUpdateOverlay?.(groupIdx, ov.id, { color: nextColor })}
                  t={t}
                  title="Choose overlay color"
                  panelWidth={188}
                />
              </div>
              {ov.type === "band" ? (
                <>
                  <div />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, gridColumn: "2 / span 3" }}>
                    <input
                      type="number"
                      step={ov.axis === "x" ? "1" : "0.001"}
                      value={ov.axis === "x" ? (ov.sampleEnd ?? 100) : (ov.max ?? 10)}
                      onChange={(e) => onUpdateOverlay?.(groupIdx, ov.id, ov.axis === "x" ? { sampleEnd: parseFloat(e.target.value) || 0 } : { max: parseFloat(e.target.value) || 0 })}
                      placeholder={ov.axis === "x" ? "sample end" : "max"}
                      style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 5, color: t.text1, fontSize: 11, padding: "2px 4px", fontFamily: FONT_MONO }}
                    />
                    <input
                      type="number"
                      min="0"
                      max={Math.max(0, (data?.timestamps?.length || 1) - 1)}
                      step="1"
                      value={Math.max(0, Math.round(ov.axis === "x" ? (ov.sample ?? 0) : 0))}
                      onChange={(e) => ov.axis === "x" && onUpdateOverlay?.(groupIdx, ov.id, { sample: parseInt(e.target.value, 10) || 0 })}
                      style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 5, color: t.text1, fontSize: 11, padding: "2px 4px", fontFamily: FONT_MONO }}
                      title="Sample index (integer)"
                    />
                    <input type="number" min="0" max="1" step="0.01" value={ov.opacity ?? 0.12} onChange={(e) => onUpdateOverlay?.(groupIdx, ov.id, { opacity: Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.12)) })} style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 5, color: t.text1, fontSize: 11, padding: "2px 4px", fontFamily: FONT_MONO }} />
                  </div>
                  <div />
                  <div style={{ gridColumn: "2 / span 3" }}>
                    <input type="range" min="0" max="1" step="0.01" value={ov.opacity ?? 0.12} onChange={(e) => onUpdateOverlay?.(groupIdx, ov.id, { opacity: Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.12)) })} style={{ width: "100%" }} />
                  </div>
                </>
              ) : (
                <>
                  <div />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 54px 66px", gap: 4, gridColumn: "2 / span 3" }}>
                    <input
                      type="number"
                      min="0"
                      max={Math.max(0, (data?.timestamps?.length || 1) - 1)}
                      step="1"
                      value={Math.max(0, Math.round(ov.axis === "x" ? (ov.sample ?? 0) : 0))}
                      onChange={(e) => ov.axis === "x" && onUpdateOverlay?.(groupIdx, ov.id, { sample: parseInt(e.target.value, 10) || 0 })}
                      style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 5, color: t.text1, fontSize: 11, padding: "2px 4px", fontFamily: FONT_MONO }}
                      title="Sample index (integer)"
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: t.text3, fontFamily: FONT_DISPLAY }}><input type="checkbox" checked={!!ov.dashed} onChange={(e) => onUpdateOverlay?.(groupIdx, ov.id, { dashed: e.target.checked })} />dash</label>
                    <span style={{ fontSize: 10, color: t.text4, fontFamily: FONT_DISPLAY, alignSelf: "center" }}>{ov.axis === "x" ? "sample" : "line"}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty drop hint */}
      {isEmpty && dragOver && (
        <div style={{ padding: "8px", fontSize: 13, color: color, textAlign: "center", fontFamily: FONT_DISPLAY, fontWeight: 500 }}>
          Drop here
        </div>
      )}
    </div>
  );
}
