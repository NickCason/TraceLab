import { memo, useMemo } from "react";

const Sparkline = memo(function Sparkline({ values, color, width = 44, height = 16 }) {
  const pts = useMemo(() => {
    // Keep sparkline rendering cheap for large datasets while still handling
    // sparse merged timelines (many nulls between valid values).
    const targetPoints = Math.max(8, Math.floor(width * 1.6));
    const span = values.length;
    const bucketSize = Math.max(1, Math.ceil(span / targetPoints));
    const sampled = [];
    let min = Infinity;
    let max = -Infinity;

    for (let bucketStart = 0; bucketStart < span; bucketStart += bucketSize) {
      const bucketEnd = Math.min(span, bucketStart + bucketSize);
      let firstIdx = -1;
      let lastIdx = -1;
      let minIdx = -1;
      let maxIdx = -1;
      let minVal = Infinity;
      let maxVal = -Infinity;

      for (let i = bucketStart; i < bucketEnd; i++) {
        const v = values[i];
        if (v === null || Number.isNaN(v)) continue;
        if (firstIdx === -1) firstIdx = i;
        lastIdx = i;
        if (v < minVal) {
          minVal = v;
          minIdx = i;
        }
        if (v > maxVal) {
          maxVal = v;
          maxIdx = i;
        }
      }

      if (firstIdx === -1) continue;
      const idxs = [firstIdx, minIdx, maxIdx, lastIdx]
        .filter((idx, i, arr) => idx !== -1 && arr.indexOf(idx) === i)
        .sort((a, b) => a - b);
      for (const idx of idxs) {
        const v = values[idx];
        sampled.push(v);
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }

    // Ensure the latest value is represented.
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
