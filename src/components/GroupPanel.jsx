import { useState, useRef } from "react";
import { THEMES, FONT_DISPLAY } from "../constants/theme";
import { GROUP_LABELS } from "../constants/groups";
import SignalCard from "./SignalCard";

export default function GroupPanel({ groupIdx, label, color, signals, sigColors, visible, groups, cursorValues, cursor2Values, deltaMode, metadata, data, onDrop, onToggleVisible, onToggleGroup, onSetGroupName, onStyleChange, signalStyles, derivedConfigs, onEditDerived, onDeleteDerived, theme, getDisplayName }) {
  const t = THEMES[theme];
  const [dragOver, setDragOver] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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
              color={signalStyles[i]?.color || sigColors[i % sigColors.length]}
              dash={signalStyles[i]?.dash || "solid"}
              displayName={getDisplayName(i)}
              tagName={data.tagNames[i]}
              unit={(metadata[i] || {}).unit || ""}
              visible={visible[i]}
              cursorValue={cursorValues?.[i]}
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

      {/* Empty drop hint */}
      {isEmpty && dragOver && (
        <div style={{ padding: "8px", fontSize: 13, color: color, textAlign: "center", fontFamily: FONT_DISPLAY, fontWeight: 500 }}>
          Drop here
        </div>
      )}
    </div>
  );
}
