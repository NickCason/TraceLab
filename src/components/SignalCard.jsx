import { useState, useRef, useEffect } from "react";
import { THEMES, FONT_DISPLAY, FONT_MONO } from "../constants/theme";
import { SIGNAL_SWATCHES } from "../constants/colors";
import Sparkline from "./Sparkline";
import MarqueeText from "./MarqueeText";
import ColorPicker from "./ColorPicker";
import { clampSeamPercent, inferSeamDomain, seamOffsetToPercent, snapSeamPercent } from "../utils/seamAdjustment";

export default function SignalCard({ index, signal, color, dash, strokeMode = "solid", thickness = 1.5, opacity = 0.92, displayName, tagName, unit, visible: vis, cursorValue, cursorValueIsInterpolated, cursor2Value, deltaMode, isDigital, isDerived, derivedType, seamOffset = 0, seamOffsetPct, onEditDerived, onDeleteDerived, onToggleVisible, onStyleChange, theme }) {
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
    { value: "hybrid_line_points", label: "— • —", desc: "Line + Points" },
  ];
  const PALETTE = SIGNAL_SWATCHES;
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
      <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center", flexShrink: 0 }}>
        {/* Visibility toggle */}
        <div onClick={(e) => { e.stopPropagation(); onToggleVisible(index); }} style={{
          width: 12, height: 12, borderRadius: 3, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1.5px solid ${vis ? color : t.text4}`,
          background: vis ? color + "33" : "transparent",
          transition: "all 0.15s",
        }} title={vis ? "Hide signal" : "Show signal"}>
          {vis && <svg width="7" height="7" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </div>
        {/* Color/style picker trigger */}
        <div onClick={(e) => { e.stopPropagation(); setShowStylePicker(!showStylePicker); }} style={{
          width: 16, height: 16, borderRadius: 4, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: vis ? color : t.text4,
          background: vis ? color + "14" : "transparent",
          border: `1px solid ${vis ? color + "44" : t.borderSubtle}`,
          boxShadow: vis ? `0 0 6px ${color}2a` : "none", transition: "all 0.15s",
        }} title="Signal settings">
          <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M19.14 12.94a7.88 7.88 0 0 0 .05-.94 7.88 7.88 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.63l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.36 7.36 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7.36 7.36 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.85a.5.5 0 0 0 .12.63l2.03 1.58a7.88 7.88 0 0 0-.05.94 7.88 7.88 0 0 0 .05.94L2.83 14.52a.5.5 0 0 0-.12.63l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.39 1.04.7 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.63l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
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
          <div style={{ fontSize: 13, color: color, marginTop: 1, fontFamily: FONT_MONO, opacity: cursorValueIsInterpolated ? 0.6 : 1 }}>
            {cursorValue?.toFixed(3) ?? "—"}{cursorValueIsInterpolated ? " ~" : ""}{unit ? ` ${unit}` : ""}
          </div>
        )}
      </div>
      <Sparkline values={signal.values} color={color} width={44} height={16} />
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
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <ColorPicker
              value={color}
              fallbackColor={PALETTE[index % PALETTE.length]}
              swatches={PALETTE}
              onChange={(nextColor) => onStyleChange(index, { color: nextColor })}
              t={t}
              title="Choose signal color"
              width={24}
              height={20}
              panelWidth={170}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, flex: 1 }}>
              {PALETTE.slice(0, 12).map(c => (
                <div key={c} onClick={() => { onStyleChange(index, { color: c }); }} style={{
                  width: 12, height: 12, borderRadius: 3, background: c, cursor: "pointer",
                  border: c === color ? `1.5px solid ${t.text1}` : `1px solid ${t.border}`,
                }} />
              ))}
            </div>
          </div>
          <div style={{ fontSize: 12, color: t.text3, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, fontFamily: FONT_DISPLAY }}>Line Style</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 3 }}>
            {DASH_OPTIONS.map(d => (
              <button key={d.value} title={d.desc} onClick={() => { onStyleChange(index, { dash: d.value, strokeMode: d.value }); }} style={{
                padding: "3px 0", fontSize: 12, fontFamily: FONT_MONO, fontWeight: 600,
                cursor: "pointer", borderRadius: 6, border: `1px solid ${(strokeMode || dash) === d.value ? color + "66" : t.border}`,
                background: (strokeMode || dash) === d.value ? color + "18" : t.surface, color: (strokeMode || dash) === d.value ? color : t.text3,
              }}>{d.label}</button>
            ))}
          </div>
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: t.text3, fontFamily: FONT_DISPLAY }}>
              <span>Thickness</span><span style={{ color: t.text2, fontFamily: FONT_MONO }}>{thickness.toFixed(1)}px</span>
            </div>
            <input type="range" min="0.8" max="5" step="0.2" value={thickness} onChange={(e) => onStyleChange(index, { thickness: parseFloat(e.target.value) || 1.5 })} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: t.text3, fontFamily: FONT_DISPLAY }}>
              <span>Opacity</span><span style={{ color: t.text2, fontFamily: FONT_MONO }}>{Math.round(opacity * 100)}%</span>
            </div>
            <input type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={(e) => onStyleChange(index, { opacity: Math.max(0.1, Math.min(1, parseFloat(e.target.value) || 0.92)) })} />
          </div>
          <div onClick={() => { onStyleChange(index, { color: null, dash: null, strokeMode: null, thickness: null, opacity: null, seamOffset: 0, seamOffsetPct: 0 }); setShowStylePicker(false); }} style={{
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
