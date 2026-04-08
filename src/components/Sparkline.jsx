import { memo, useMemo } from "react";

const Sparkline = memo(function Sparkline({ values, color, width = 44, height = 16 }) {
  const pts = useMemo(() => {
    // Keep sparkline rendering cheap for large datasets by sampling directly
    // from the source array and avoiding large intermediate allocations.
    const stride = Math.max(1, Math.floor(values.length / width));
    const sampled = [];
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < values.length; i += stride) {
      const v = values[i];
      if (v === null || Number.isNaN(v)) continue;
      sampled.push(v);
      if (v < min) min = v;
      if (v > max) max = v;
    }

    // Ensure the latest value is represented when stride skips the tail.
    const tail = values[values.length - 1];
    if (tail !== null && !Number.isNaN(tail) && sampled[sampled.length - 1] !== tail) {
      sampled.push(tail);
      if (tail < min) min = tail;
      if (tail > max) max = tail;
    }

    if (sampled.length < 2) return null;
    const r = max - min || 1;
    const step = width / (sampled.length - 1);
    return sampled.map((v, i) => `${i * step},${height - ((v - min) / r) * height}`).join(" ");
  }, [values, width, height]);
  if (!pts) return null;
  return <svg width={width} height={height} style={{ display: "block" }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
});


export default Sparkline;
