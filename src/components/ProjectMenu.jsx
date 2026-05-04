// src/components/ProjectMenu.jsx
import { useEffect, useRef } from "react";
import { FONT_MONO } from "../constants/theme";

const FILE_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="14,3 14,9 20,9" />
  </svg>
);

export default function ProjectMenu({
  open, setOpen, t,
  onLoadCsv, onLoadProject, onSaveProject, onSaveAndClear, onClear,
}) {
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  const fire = (handler) => () => { setOpen(false); handler?.(); };

  return (
    <span ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        id="btn-project-menu"
        title="Project…"
        onClick={() => setOpen(!open)}
        style={{
          width: 26, height: 26, padding: 0, borderRadius: 5,
          background: open ? t.surfaceHover : t.surface,
          border: `1px solid ${t.border}`, color: t.text2,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontFamily: FONT_MONO, transition: "background 0.12s",
        }}
      >
        {FILE_ICON}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute", top: 32, right: 0, minWidth: 240,
            background: t.panel, border: `1px solid ${t.border}`, borderRadius: 8,
            padding: 6, boxShadow: t.panelShadow || "0 12px 32px rgba(0,0,0,0.5)",
            zIndex: 50, fontFamily: FONT_MONO,
          }}
        >
          <SectionLabel t={t}>Open</SectionLabel>
          <MenuItem id="mi-load-csv"     t={t} onClick={fire(onLoadCsv)}>Load CSV…</MenuItem>
          <MenuItem id="mi-load-project" t={t} onClick={fire(onLoadProject)}>Load project (.tracelab)…</MenuItem>
          <Divider t={t} />
          <SectionLabel t={t}>Save</SectionLabel>
          <MenuItem id="mi-save-project"   t={t} onClick={fire(onSaveProject)}>Save project</MenuItem>
          <MenuItem id="mi-save-and-clear" t={t} onClick={fire(onSaveAndClear)}>Save &amp; clear</MenuItem>
          <Divider t={t} />
          <SectionLabel t={t}>Session</SectionLabel>
          <MenuItem id="mi-clear" t={t} danger onClick={fire(onClear)}>Clear trend…</MenuItem>
        </div>
      )}
    </span>
  );
}

function SectionLabel({ children, t }) {
  return (
    <div style={{
      fontSize: 9.5, letterSpacing: 1.5, color: t.text3,
      padding: "8px 10px 4px", textTransform: "uppercase",
    }}>{children}</div>
  );
}

function Divider({ t }) {
  return <div style={{ height: 1, background: t.border, margin: "4px 2px" }} />;
}

function MenuItem({ id, children, onClick, danger, t }) {
  return (
    <div
      id={id}
      role="menuitem"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } }}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 10px", borderRadius: 5,
        color: danger ? t.red : t.text2, fontSize: 11.5, cursor: "pointer",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = t.surfaceHover; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </div>
  );
}
