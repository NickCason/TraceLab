// src/components/EmptyState.jsx
import ThemeToggle from "./ThemeToggle";
import Toast from "./Toast";
import { FONT_DISPLAY } from "../constants/theme";

export default function EmptyState({ t, theme, setTheme, fileInputRef, loadProject, handleFile, handleDrop, toast, setToast }) {
  return (
    <div
      style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg, fontFamily: FONT_DISPLAY, color: t.text1, position: "relative", overflow: "hidden" }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div style={{ position: "absolute", inset: 0, opacity: theme === "dark" ? 0.03 : 0.04, backgroundImage: `radial-gradient(${t.text3} 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
      <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1.5, fontFamily: FONT_DISPLAY }}>
            <span style={{ color: t.accent }}>Trace</span>
            <span style={{ color: t.text2 }}>Lab</span>
          </span>
        </div>
        <div style={{ fontSize: 13, color: t.text3, letterSpacing: 3, textTransform: "uppercase", marginBottom: 48, fontWeight: 500, fontFamily: FONT_DISPLAY }}>
          Industrial Trend Analysis
        </div>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{ border: `2px dashed ${t.accentBorder}`, borderRadius: 16, padding: "56px 72px", cursor: "pointer", transition: "all 0.25s", background: t.surface, boxShadow: t.cardShadow }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.background = t.surfaceHover; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = t.accentBorder; e.currentTarget.style.background = t.surface; }}
        >
          <div style={{ marginBottom: 16, opacity: 0.5 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>Drop Studio 5000 CSV or .tracelab project</div>
          <div style={{ fontSize: 13, color: t.text3 }}>or click to browse</div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.CSV,.tracelab"
          style={{ display: "none" }}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) { f.name.endsWith(".tracelab") ? loadProject(f) : handleFile(f); }
          }}
        />
        <div style={{ marginTop: 24 }}><ThemeToggle theme={theme} setTheme={setTheme} /></div>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
