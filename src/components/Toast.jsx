import { useEffect } from "react";
import { FONT_MONO } from "../constants/theme";

export default function Toast({ message, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  const bg = type === "success" ? "rgba(52,211,153,0.92)" : type === "error" ? "rgba(248,113,113,0.92)" : "rgba(124,140,245,0.92)";
  return <div style={{ position: "fixed", bottom: 24, right: 24, background: bg, color: "#fff", padding: "10px 22px", borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: FONT_MONO, zIndex: 9999, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", backdropFilter: "blur(8px)" }}>{message}</div>;
}
