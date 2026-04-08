import { memo, useMemo } from "react";

const Sparkline = memo(function Sparkline({ values, color, width = 44, height = 16 }) {
  const pts = useMemo(() => {
    // Collect non-null values first so sparse/merged signals render correctly
    const nonNull = [];
    for (let i = 0; i < values.length; i++) { const v = values[i]; if (v !== null && !isNaN(v)) nonNull.push(v); }
    if (nonNull.length < 2) return null;
    const stride = Math.max(1, Math.floor(nonNull.length / width));
    let min = Infinity, max = -Infinity; const sampled = [];
    for (let i = 0; i < nonNull.length; i += stride) { const v = nonNull[i]; sampled.push(v); if (v < min) min = v; if (v > max) max = v; }
    if (sampled.length < 2) return null; const r = max - min || 1; const step = width / (sampled.length - 1);
    return sampled.map((v, i) => `${i * step},${height - ((v - min) / r) * height}`).join(" ");
  }, [values, width, height]);
  if (!pts) return null;
  return <svg width={width} height={height} style={{ display: "block" }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
});


export default Sparkline;
