export const SIGNAL_PALETTE = {
  dark: [
    "#5eead4", "#f97316", "#a78bfa", "#22d3ee", "#f43f5e", "#84cc16", "#f59e0b", "#38bdf8",
    "#fb7185", "#2dd4bf", "#c084fc", "#eab308", "#60a5fa", "#10b981", "#f472b6", "#a3e635",
    "#f87171", "#67e8f9", "#facc15", "#818cf8", "#4ade80", "#fda4af", "#06b6d4", "#c4b5fd",
  ],
  light: [
    "#0f766e", "#c2410c", "#6d28d9", "#0369a1", "#be123c", "#3f6212", "#92400e", "#1d4ed8",
    "#b91c1c", "#0f766e", "#7e22ce", "#a16207", "#1e40af", "#047857", "#be185d", "#4d7c0f",
    "#dc2626", "#0e7490", "#ca8a04", "#4338ca", "#15803d", "#9f1239", "#0c4a6e", "#6b21a8",
  ],
};

export const SIGNAL_SWATCHES = [
  "#5eead4", "#f97316", "#a78bfa", "#22d3ee", "#f43f5e", "#84cc16", "#f59e0b", "#38bdf8",
  "#fb7185", "#2dd4bf", "#c084fc", "#eab308", "#60a5fa", "#10b981", "#f472b6", "#a3e635",
  "#f87171", "#67e8f9", "#facc15", "#818cf8", "#4ade80", "#fda4af", "#06b6d4", "#c4b5fd",
  "#e8e4df", "#9d97a0",
];

export const OVERLAY_COLOR_SWATCHES = ["#f59e0b", "#22d3ee", "#f43f5e", "#84cc16", "#a78bfa", "#f97316"];

export function getAutoSignalColor(theme, idx) {
  const palette = SIGNAL_PALETTE[theme] || SIGNAL_PALETTE.dark;
  const jump = 7; // spread neighboring assignments to avoid visual similarity.
  return palette[(idx * jump) % palette.length];
}
