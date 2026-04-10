// src/components/PaneHeader.jsx
import { FONT_DISPLAY, FONT_MONO } from "../constants/theme";

export default function PaneHeader({
  pane, paneGc, splitRanges, onToggleSplit,
  overlayPickerGroup, setOverlayPickerGroup,
  addOverlay, setDerivedDialog,
  t, pi, showDerivedButton,
}) {
  if (!paneGc) return null;
  return (
    <div style={{ height: 22, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", background: paneGc + "12", borderBottom: `1px solid ${paneGc}22`, flexShrink: 0, overflow: "visible" }}>
      <div style={{ width: 5, height: 5, borderRadius: 2, background: paneGc, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: paneGc, fontFamily: FONT_DISPLAY, flexShrink: 0 }}>
        {pane.label}
      </span>
      <span style={{ fontSize: 12, color: t.text4, fontFamily: FONT_MONO, flexShrink: 0 }}>
        {pane.entries.length} tag{pane.entries.length !== 1 ? "s" : ""}
      </span>
      <span style={{ width: 1, height: 8, background: t.border, flexShrink: 0, marginLeft: 2, marginRight: 2 }} />
      {pane.entries.map((entry, ei) => (
        <span key={ei} style={{ display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: entry.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: entry.color, fontFamily: FONT_MONO, whiteSpace: "nowrap" }}>
            {entry.displayName}{entry.unit && <span style={{ fontWeight: 400, opacity: 0.6 }}> [{entry.unit}]</span>}
          </span>
        </span>
      ))}
      {showDerivedButton && (
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button
            id={pi === 0 ? "btn-add-derived-0" : undefined}
            onClick={() => setDerivedDialog({ open: true, mode: "create", groupIdx: pane.groupIdx, type: "equation", editIdx: null, initialDraft: null })}
            style={{ padding: "1px 6px", borderRadius: 4, border: `1px solid ${paneGc}66`, background: paneGc + "22", color: paneGc, fontSize: 11, fontWeight: 700, fontFamily: FONT_DISPLAY, cursor: "pointer" }}
            title="Add derived pen to this chart"
          >
            + Derived
          </button>
          <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <button
              id={pi === 0 ? "btn-add-reference-0" : undefined}
              onClick={() => setOverlayPickerGroup(prev => prev === pane.groupIdx ? null : pane.groupIdx)}
              style={{ padding: "1px 6px", borderRadius: 4, border: `1px solid ${paneGc}66`, background: paneGc + "22", color: paneGc, fontSize: 11, fontWeight: 700, fontFamily: FONT_DISPLAY, cursor: "pointer" }}
              title="Add reference overlay"
            >
              + Reference
            </button>
            {overlayPickerGroup === pane.groupIdx && (
              <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, minWidth: 140, background: t.panel, border: `1px solid ${t.border}`, borderRadius: 8, boxShadow: t.cardShadow, padding: 4, zIndex: 60 }}>
                {[
                  { label: "H Line", type: "line:y" },
                  { label: "H Band", type: "band:y" },
                  { label: "V Line", type: "line:x" },
                  { label: "V Band", type: "band:x" },
                ].map((opt) => (
                  <div
                    key={opt.type}
                    onClick={() => { addOverlay(pane.groupIdx, opt.type); setOverlayPickerGroup(null); }}
                    style={{ padding: "4px 6px", borderRadius: 6, fontSize: 11, color: t.text2, cursor: "pointer", fontFamily: FONT_DISPLAY }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </span>
        </span>
      )}
      {pane.entries.length > 1 && (
        <span
          onClick={onToggleSplit}
          title={splitRanges[pane.groupIdx] ? "Unify Y-axis (shared range)" : "Split Y-axes (per signal)"}
          style={{ flexShrink: 0, cursor: "pointer", fontSize: 13, fontWeight: 700, letterSpacing: 0.5, padding: "1px 5px", borderRadius: 3, fontFamily: FONT_DISPLAY, background: !splitRanges[pane.groupIdx] ? t.accent + "22" : "transparent", border: `1px solid ${!splitRanges[pane.groupIdx] ? t.accent + "44" : t.border}`, color: !splitRanges[pane.groupIdx] ? t.accent : t.text4, transition: "all 0.15s", marginLeft: showDerivedButton ? undefined : "auto" }}
        >
          {splitRanges[pane.groupIdx] ? "Y ≠" : "Y ="}
        </span>
      )}
    </div>
  );
}
