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

const EXTRA_SWATCHES = [
  "#111827", "#1f2937", "#374151", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db", "#f3f4f6",
  "#7f1d1d", "#991b1b", "#b91c1c", "#dc2626", "#ef4444", "#f87171",
  "#78350f", "#92400e", "#b45309", "#d97706", "#f59e0b", "#fbbf24",
  "#365314", "#3f6212", "#4d7c0f", "#65a30d", "#84cc16", "#a3e635",
  "#064e3b", "#065f46", "#047857", "#059669", "#10b981", "#34d399",
  "#164e63", "#155e75", "#0e7490", "#0891b2", "#06b6d4", "#22d3ee",
  "#1e3a8a", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd",
  "#312e81", "#4338ca", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc",
  "#581c87", "#6b21a8", "#7e22ce", "#9333ea", "#a855f7", "#c084fc",
  "#831843", "#9d174d", "#be185d", "#db2777", "#ec4899", "#f472b6",
];

export const EXTENDED_COLOR_SWATCHES = Array.from(new Set([
  ...OVERLAY_COLOR_SWATCHES,
  ...SIGNAL_SWATCHES,
  ...SIGNAL_PALETTE.dark,
  ...SIGNAL_PALETTE.light,
  ...EXTRA_SWATCHES,
]));

export function getAutoSignalColor(theme, idx) {
  const palette = SIGNAL_PALETTE[theme] || SIGNAL_PALETTE.dark;
  if (idx < 8) return palette[idx]; // preserve legacy/default first 8 pen colors.
  const remaining = palette.slice(8);
  const jump = 5;
  return remaining[((idx - 8) * jump) % remaining.length];
}
