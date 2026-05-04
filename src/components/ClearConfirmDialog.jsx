// src/components/ClearConfirmDialog.jsx
import { useEffect } from "react";
import { FONT_DISPLAY, FONT_MONO } from "../constants/theme";

export default function ClearConfirmDialog({
  open, trendName, t,
  onCancel, onDiscardAndClear, onSaveAndClear,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onCancel?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onCancel?.();
  };

  return (
    <div
      data-testid="dialog-backdrop"
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
    >
      <div
        id="dialog-clear-confirm"
        role="dialog"
        aria-modal="true"
        style={{
          minWidth: 380, maxWidth: 480, background: t.panel, color: t.text1,
          border: `1px solid ${t.border}`, borderRadius: 10, padding: "18px 20px 16px",
          boxShadow: t.panelShadow || "0 20px 60px rgba(0,0,0,0.6)",
          fontFamily: FONT_MONO,
        }}
      >
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
          Clear current trend?
        </div>
        <div style={{ color: t.text3, fontSize: 12, lineHeight: 1.5, marginBottom: 16 }}>
          This will close <b style={{ color: t.text1 }}>{trendName || "the current trend"}</b> and return to the home screen.
          You'll lose any unsaved groups, overlays, and metadata edits.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onCancel}
            style={btnStyle(t)}
          >Cancel</button>
          <button
            onClick={onDiscardAndClear}
            style={{ ...btnStyle(t), background: `${t.red}22`, borderColor: `${t.red}55`, color: t.red, fontWeight: 700 }}
          >Discard &amp; clear</button>
          <button
            autoFocus
            onClick={onSaveAndClear}
            style={{ ...btnStyle(t), background: `${t.green}22`, borderColor: `${t.green}55`, color: t.green, fontWeight: 700 }}
          >Save &amp; clear</button>
        </div>
      </div>
    </div>
  );
}

function btnStyle(t) {
  return {
    height: 30, padding: "0 14px", borderRadius: 6,
    background: t.surface, border: `1px solid ${t.border}`, color: t.text2,
    fontFamily: FONT_MONO, fontSize: 11, cursor: "pointer",
  };
}
