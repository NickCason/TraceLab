export function buildDefaultExportPens(data) {
  const signals = data?.signals || [];
  return signals.map(() => true);
}

export function resolveExportWindow(timestamps = [], viewRange = [0, 0], exportRange = "all") {
  if (!Array.isArray(timestamps) || timestamps.length === 0) {
    return { ok: false, reason: "No samples available for export.", start: 0, end: 0 };
  }
  const len = timestamps.length;
  const [rawStart, rawEnd] = exportRange === "view" ? (viewRange || [0, 0]) : [0, len];
  const start = Math.max(0, Math.min(len, Number(rawStart) || 0));
  const end = Math.max(0, Math.min(len, Number(rawEnd) || 0));
  if (end <= start) {
    return { ok: false, reason: "Selected export range is empty.", start, end };
  }
  return { ok: true, start, end };
}
