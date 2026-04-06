import { THEMES, FONT_DISPLAY } from "../constants/theme";

export default function ThemeToggle({ theme, setTheme }) {
  const isDark = theme === "dark";
  return <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: THEMES[theme].text3, fontFamily: FONT_DISPLAY }}>{isDark ? "DARK" : "LIGHT"}</span><div onClick={() => setTheme(isDark ? "light" : "dark")} style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", background: isDark ? THEMES[theme].accent : THEMES[theme].border, position: "relative", transition: "background 0.2s", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.15)" }}><div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 2, left: isDark ? 20 : 2, transition: "left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} /></div></div>;
}