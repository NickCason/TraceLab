import { useEffect, useRef, useState } from "react";
import { FONT_DISPLAY, FONT_MONO } from "../constants/theme";

export default function ColorPicker({ value, fallbackColor, swatches = [], onChange, t, title = "Choose color", width = "100%", height = 22, panelWidth = 160 }) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);
  const current = value || fallbackColor;
  const normalizedHex = (current || "").trim().toUpperCase();

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={popoverRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title={title}
        aria-label={title}
        style={{ width, height, borderRadius: 6, border: `1px solid ${t.inputBorder}`, background: current, cursor: "pointer" }}
      />
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 60, width: panelWidth, padding: 7, borderRadius: 8, border: `1px solid ${t.border}`, background: t.surface, boxShadow: t.cardShadow }}>
          <div style={{ fontSize: 10, color: t.text4, fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 5, fontFamily: FONT_DISPLAY }}>Palette</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, marginBottom: 7 }}>
            {swatches.map((sw) => (
              <button
                key={sw}
                type="button"
                onClick={() => { onChange(sw); setOpen(false); }}
                style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${normalizedHex === sw.toUpperCase() ? t.accent : t.inputBorder}`, background: sw, cursor: "pointer" }}
                title={sw}
              />
            ))}
          </div>
          <input
            value={current || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#RRGGBB"
            style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 5, color: t.text1, fontSize: 11, padding: "3px 6px", fontFamily: FONT_MONO }}
          />
        </div>
      )}
    </div>
  );
}
