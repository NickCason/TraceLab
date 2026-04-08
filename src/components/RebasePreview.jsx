import { useRef, useCallback, useMemo } from "react";
import { FONT_DISPLAY, FONT_MONO } from "../constants/theme";

const TIMELINE_H = 52; // px height of each dataset bar row
const WAVEFORM_H = 36; // px height of miniature waveform
const AXIS_H = 18;     // px for time axis at bottom
const DRAG_HANDLE_W = 12;

/**
 * Decimates values to at most maxPts points for waveform rendering.
 */
function decimateWaveform(values, maxPts = 200) {
  if (!values || values.length === 0) return [];
  const stride = Math.max(1, Math.floor(values.length / maxPts));
  const result = [];
  for (let i = 0; i < values.length; i += stride) {
    result.push(values[i]);
  }
  return result;
}

/**
 * Renders a miniature waveform polyline inside an SVG.
 */
function MiniWaveform({ values, width, height, color, fillColor }) {
  const pts = useMemo(() => decimateWaveform(values, 200), [values]);
  const validPts = pts.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (validPts.length < 2) return null;

  const minV = Math.min(...validPts);
  const maxV = Math.max(...validPts);
  const range = maxV - minV || 1;
  const pad = 3;

  const points = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * (width - 0);
    const y = v === null || v === undefined || isNaN(v)
      ? null
      : pad + ((maxV - v) / range) * (height - pad * 2);
    return { x, y };
  });

  // Build path segments (skip nulls)
  let d = "";
  let inSeg = false;
  for (const p of points) {
    if (p.y === null) { inSeg = false; continue; }
    if (!inSeg) { d += `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} `; inSeg = true; }
    else d += `L ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
  }

  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "hidden" }}>
      {fillColor && (
        <path
          d={`${d} V ${height} H 0 Z`}
          fill={fillColor}
          strokeWidth={0}
        />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * RebasePreview — shown only when two datasets have no time overlap.
 * Displays draggable timeline bars with miniature waveforms to help the user
 * align the imported dataset in time.
 *
 * Props:
 *   existingData   — the current primary dataset
 *   newData        — the newly parsed dataset (before offset applied)
 *   offset         — current offset in ms applied to newData
 *   onOffsetChange — (newOffsetMs: number) => void
 *   theme          — "dark" | "light"
 *   t              — theme token object
 */
export default function RebasePreview({ existingData, newData, offset, onOffsetChange, theme, t }) {
  const containerRef = useRef(null);
  const draggingRef = useRef(false);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);

  const exTs = existingData.timestamps;
  const newTs = newData.timestamps;

  // Compute the display range: union of existing and new (with offset) ranges
  const exStart = exTs[0];
  const exEnd = exTs[exTs.length - 1];
  const newStart = newTs[0] + offset;
  const newEnd = newTs[newTs.length - 1] + offset;

  const totalStart = Math.min(exStart, newStart);
  const totalEnd = Math.max(exEnd, newEnd);
  const totalRange = totalEnd - totalStart || 1;

  // Sample first signal from each dataset for waveform preview
  const exWaveformValues = existingData.signals[0]?.values;
  const newWaveformValues = newData.signals[0]?.values;

  const fmtMs = (ms) => {
    const abs = Math.abs(ms);
    const h = Math.floor(abs / 3600000);
    const m = Math.floor((abs % 3600000) / 60000);
    const s = Math.floor((abs % 60000) / 1000);
    const msRem = Math.floor(abs % 1000);
    const sign = ms < 0 ? "-" : ms > 0 ? "+" : "";
    if (h > 0) return `${sign}${h}h ${m}m ${s}.${String(msRem).padStart(3, "0")}s`;
    if (m > 0) return `${sign}${m}m ${s}.${String(msRem).padStart(3, "0")}s`;
    return `${sign}${s}.${String(msRem).padStart(3, "0")}s`;
  };

  const fmtTs = (ms) => {
    const d = new Date(ms);
    return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
  };

  // Drag handlers for the new-data bar
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    dragStartX.current = e.clientX;
    dragStartOffset.current = offset;

    const onMove = (ev) => {
      if (!draggingRef.current || !containerRef.current) return;
      const containerW = containerRef.current.clientWidth;
      const pxPerMs = containerW / totalRange;
      const deltaMs = (ev.clientX - dragStartX.current) / pxPerMs;
      onOffsetChange(Math.round(dragStartOffset.current + deltaMs));
    };
    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [offset, onOffsetChange, totalRange]);

  const barStyle = (start, end, color, draggable) => {
    const left = ((start - totalStart) / totalRange) * 100;
    const width = ((end - start) / totalRange) * 100;
    return {
      position: "absolute",
      left: `${left}%`,
      width: `${Math.max(width, 1)}%`,
      top: 4,
      height: TIMELINE_H - 8,
      background: color + "33",
      border: `2px solid ${color}`,
      borderRadius: 6,
      cursor: draggable ? "grab" : "default",
      boxSizing: "border-box",
    };
  };

  const waveformStyle = (start, end) => {
    const left = ((start - totalStart) / totalRange) * 100;
    const width = ((end - start) / totalRange) * 100;
    return {
      position: "absolute",
      left: `${left}%`,
      width: `${Math.max(width, 1)}%`,
      top: 0,
      height: WAVEFORM_H,
      overflow: "hidden",
      pointerEvents: "none",
    };
  };

  const btnStyle = {
    padding: "5px 10px", borderRadius: 6, fontSize: 11,
    fontFamily: FONT_DISPLAY, fontWeight: 600, cursor: "pointer",
    border: `1px solid ${t.border}`, background: t.surface, color: t.text2,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, color: t.warn, fontFamily: FONT_DISPLAY, fontWeight: 600, padding: "6px 10px", background: t.warn + "14", border: `1px solid ${t.warn}33`, borderRadius: 6 }}>
        Time ranges do not overlap — drag the Comparison bar to align the datasets in time.
      </div>

      {/* Dataset bars */}
      <div style={{ position: "relative", height: TIMELINE_H, userSelect: "none" }} ref={containerRef}>
        {/* Existing bar */}
        <div style={barStyle(exStart, exEnd, t.accent, false)} title="Original dataset (fixed)" />

        {/* New bar — draggable */}
        <div
          style={{ ...barStyle(newStart, newEnd, t.green, true), display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseDown={handleMouseDown}
          title="Drag to align the imported dataset"
        >
          <span style={{ fontSize: 10, color: t.green, fontFamily: FONT_DISPLAY, fontWeight: 700, pointerEvents: "none", overflow: "hidden", whiteSpace: "nowrap", padding: "0 4px" }}>
            ⟷ Comparison
          </span>
        </div>

        {/* Labels */}
        <div style={{ position: "absolute", left: 0, bottom: -16, fontSize: 10, color: t.accent, fontFamily: FONT_MONO, whiteSpace: "nowrap" }}>
          Original
        </div>
        <div style={{ position: "absolute", right: 0, bottom: -16, fontSize: 10, color: t.text4, fontFamily: FONT_MONO, whiteSpace: "nowrap" }}>
          {fmtTs(totalEnd)}
        </div>
      </div>

      {/* Waveform previews */}
      <div style={{ position: "relative", height: WAVEFORM_H, marginTop: 20, background: t.chart, borderRadius: 6, overflow: "hidden" }}>
        {/* Existing waveform */}
        {exWaveformValues && (
          <div style={waveformStyle(exStart, exEnd)}>
            <MiniWaveform
              values={exWaveformValues}
              width={300}
              height={WAVEFORM_H}
              color={t.accent}
              fillColor={t.accent + "18"}
            />
          </div>
        )}
        {/* New waveform */}
        {newWaveformValues && (
          <div style={waveformStyle(newStart, newEnd)}>
            <MiniWaveform
              values={newWaveformValues}
              width={300}
              height={WAVEFORM_H}
              color={t.green}
              fillColor={t.green + "18"}
            />
          </div>
        )}
        {/* Signal name labels */}
        <div style={{ position: "absolute", bottom: 2, left: 4, fontSize: 9, color: t.accent, fontFamily: FONT_MONO, opacity: 0.8 }}>
          {existingData.tagNames?.[0] || existingData.signals[0]?.name || "Signal 0"}
        </div>
        <div style={{ position: "absolute", bottom: 2, right: 4, fontSize: 9, color: t.green, fontFamily: FONT_MONO, opacity: 0.8 }}>
          {newData.tagNames?.[0] || newData.signals[0]?.name || "Signal 0"}
        </div>
      </div>

      {/* Quick-align buttons */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button style={btnStyle} onClick={() => onOffsetChange(exTs[0] - newTs[0])}>
          Align Starts
        </button>
        <button style={btnStyle} onClick={() => onOffsetChange(exTs[exTs.length - 1] - newTs[newTs.length - 1])}>
          Align Ends
        </button>
        <button style={btnStyle} onClick={() => onOffsetChange(0)}>
          Zero Offset
        </button>
      </div>

      {/* Offset readout */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: t.text3, fontFamily: FONT_DISPLAY }}>Offset:</span>
        <span style={{ fontSize: 13, color: t.text1, fontFamily: FONT_MONO, fontWeight: 700 }}>
          {fmtMs(offset)}
        </span>
        <span style={{ fontSize: 11, color: t.text4, fontFamily: FONT_MONO }}>({offset >= 0 ? "+" : ""}{offset} ms)</span>
        <input
          type="number"
          value={offset}
          onChange={e => onOffsetChange(parseInt(e.target.value) || 0)}
          style={{
            width: 120, padding: "4px 8px", borderRadius: 6, fontSize: 12,
            fontFamily: FONT_MONO, background: t.inputBg, border: `1px solid ${t.inputBorder}`,
            color: t.text1, outline: "none",
          }}
          placeholder="ms offset"
        />
      </div>

      {/* Time range summary */}
      <div style={{ fontSize: 11, color: t.text4, fontFamily: FONT_MONO, lineHeight: 1.6 }}>
        <div><span style={{ color: t.accent }}>Original:</span> {fmtTs(exStart)} → {fmtTs(exEnd)}</div>
        <div><span style={{ color: t.green }}>Comparison:</span> {fmtTs(newStart)} → {fmtTs(newEnd)}</div>
      </div>
    </div>
  );
}
