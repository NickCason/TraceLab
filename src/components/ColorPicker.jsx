import { useEffect, useRef, useState } from "react";
import { FONT_DISPLAY, FONT_MONO } from "../constants/theme";

export default function ColorPicker({ value, fallbackColor, swatches = [], onChange, t, title = "Choose color", width = "100%", height = 22, panelWidth = 160 }) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [placement, setPlacement] = useState({ top: "calc(100% + 4px)", right: 0 });
  const current = value || fallbackColor;
  const normalizedHex = (current || "").trim().toUpperCase();

  useEffect(() => {
    if (!open) return;
    const positionPanel = () => {
      const triggerEl = triggerRef.current;
      const panelEl = panelRef.current;
      if (!triggerEl || !panelEl) return;
      const triggerRect = triggerEl.getBoundingClientRect();
      const panelRect = panelEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gap = 6;
      const spaceRight = vw - triggerRect.right;
      const spaceLeft = triggerRect.left;
      const spaceBottom = vh - triggerRect.bottom;
      const spaceTop = triggerRect.top;

      const next = {};
      if (spaceRight < panelRect.width + gap && spaceLeft > spaceRight) {
        next.right = "auto";
        next.left = 0;
      } else {
        next.left = "auto";
        next.right = 0;
      }

      if (spaceBottom < panelRect.height + gap && spaceTop > spaceBottom) {
        next.top = "auto";
        next.bottom = `calc(100% + ${gap}px)`;
      } else {
        next.bottom = "auto";
        next.top = `calc(100% + ${gap}px)`;
      }
      setPlacement(next);
    };

    const raf = requestAnimationFrame(positionPanel);
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
    };
  }, [open]);

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
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        title={title}
        aria-label={title}
        style={{ width, height, borderRadius: 6, border: `1px solid ${t.inputBorder}`, background: current, cursor: "pointer" }}
      />
      {open && (
        <div
          ref={panelRef}
          style={{
            position: "absolute",
            zIndex: 60,
            width: panelWidth,
            maxWidth: "min(220px, calc(100vw - 16px))",
            padding: 8,
            borderRadius: 9,
            border: `1px solid ${t.border}`,
            background: t.panel,
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
            ...placement,
          }}
        >
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
