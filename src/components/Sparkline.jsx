import { memo, useMemo } from "react";

const Sparkline = memo(function Sparkline({ values, color, width = 44, height = 16 }) {
  const pts = useMemo(() => {
    const len = values.length; if (len < 2) return null;
    const stride = Math.max(1, Math.floor(len / width));
    let min = Infinity, max = -Infinity; const sampled = [];
    for (let i = 0; i < len; i += stride) { const v = values[i]; if (v !== null) { sampled.push(v); if (v < min) min = v; if (v > max) max = v; } }
    if (sampled.length < 2) return null; const r = max - min || 1; const step = width / (sampled.length - 1);
    return sampled.map((v, i) => `${i * step},${height - ((v - min) / r) * height}`).join(" ");
  }, [values, width, height]);
  if (!pts) return null;
  return <svg width={width} height={height} style={{ display: "block" }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
});


export default Sparkline;
