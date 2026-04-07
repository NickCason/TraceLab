import { useState, useRef, useEffect } from "react";
import { THEMES, FONT_DISPLAY, FONT_MONO } from "../constants/theme";
import Sparkline from "./Sparkline";
import MarqueeText from "./MarqueeText";
import { clampSeamPercent, inferSeamDomain, seamOffsetToPercent, snapSeamPercent } from "../utils/seamAdjustment";

export default function SignalCard({ index, signal, color, dash, displayName, tagName, unit, visible: vis, cursorValue, cursor2Value, deltaMode, isDigital, isDerived, derivedType, seamOffset = 0, seamOffsetPct, onEditDerived, onDeleteDerived, onToggleVisible, onStyleChange, theme }) {
  const t = THEMES[theme];
  const hasCustomName = displayName !== tagName;
  const [showStylePicker, setShowStylePicker] = useState(false);
  const popoverRef = useRef(null);

  // Close popover on click-outside or Escape
  useEffect(() => {
    if (!showStylePicker) return;
    const handleClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowStylePicker(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setShowStylePicker(false);
    };
    // Delay so the opening click doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [showStylePicker]);

  const DASH_OPTIONS = [
    { value: "solid", label: "—", desc: "Solid" },
    { value: "dashed", label: "- -", desc: "Dashed" },
    { value: "dotted", label: "···", desc: "Dotted" },
    { value: "long_dash", label: "— —", desc: "Long Dash" },
    { value: "dash_dot", label: "— · —", desc: "Dash Dot" },
    { value: "dash_dot_dot", label: "— ·· —", desc: "Dash Dot Dot" },
    { value: "samples", label: "• • •", desc: "Samples Only" },
  ];
  const PALETTE = ["#7c8cf5","#f87171","#34d399","#f0b866","#a78bfa","#f472b6","#38bdf8","#fb923c","#a3e635","#818cf8","#2dd4bf","#f43f5e","#22d3ee","#84cc16","#f59e0b","#e879f9","#06b6d4","#10b981","#ef4444","#c084fc","#14b8a6","#f97316","#60a5fa","#eab308","#e8e4df","#9d97a0"];
  const seamDomain = inferSeamDomain(signal.values);
  const effectiveSeamPct = seamOffsetPct !== undefined ? clampSeamPercent(seamOffsetPct) : seamOffsetToPercent(seamOffset, seamDomain.span);

  return (
    <div
      draggable={!showStylePicker}
      onDragStart={(e) => {
        const interactive = e.target.closest?.("input, button, select, textarea");
        if (interactive || showStylePicker) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("text/plain", String(index));
        e.dataTransfer.effectAllowed = "move";
      }}
      style={{
        display: "flex", alignItems: "center", gap: 5, padding: "5px 7px", borderRadius: 8, marginBottom: 2,
        background: vis ? t.surface : "transparent",
        opacity: vis ? 1 : 0.3, transition: "all 0.15s",
        cursor: "grab", userSelect: "none",
        border: `1px solid transparent`,
        position: "relative", overflow: "visible",
      }}
    >
      {/* Visibility toggle */}
      <div onClick={(e) => { e.stopPropagation(); onToggleVisible(index); }} style={{
        width: 12, height: 12, borderRadius: 3, flexShrink: 0, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1.5px solid ${vis ? color : t.text4}`,
        background: vis ? color + "33" : "transparent",
        transition: "all 0.15s",
      }} title={vis ? "Hide signal" : "Show signal"}>
        {vis && <svg width="7" height="7" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      {/* Color/style picker trigger */}
      <div onClick={(e) => { e.stopPropagation(); setShowStylePicker(!showStylePicker); }} style={{
        width: 10, height: 10, borderRadius: 2, flexShrink: 0, cursor: "pointer",
        background: vis ? color : t.border,
        boxShadow: vis ? `0 0 4px ${color}44` : "none", transition: "all 0.15s",
      }} title="Change color/style" />
      <div onClick={(e) => { e.stopPropagation(); onToggleVisible(index); }} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
        <MarqueeText style={{ fontSize: 13, fontWeight: 600, color: vis ? t.text1 : t.text3, display: "flex", alignItems: "center", gap: 3 }}>
          {displayName}
          {unit && <span style={{ fontSize: 13, color: t.text3, fontWeight: 400, fontFamily: FONT_MONO, flexShrink: 0 }}>[{unit}]</span>}
          {isDigital && <span style={{ fontSize: 12, color: t.accent, background: t.accentDim, padding: "1px 4px", borderRadius: 3, fontWeight: 700, letterSpacing: 0.5, lineHeight: "10px", flexShrink: 0, fontFamily: FONT_DISPLAY }}>DIG</span>}
          {isDerived && <span style={{ fontSize: 10, color: t.warn, background: t.warn + "18", padding: "1px 4px", borderRadius: 3, fontWeight: 700, letterSpacing: 0.5, lineHeight: "10px", flexShrink: 0, fontFamily: FONT_MONO }}>{(derivedType || "derived").toUpperCase()}</span>}
        </MarqueeText>
        {hasCustomName && (
          <MarqueeText style={{ fontSize: 12, color: t.text4, fontFamily: FONT_MONO, marginTop: 1 }}>
            {tagName}
          </MarqueeText>
        )}
        {cursorValue !== undefined && cursorValue !== null && vis && (
          <div style={{ fontSize: 13, color: color, marginTop: 1, fontFamily: FONT_MONO }}>
            {cursorValue?.toFixed(3) ?? "—"}{unit ? ` ${unit}` : ""}
            {deltaMode && cursor2Value !== undefined && <span style={{ color: THEMES[theme].cursor2, marginLeft: 5, fontSize: 8 }}>Δ {cursor2Value !== null && cursorValue !== null ? (cursor2Value - cursorValue).toFixed(3) : "—"}{unit ? ` ${unit}` : ""}</span>}
          </div>
        )}
      </div>
      <Sparkline values={signal.values} color={color} width={36} height={14} />
      {/* Drag handle hint */}
      <svg width="8" height="10" viewBox="0 0 8 10" style={{ flexShrink: 0, opacity: 0.25 }}>
        <circle cx="2" cy="2" r="1" fill={t.text3}/><circle cx="6" cy="2" r="1" fill={t.text3}/>
        <circle cx="2" cy="5" r="1" fill={t.text3}/><circle cx="6" cy="5" r="1" fill={t.text3}/>
        <circle cx="2" cy="8" r="1" fill={t.text3}/><circle cx="6" cy="8" r="1" fill={t.text3}/>
      </svg>
      {/* Style picker popover */}
      {showStylePicker && vis && (
        <div ref={popoverRef} style={{
          position: "absolute", left: 4, top: "100%", zIndex: 50, marginTop: 2,
          background: t.panel, border: `1px solid ${t.border}`, borderRadius: 10,
          padding: 8, boxShadow: t.cardShadow, minWidth: 150,
        }}>
          <div style={{ fontSize: 12, color: t.text3, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, fontFamily: FONT_DISPLAY }}>Color</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>
            {PALETTE.map(c => (
              <div key={c} onClick={() => { onStyleChange(index, { color: c }); }} style={{
                width: 14, height: 14, borderRadius: 3, background: c, cursor: "pointer",
                border: c === color ? `2px solid ${t.text1}` : `1px solid ${t.border}`,
                boxShadow: c === color ? `0 0 6px ${c}66` : "none",
              }} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: t.text3, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, fontFamily: FONT_DISPLAY }}>Line Style</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 3 }}>
            {DASH_OPTIONS.map(d => (
              <button key={d.value} title={d.desc} onClick={() => { onStyleChange(index, { dash: d.value }); }} style={{
                padding: "3px 0", fontSize: 12, fontFamily: FONT_MONO, fontWeight: 600,
                cursor: "pointer", borderRadius: 6, border: `1px solid ${dash === d.value ? color + "66" : t.border}`,
                background: dash === d.value ? color + "18" : t.surface, color: dash === d.value ? color : t.text3,
              }}>{d.label}</button>
            ))}
          </div>
          <div onClick={() => { onStyleChange(index, { color: null, dash: null, seamOffset: 0, seamOffsetPct: 0 }); setShowStylePicker(false); }} style={{
            marginTop: 6, fontSize: 12, color: t.text4, cursor: "pointer", textAlign: "center", fontFamily: FONT_DISPLAY,
          }}>Reset to default</div>
          {!isDigital && (
            <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${t.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12, color: t.text3, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", fontFamily: FONT_DISPLAY }}>
                <span>Seam Shift</span>
                <span style={{ fontFamily: FONT_MONO, letterSpacing: 0, textTransform: "none", color: t.text2 }}>{effectiveSeamPct > 0 ? "+" : ""}{effectiveSeamPct.toFixed(2).replace(/\.00$/, "")}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="5"
                value={snapSeamPercent(effectiveSeamPct, 5)}
                onChange={(e) => onStyleChange(index, { seamOffsetPct: snapSeamPercent(parseFloat(e.target.value) || 0, 5) })}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                style={{ width: "100%" }}
                title="Virtual seam shift (-100% to +100%)"
              />
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                <input
                  type="number"
                  min="-100"
                  max="100"
                  step="0.01"
                  value={effectiveSeamPct}
                  onChange={(e) => onStyleChange(index, { seamOffsetPct: clampSeamPercent(parseFloat(e.target.value) || 0) })}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{ width: 64, background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 6, padding: "2px 6px", color: t.text1, fontSize: 12, fontFamily: FONT_MONO }}
                />
                <span style={{ fontSize: 11, color: t.text4, fontFamily: FONT_DISPLAY }}>typed: fine</span>
              </div>
            </div>
          )}
          {isDerived && (
            <>
              <button
                onClick={() => { setShowStylePicker(false); onEditDerived?.(index); }}
                style={{ marginTop: 6, width: "100%", padding: "4px 0", borderRadius: 7, border: `1px solid ${t.warn}44`, background: t.warn + "16", color: t.warn, fontSize: 11, fontFamily: FONT_DISPLAY, fontWeight: 700, cursor: "pointer" }}
              >
                Edit Derived Settings
              </button>
              <button
                onClick={() => { setShowStylePicker(false); onDeleteDerived?.(index); }}
                style={{ marginTop: 4, width: "100%", padding: "4px 0", borderRadius: 7, border: `1px solid ${t.red}55`, background: t.red + "14", color: t.red, fontSize: 11, fontFamily: FONT_DISPLAY, fontWeight: 700, cursor: "pointer" }}
              >
                Delete Derived
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
