import { FONT_DISPLAY } from "../constants/theme";

export default function ToolBtn({ children, onClick, active, activeColor, title, t, style: xs }) {
  const ac = activeColor || t.accent;
  return <button onClick={onClick} title={title} style={{ background: active ? `${ac}18` : t.surface, border: `1px solid ${active ? `${ac}33` : t.border}`, color: active ? ac : t.text2, borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: 0.5, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5, ...xs }}>{children}</button>;
}
