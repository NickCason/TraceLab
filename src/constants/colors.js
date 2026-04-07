export const SIGNAL_PALETTE = {
  dark: [
    "#8b8ff5", "#f87171", "#34d399", "#f0b866", "#a78bfa", "#f472b6", "#38bdf8", "#fb923c",
    "#5eead4", "#84cc16", "#f59e0b", "#2dd4bf", "#c084fc", "#eab308", "#60a5fa", "#10b981",
    "#f43f5e", "#67e8f9", "#facc15", "#818cf8", "#4ade80", "#fda4af", "#06b6d4", "#c4b5fd",
  ],
  light: [
    "#4f52b8", "#dc2626", "#059669", "#b56e10", "#6d28d9", "#db2777", "#0891b2", "#ea580c",
    "#0f766e", "#3f6212", "#92400e", "#1d4ed8", "#7e22ce", "#a16207", "#1e40af", "#047857",
    "#be123c", "#0e7490", "#ca8a04", "#4338ca", "#15803d", "#9f1239", "#0c4a6e", "#6b21a8",
  ],
};

export const SIGNAL_SWATCHES = [
  "#8b8ff5", "#f87171", "#34d399", "#f0b866", "#a78bfa", "#f472b6", "#38bdf8", "#fb923c",
  "#5eead4", "#84cc16", "#f59e0b", "#2dd4bf", "#c084fc", "#eab308", "#60a5fa", "#10b981",
  "#f43f5e", "#67e8f9", "#facc15", "#818cf8", "#4ade80", "#fda4af", "#06b6d4", "#c4b5fd",
  "#e8e4df", "#9d97a0",
];

export const OVERLAY_COLOR_SWATCHES = ["#f59e0b", "#22d3ee", "#f43f5e", "#84cc16", "#a78bfa", "#f97316"];

export function getAutoSignalColor(theme, idx) {
  const palette = SIGNAL_PALETTE[theme] || SIGNAL_PALETTE.dark;
  if (idx < 8) return palette[idx]; // preserve legacy/default first 8 pen colors.
  const remaining = palette.slice(8);
  const jump = 5;
  return remaining[((idx - 8) * jump) % remaining.length];
}
