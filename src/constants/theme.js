import { SIGNAL_PALETTE } from "./colors";

export const THEMES = {
  dark: {
    bg: "#161618", panel: "#1e1e21", chart: "#1a1a1d",
    surface: "rgba(255,255,255,0.05)", surfaceHover: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.12)", borderSubtle: "rgba(255,255,255,0.07)",
    text1: "#ece9e5", text2: "#b8b3ad", text3: "#918c86", text4: "#6d6862",
    grid: "rgba(255,255,255,0.05)",
    accent: "#8b8ff5", accentDim: "rgba(139,143,245,0.12)", accentBorder: "rgba(139,143,245,0.25)",
    cursor1: "#e5e3e0", cursor2: "#f0b866", cursor2Bg: "rgba(240,184,102,0.10)",
    isolate: "#a78bfa", isolateDim: "rgba(167,139,250,0.10)",
    green: "#34d399", greenDim: "rgba(52,211,153,0.10)", warn: "#f0b866", red: "#f87171",
    inputBg: "rgba(255,255,255,0.07)", inputBorder: "rgba(255,255,255,0.2)",
    dotStroke: "#1a1a1d",
    cardShadow: "0 2px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
    panelShadow: "1px 0 8px rgba(0,0,0,0.3)",
    sigColors: SIGNAL_PALETTE.dark,
  },
  light: {
    bg: "#e4e4e7", panel: "#ebebee", chart: "#f2f2f5",
    surface: "rgba(0,0,0,0.04)", surfaceHover: "rgba(0,0,0,0.07)",
    border: "rgba(0,0,0,0.14)", borderSubtle: "rgba(0,0,0,0.09)",
    text1: "#141418", text2: "#383846", text3: "#5d5d6e", text4: "#777789",
    grid: "rgba(0,0,0,0.07)",
    accent: "#4f52b8", accentDim: "rgba(79,82,184,0.10)", accentBorder: "rgba(79,82,184,0.20)",
    cursor1: "#18181b", cursor2: "#b56e10", cursor2Bg: "rgba(181,110,16,0.10)",
    isolate: "#6d28d9", isolateDim: "rgba(109,40,217,0.08)",
    green: "#059669", greenDim: "rgba(5,150,105,0.08)", warn: "#b56e10", red: "#dc2626",
    inputBg: "rgba(0,0,0,0.05)", inputBorder: "rgba(0,0,0,0.2)",
    dotStroke: "#f2f2f5",
    cardShadow: "0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)",
    panelShadow: "1px 0 6px rgba(0,0,0,0.06)",
    sigColors: SIGNAL_PALETTE.light,
  }
};

export const FONT_DISPLAY = "'Sora', 'Inter', system-ui, sans-serif";
export const FONT_MONO = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";
