import { useState, useRef, useCallback, useEffect, useMemo, memo } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   THEME SYSTEM
   ═══════════════════════════════════════════════════════════════════════ */
const THEMES = {
  dark: {
    bg: "#161618", panel: "#1e1e21", chart: "#1a1a1d",
    surface: "rgba(255,255,255,0.05)", surfaceHover: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.09)", borderSubtle: "rgba(255,255,255,0.05)",
    text1: "#e5e3e0", text2: "#a09c98", text3: "#666360", text4: "#444240",
    grid: "rgba(255,255,255,0.05)",
    accent: "#8b8ff5", accentDim: "rgba(139,143,245,0.12)", accentBorder: "rgba(139,143,245,0.25)",
    cursor1: "#e5e3e0", cursor2: "#f0b866", cursor2Bg: "rgba(240,184,102,0.10)",
    isolate: "#a78bfa", isolateDim: "rgba(167,139,250,0.10)",
    green: "#34d399", greenDim: "rgba(52,211,153,0.10)", warn: "#f0b866", red: "#f87171",
    inputBg: "rgba(255,255,255,0.06)", inputBorder: "rgba(255,255,255,0.12)",
    dotStroke: "#1a1a1d",
    cardShadow: "0 2px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
    panelShadow: "1px 0 8px rgba(0,0,0,0.3)",
    sigColors: ["#8b8ff5","#f87171","#34d399","#f0b866","#a78bfa","#f472b6","#38bdf8","#fb923c","#a3e635","#818cf8","#2dd4bf","#f43f5e"],
  },
  light: {
    bg: "#e8e4e0", panel: "#efebe7", chart: "#e2dedA",
    surface: "rgba(0,0,0,0.04)", surfaceHover: "rgba(0,0,0,0.07)",
    border: "rgba(0,0,0,0.12)", borderSubtle: "rgba(0,0,0,0.06)",
    text1: "#1a1816", text2: "#4a4744", text3: "#7a7673", text4: "#a8a4a0",
    grid: "rgba(0,0,0,0.07)",
    accent: "#4f52b8", accentDim: "rgba(79,82,184,0.10)", accentBorder: "rgba(79,82,184,0.20)",
    cursor1: "#1a1816", cursor2: "#b56e10", cursor2Bg: "rgba(181,110,16,0.10)",
    isolate: "#6d28d9", isolateDim: "rgba(109,40,217,0.08)",
    green: "#059669", greenDim: "rgba(5,150,105,0.08)", warn: "#b56e10", red: "#dc2626",
    inputBg: "rgba(0,0,0,0.04)", inputBorder: "rgba(0,0,0,0.14)",
    dotStroke: "#e2deda",
    cardShadow: "0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)",
    panelShadow: "1px 0 6px rgba(0,0,0,0.06)",
    sigColors: ["#4f52b8","#dc2626","#059669","#b56e10","#6d28d9","#db2777","#0891b2","#ea580c","#65a30d","#4f46e5","#0d9488","#be123c"],
  }
};

/* ═══════════════════════════════════════════════════════════════════════
   GROUP SYSTEM — 8 groups (A-H), each signal belongs to exactly one
   ═══════════════════════════════════════════════════════════════════════ */
const GROUP_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const GROUP_COLORS_DARK = [
  "#7c8cf5",  // A: periwinkle  (pen 1)
  "#f87171",  // B: coral       (pen 2)
  "#34d399",  // C: emerald     (pen 3)
  "#f0b866",  // D: amber       (pen 4)
  "#a78bfa",  // E: violet      (pen 5)
  "#f472b6",  // F: pink        (pen 6)
  "#38bdf8",  // G: sky         (pen 7)
  "#fb923c",  // H: orange      (pen 8)
];
const GROUP_COLORS_LIGHT = [
  "#5b5fc7", "#dc2626", "#059669", "#c67d1a", "#7c3aed", "#db2777", "#0891b2", "#ea580c",
];
const MAX_GROUPS = 8; // groups numbered 1-8

const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap";
fontLink.rel = "stylesheet";
if (!document.querySelector('link[href*="Sora"]')) document.head.appendChild(fontLink);

const FONT_DISPLAY = "'Sora', 'Inter', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";

/* FIX #1: Safe min/max */
function arrayMinMax(arr, start = 0, end = arr.length) {
  let min = Infinity, max = -Infinity, count = 0, sum = 0;
  for (let i = start; i < end; i++) {
    const v = arr[i];
    if (v !== null && v !== undefined) { if (v < min) min = v; if (v > max) max = v; sum += v; count++; }
  }
  return count === 0 ? null : { min, max, count, sum };
}

/* ═══════════════════════════════════════════════════════════════════════
   CSV PARSER
   ═══════════════════════════════════════════════════════════════════════ */
function parseStudio5000CSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const meta = {}; let headerLine = -1, dataStartLine = -1, tagNames = [];
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i];
    if (line.startsWith("Controller Name:")) meta.controller = line.split(",")[1]?.replace(/"/g, "").trim();
    if (line.startsWith("Trend Name:")) meta.trendName = line.split(",")[1]?.replace(/"/g, "").trim();
    if (line.startsWith("Trend Tags:")) meta.tagCount = parseInt(line.split(",")[1]?.replace(/"/g, "").trim());
    if (line.startsWith("Sample Period:")) { const m = line.match(/"(\d+)"\s*(ms|s)?/); meta.samplePeriod = m ? parseInt(m[1]) : 5; meta.sampleUnit = m?.[2] || "ms"; }
    if (line.startsWith("Start Time:")) meta.startTime = line.split(",").slice(1).join(",").trim();
    if (line.startsWith("Stop Time:")) meta.stopTime = line.split(",").slice(1).join(",").trim();
    if (line.startsWith("Header:")) { headerLine = i; tagNames = line.split(",").map(s => s.replace(/"/g, "").trim()).slice(3); dataStartLine = i + 1; break; }
  }
  if (headerLine === -1) return null;
  const timestamps = []; const signals = tagNames.map(name => ({ name, values: [] }));
  for (let i = dataStartLine; i < lines.length; i++) {
    const line = lines[i].trim(); if (!line || !line.startsWith("Data")) continue;
    const parts = line.split(","); const dateStr = parts[1]?.trim(); const timeStr = parts[2]?.trim();
    if (!dateStr || !timeStr) continue;
    const [hms, msStr] = timeStr.split(";"); const dt = new Date(`${dateStr} ${hms}`); dt.setMilliseconds(parseInt(msStr || "0")); timestamps.push(dt.getTime());
    for (let j = 0; j < tagNames.length; j++) { const val = parseFloat(parts[j + 3]?.replace(/"/g, "").trim()); signals[j].values.push(isNaN(val) ? null : val); }
  }
  signals.forEach(sig => { const uniq = new Set(sig.values.filter(v => v !== null)); sig.isDigital = uniq.size <= 2 && [...uniq].every(v => v === 0 || v === 1 || Math.abs(v) < 0.01 || Math.abs(v - 1) < 0.01); });
  return { meta, timestamps, signals, tagNames };
}

/* ═══════════════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════════════ */
function fmtTime(ms) { const d = new Date(ms); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}.${String(d.getMilliseconds()).padStart(3,"0")}`; }
function fmtDate(ms) { const d = new Date(ms); return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`; }
function fmtDateISO(ms) { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function fmtTsClean(ms) { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}.${String(d.getMilliseconds()).padStart(3,"0")}`; }

function computeStats(values, start = 0, end = values.length) {
  const r = arrayMinMax(values, start, end);
  if (!r) return { min: "—", max: "—", avg: "—", range: "—" };
  return { min: r.min.toFixed(4), max: r.max.toFixed(4), avg: (r.sum / r.count).toFixed(4), range: (r.max - r.min).toFixed(4) };
}

/* ═══════════════════════════════════════════════════════════════════════
   DOWNLOAD — direct download, no confirmation overlay
   
   Uses synchronous a.click() with generous blob URL lifetime.
   Previous failures were caused by: (1) wrapping in setTimeout,
   (2) revoking blob URLs too early, (3) reusing/removing anchor elements.
   This version: fresh anchor each time, click synchronously, revoke
   after 60 seconds (plenty of time for even large files).
   ═══════════════════════════════════════════════════════════════════════ */
const _blobUrls = []; // track for cleanup

function downloadBlob(blob, filename, onComplete) {
  const url = URL.createObjectURL(blob);
  _blobUrls.push(url);

  // Clean up old blob URLs (keep last 3, revoke anything older)
  while (_blobUrls.length > 3) {
    const old = _blobUrls.shift();
    try { URL.revokeObjectURL(old); } catch(e) {}
  }

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();

  // Deferred cleanup — do NOT revoke quickly, give browser time
  setTimeout(function() {
    try { document.body.removeChild(a); } catch(e) {}
  }, 200);
  // Revoke after a long delay — browser needs the URL alive until download completes
  setTimeout(function() {
    try { URL.revokeObjectURL(url); } catch(e) {}
    const idx = _blobUrls.indexOf(url);
    if (idx >= 0) _blobUrls.splice(idx, 1);
  }, 60000);

  if (onComplete) onComplete();
}


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

function Toast({ message, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  const bg = type === "success" ? "rgba(52,211,153,0.92)" : type === "error" ? "rgba(248,113,113,0.92)" : "rgba(124,140,245,0.92)";
  return <div style={{ position: "fixed", bottom: 24, right: 24, background: bg, color: "#fff", padding: "10px 22px", borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: FONT_MONO, zIndex: 9999, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", backdropFilter: "blur(8px)" }}>{message}</div>;
}

/* ═══════════════════════════════════════════════════════════════════════
   CHART PANE — dual canvas + perf fixes
   ═══════════════════════════════════════════════════════════════════════ */
function ChartPane({ timestamps, signalEntries, cursorIdx, setCursorIdx, cursor2Idx, setCursor2Idx, deltaMode, viewRange, setViewRange, showTimeAxis, label, compact, theme, rebaseOffset, groupColor, showPills: pillsEnabled, showEdgeValues, unifyRange, deltaLocked, setDeltaLocked }) {
  const traceRef = useRef(null), cursorRef = useRef(null), containerRef = useRef(null), panStart = useRef(null), rafPending = useRef(null), pendingIdx = useRef(null);
  const [start, end] = viewRange; const t = THEMES[theme];

  const yRanges = useMemo(() => {
    // First pass: get raw min/max per signal (before any padding)
    const raw = signalEntries.map(({ signal }) => {
      const r = arrayMinMax(signal.values, start, end);
      if (!r) return null;
      return [r.min, r.max];
    });

    if (!unifyRange || signalEntries.length <= 1) {
      // Independent ranges with per-signal padding
      return raw.map(r => {
        if (!r) return [0, 1];
        let [mn, mx] = r;
        if (mn === mx) { mn -= 1; mx += 1; }
        const p = (mx - mn) * 0.08;
        return [mn - p, mx + p];
      });
    }

    // Unified: compute global range from raw values, THEN pad once
    let gMin = Infinity, gMax = -Infinity;
    raw.forEach(r => {
      if (!r) return;
      if (r[0] < gMin) gMin = r[0];
      if (r[1] > gMax) gMax = r[1];
    });
    if (gMin === Infinity) return raw.map(() => [0, 1]);
    if (gMin === gMax) { gMin -= 1; gMax += 1; }
    const p = (gMax - gMin) * 0.08;
    const unified = [gMin - p, gMax + p];
    return raw.map(() => unified);
  }, [signalEntries, start, end, unifyRange]);

  // Pre-compute max right-edge label width for dynamic padding
  const edgeLabelWidth = useMemo(() => {
    if (!showEdgeValues) return 0;
    // Estimate max label width from last visible values
    let maxW = 0;
    signalEntries.forEach(({ signal, unit }) => {
      for (let i = end - 1; i >= start; i--) {
        if (signal.values[i] !== null) {
          const str = signal.values[i].toFixed(2) + (unit ? " " + unit : "");
          // Approximate: 6.5px per char in bold 8px JetBrains Mono
          maxW = Math.max(maxW, str.length * 6.5 + 14);
          break;
        }
      }
    });
    return maxW;
  }, [showEdgeValues, signalEntries, start, end]);

  const getGeo = useCallback((c) => {
    const rect = c.parentElement.getBoundingClientRect(); const W = rect.width, H = rect.height;
    const rightPad = showEdgeValues ? Math.max(24, edgeLabelWidth + 16) : 20;
    const pad = { top: compact ? 6 : 14, bottom: showTimeAxis ? 28 : 6, left: 68, right: rightPad };
    return { W, H, pad, plotW: W - pad.left - pad.right, plotH: H - pad.top - pad.bottom };
  }, [compact, showTimeAxis, showEdgeValues, edgeLabelWidth]);

  const drawTraces = useCallback(() => {
    const canvas = traceRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); const dpr = window.devicePixelRatio || 1;
    const { W, H, pad, plotW, plotH } = getGeo(canvas);
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px"; ctx.scale(dpr, dpr);
    ctx.fillStyle = t.chart; ctx.fillRect(0, 0, W, H);

    // Group color indicator — subtle left bar
    if (groupColor) {
      ctx.fillStyle = groupColor; ctx.globalAlpha = 0.25;
      ctx.fillRect(0, 0, 3, H); ctx.globalAlpha = 1;
    }

    const nX = Math.max(2, Math.floor(plotW / 140)), nY = compact ? 3 : 5;
    ctx.strokeStyle = t.grid; ctx.lineWidth = 1;
    for (let i = 0; i <= nY; i++) { const y = pad.top + (plotH / nY) * i; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke(); }
    const sc = end - start;
    for (let i = 0; i <= nX; i++) {
      const x = pad.left + (plotW / nX) * i; ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + plotH); ctx.stroke();
      if (showTimeAxis) { const idx = start + Math.floor((sc / nX) * i); if (idx < timestamps.length) { ctx.fillStyle = t.text3; ctx.font = `11px ${FONT_MONO}`; ctx.textAlign = "center"; ctx.fillText(fmtTime(timestamps[idx] + rebaseOffset), x, pad.top + plotH + 16); } }
    }
    const stride = Math.max(1, Math.floor(sc / (plotW * 2)));
    signalEntries.forEach(({ signal, color, dash }, si) => {
      const [yMin, yMax] = yRanges[si]; const yR = yMax - yMin;
      ctx.strokeStyle = color; ctx.lineWidth = signal.isDigital ? 2 : 1.5; ctx.globalAlpha = 0.9;
      if (dash === "dashed") ctx.setLineDash([6, 4]);
      else if (dash === "dotted") ctx.setLineDash([2, 3]);
      else ctx.setLineDash([]);
      ctx.beginPath(); let started = false;
      for (let i = start; i < end; i += stride) {
        const v = signal.values[i]; if (v === null) { started = false; continue; }
        const x = pad.left + ((i - start) / sc) * plotW, y = pad.top + plotH - ((v - yMin) / yR) * plotH;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else if (signal.isDigital && i > start) { const pi2 = Math.max(start, i - stride); const pv = signal.values[pi2]; if (pv !== null) ctx.lineTo(x, pad.top + plotH - ((pv - yMin) / yR) * plotH); ctx.lineTo(x, y); }
        else ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (si === 0) { for (let i = 0; i <= nY; i++) { const val = yMin + ((nY - i) / nY) * yR; ctx.fillStyle = t.text3; ctx.font = `11px ${FONT_MONO}`; ctx.textAlign = "right"; ctx.fillText(val.toFixed(2), pad.left - 6, pad.top + (plotH / nY) * i + 3); } }
    });
    // Edge value indicators — arrows at left/right boundaries with values
    if (showEdgeValues) {
      const edgePillH = 14, edgeGap = 2;
      const drawEdge = (side) => {
        const isLeft = side === "left";
        const edgePills = [];
        signalEntries.forEach(({ signal, color, unit }, si) => {
          const [yMin, yMax] = yRanges[si]; const yR = yMax - yMin;
          // Find first/last non-null value in view
          let idx = -1;
          if (isLeft) { for (let i = start; i < end; i++) { if (signal.values[i] !== null) { idx = i; break; } } }
          else { for (let i = end - 1; i >= start; i--) { if (signal.values[i] !== null) { idx = i; break; } } }
          if (idx === -1) return;
          const v = signal.values[idx];
          const y = pad.top + plotH - ((v - yMin) / yR) * plotH;
          edgePills.push({ v, y, color, unit });
        });
        if (!edgePills.length) return;
        // Sort and layout to avoid overlaps
        edgePills.sort((a, b) => a.y - b.y);
        const placed = [];
        edgePills.forEach(p => {
          let py = p.y - edgePillH / 2;
          for (const prev of placed) { if (py < prev + edgePillH + edgeGap) py = prev + edgePillH + edgeGap; }
          py = Math.max(pad.top, Math.min(pad.top + plotH - edgePillH, py));
          p._py = py; placed.push(py);
        });
        // Draw
        ctx.textBaseline = "middle";
        edgePills.forEach(p => {
          const valStr = p.v.toFixed(2) + (p.unit ? " " + p.unit : "");
          ctx.font = `bold 10px ${FONT_MONO}`;
          const tw = ctx.measureText(valStr).width;
          const pw = tw + 14;
          const py = p._py;
          const ax = isLeft ? pad.left : pad.left + plotW; // arrow tip at plot edge
          // Left pills: arrow points right, pill sits to the left of plot edge
          // Right pills: arrow points left, pill sits to the right of plot edge
          const bx = isLeft ? ax - pw - 5 : ax + 7;

          // Arrow pointing INTO the plot
          ctx.fillStyle = p.color; ctx.globalAlpha = 0.5;
          ctx.beginPath();
          if (isLeft) {
            // Arrow points right (into plot)
            ctx.moveTo(ax, p.y); ctx.lineTo(ax - 4, p.y - 3); ctx.lineTo(ax - 4, p.y + 3);
          } else {
            // Arrow points left (into plot)
            ctx.moveTo(ax, p.y); ctx.lineTo(ax + 4, p.y - 3); ctx.lineTo(ax + 4, p.y + 3);
          }
          ctx.fill(); ctx.globalAlpha = 1;

          // Pill bg
          ctx.fillStyle = t.chart; ctx.globalAlpha = 0.85;
          ctx.fillRect(bx, py, pw, edgePillH);
          // Pill border
          ctx.strokeStyle = p.color; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
          ctx.strokeRect(bx, py, pw, edgePillH);
          ctx.globalAlpha = 1;
          // Value text
          ctx.fillStyle = p.color; ctx.globalAlpha = 0.9;
          ctx.textAlign = isLeft ? "right" : "left";
          ctx.fillText(valStr, isLeft ? bx + pw - 6 : bx + 6, py + edgePillH / 2 + 0.5);
          ctx.globalAlpha = 1;
        });
        ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
      };
      drawEdge("left");
      drawEdge("right");
    }
    ctx.strokeStyle = t.border; ctx.lineWidth = 1; ctx.strokeRect(pad.left, pad.top, plotW, plotH);
  }, [signalEntries, yRanges, start, end, timestamps, showTimeAxis, compact, label, t, rebaseOffset, getGeo, groupColor, showEdgeValues]);

  const drawCursors = useCallback(() => {
    const canvas = cursorRef.current; if (!canvas || !traceRef.current) return;
    const ctx = canvas.getContext("2d"); const dpr = window.devicePixelRatio || 1;
    const { W, H, pad, plotW, plotH } = getGeo(traceRef.current);
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px"; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H); const sc = end - start;

    const drawOne = (idx, col, alpha = 0.7, showPills = false) => {
      if (idx === null || idx < start || idx >= end) return;
      const x = pad.left + ((idx - start) / sc) * plotW;
      // Dashed vertical line
      ctx.strokeStyle = col; ctx.globalAlpha = alpha; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + plotH); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;

      const pills = []; // collect pill positions to avoid overlaps
      signalEntries.forEach(({ signal, color: c2, unit, displayName }, si) => {
        const v = signal.values[idx]; if (v === null) return;
        const [mn, mx] = yRanges[si]; const y = pad.top + plotH - ((v - mn) / (mx - mn)) * plotH;
        // Dot
        ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = t.dotStroke; ctx.lineWidth = 1.5; ctx.stroke();

        if (showPills) {
          pills.push({ v, y, color: c2, unit, displayName });
        }
      });

      // Draw value pills — only in non-delta mode on cursor1
      if (showPills && pills.length > 0) {
        ctx.textBaseline = "middle"; ctx.textAlign = "left";
        const pillH = 16, pillGap = 2, pillPad = 6;
        const onRight = x < pad.left + plotW * 0.7;

        // Sort pills by Y position so layout flows top-to-bottom
        const sorted = pills.map((p, pi) => ({ ...p, _origIdx: pi }));
        sorted.sort((a, b) => a.y - b.y);

        // Greedy layout: place each pill at its ideal Y, push down if overlapping
        const placed = [];
        sorted.forEach((p) => {
          let py = p.y - pillH / 2;
          // Push down past any previously placed pill it overlaps
          for (const prev of placed) {
            if (py < prev + pillH + pillGap) {
              py = prev + pillH + pillGap;
            }
          }
          // Clamp inside plot area
          py = Math.max(pad.top, Math.min(pad.top + plotH - pillH, py));
          p._py = py;
          placed.push(py);
        });

        // If pills overflowed bottom, push everything up to fit
        const bottommost = placed[placed.length - 1];
        if (bottommost + pillH > pad.top + plotH) {
          const overflow = (bottommost + pillH) - (pad.top + plotH);
          sorted.forEach(p => { p._py = Math.max(pad.top, p._py - overflow); });
        }

        // Re-separate after upward shift (compact from top)
        for (let i = 1; i < sorted.length; i++) {
          const minY = sorted[i - 1]._py + pillH + pillGap;
          if (sorted[i]._py < minY) sorted[i]._py = minY;
        }

        sorted.forEach((p) => {
          const valStr = p.v.toFixed(3) + (p.unit ? " " + p.unit : "");
          ctx.font = `bold 10px ${FONT_MONO}`;
          const tw = ctx.measureText(valStr).width;
          const pillW = tw + pillPad * 2 + 10;
          const px = onRight ? x + 10 : x - pillW - 10;
          const py = p._py;

          // Pill background
          ctx.fillStyle = t.chart; ctx.globalAlpha = 0.88;
          ctx.beginPath();
          ctx.moveTo(px + 4, py); ctx.lineTo(px + pillW - 4, py);
          ctx.quadraticCurveTo(px + pillW, py, px + pillW, py + 4);
          ctx.lineTo(px + pillW, py + pillH - 4);
          ctx.quadraticCurveTo(px + pillW, py + pillH, px + pillW - 4, py + pillH);
          ctx.lineTo(px + 4, py + pillH);
          ctx.quadraticCurveTo(px, py + pillH, px, py + pillH - 4);
          ctx.lineTo(px, py + 4);
          ctx.quadraticCurveTo(px, py, px + 4, py);
          ctx.fill();
          // Leader line from dot to pill
          ctx.strokeStyle = p.color; ctx.globalAlpha = 0.2; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(onRight ? x + 4 : x - 4, p.y);
          ctx.lineTo(onRight ? px : px + pillW, py + pillH / 2); ctx.stroke();
          // Pill border
          ctx.strokeStyle = p.color; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px + 4, py); ctx.lineTo(px + pillW - 4, py);
          ctx.quadraticCurveTo(px + pillW, py, px + pillW, py + 4);
          ctx.lineTo(px + pillW, py + pillH - 4);
          ctx.quadraticCurveTo(px + pillW, py + pillH, px + pillW - 4, py + pillH);
          ctx.lineTo(px + 4, py + pillH);
          ctx.quadraticCurveTo(px, py + pillH, px, py + pillH - 4);
          ctx.lineTo(px, py + 4);
          ctx.quadraticCurveTo(px, py, px + 4, py);
          ctx.stroke();
          ctx.globalAlpha = 1;
          // Color pip
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(px + pillPad + 2, py + pillH / 2, 2.5, 0, Math.PI * 2); ctx.fill();
          // Value text
          ctx.fillStyle = p.color; ctx.globalAlpha = 0.95;
          ctx.fillText(valStr, px + pillPad + 8, py + pillH / 2 + 0.5);
          ctx.globalAlpha = 1;
        });
        ctx.textBaseline = "alphabetic";
      }
    };

    drawOne(cursorIdx, t.cursor1, 0.7, pillsEnabled && !deltaMode);
    if (deltaMode && cursorIdx !== null) {
      const x1 = pad.left + ((cursorIdx - start) / sc) * plotW;

      if (cursor2Idx !== null) {
        const x2 = pad.left + ((cursor2Idx - start) / sc) * plotW;
        const xL = Math.min(x1, x2), xR = Math.max(x1, x2);

        // 1) Delta shading FIRST (behind everything)
        ctx.fillStyle = t.cursor2Bg; ctx.fillRect(xL, pad.top, xR - xL, plotH);

        // 2) Redraw both cursor lines + dots on top of shading
        drawOne(cursorIdx, t.cursor1, 0.7, false);
        drawOne(cursor2Idx, t.cursor2, 0.6, false);

        // 3) Cursor labels
        ctx.font = `bold 13px ${FONT_DISPLAY}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const lblY = pad.top - 1;
        // Label 1
        ctx.fillStyle = t.chart; ctx.globalAlpha = 0.9;
        ctx.fillRect(x1 - 10, lblY - 7, 20, 14);
        ctx.strokeStyle = t.cursor1; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
        ctx.strokeRect(x1 - 10, lblY - 7, 20, 14); ctx.globalAlpha = 1;
        ctx.fillStyle = t.cursor1; ctx.fillText("1", x1, lblY);
        // Label 2
        ctx.fillStyle = t.chart; ctx.globalAlpha = 0.9;
        ctx.fillRect(x2 - 10, lblY - 7, 20, 14);
        ctx.strokeStyle = t.cursor2; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
        ctx.strokeRect(x2 - 10, lblY - 7, 20, 14); ctx.globalAlpha = 1;
        ctx.fillStyle = t.cursor2; ctx.fillText("2", x2, lblY);
        ctx.textBaseline = "alphabetic";

        // Per-signal delta pills at both cursors (if pills enabled)
        if (pillsEnabled) {
          const pillH = 14, pillGap = 2, pillPad = 5;
          // Collect values at both cursors
          const c1Pills = [], c2Pills = [];
          signalEntries.forEach(({ signal, color: c2color, unit }, si) => {
            const v1 = signal.values[cursorIdx];
            const v2 = signal.values[cursor2Idx];
            const [mn, mx] = yRanges[si];
            if (v1 !== null) c1Pills.push({ v: v1, y: pad.top + plotH - ((v1 - mn) / (mx - mn)) * plotH, color: c2color, unit });
            if (v2 !== null) c2Pills.push({ v: v2, y: pad.top + plotH - ((v2 - mn) / (mx - mn)) * plotH, color: c2color, unit });
          });

          // Layout helper
          const layoutPills = (pills, anchorX, side) => {
            if (!pills.length) return;
            pills.sort((a, b) => a.y - b.y);
            const placed = [];
            pills.forEach(p => {
              let py = p.y - pillH / 2;
              for (const prev of placed) { if (py < prev + pillH + pillGap) py = prev + pillH + pillGap; }
              py = Math.max(pad.top + 14, Math.min(pad.top + plotH - pillH, py));
              p._py = py; placed.push(py);
            });
            ctx.textBaseline = "middle";
            pills.forEach(p => {
              const valStr = p.v.toFixed(3) + (p.unit ? " " + p.unit : "");
              ctx.font = `bold 9px ${FONT_MONO}`;
              const tw = ctx.measureText(valStr).width;
              const pw = tw + 12; // 6px padding each side
              const px = side === "left" ? anchorX - pw - 6 : anchorX + 6;
              const py = p._py;
              // Background
              ctx.fillStyle = t.chart; ctx.globalAlpha = 0.88;
              ctx.fillRect(px, py, pw, pillH);
              // Border
              ctx.strokeStyle = p.color; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
              ctx.strokeRect(px, py, pw, pillH); ctx.globalAlpha = 1;
              // Value text — centered in pill
              ctx.fillStyle = p.color; ctx.globalAlpha = 0.95;
              ctx.textAlign = "center";
              ctx.fillText(valStr, px + pw / 2, py + pillH / 2 + 0.5);
              ctx.globalAlpha = 1;
              ctx.textAlign = "left";
            });
            ctx.textBaseline = "alphabetic";
          };

          // Cursor1 pills on left side of line, cursor2 on right
          const c1Side = x1 <= x2 ? "left" : "right";
          const c2Side = x1 <= x2 ? "right" : "left";
          layoutPills(c1Pills, x1, c1Side);
          layoutPills(c2Pills, x2, c2Side);
        }

        // Midrange delta pill — centered between cursors with ΔT and per-signal ΔV
        const midX = (xL + xR) / 2;
        const deltaT = Math.abs(timestamps[cursor2Idx] - timestamps[cursorIdx]);
        // Build delta text lines
        const deltaLines = [];
        deltaLines.push(`ΔT: ${deltaT.toFixed(1)} ms`);
        signalEntries.forEach(({ signal, color: c2color, unit, displayName }, si) => {
          const v1 = signal.values[cursorIdx], v2 = signal.values[cursor2Idx];
          if (v1 !== null && v2 !== null) {
            deltaLines.push({ text: `Δ ${(v2 - v1).toFixed(3)}${unit ? " " + unit : ""}`, color: c2color });
          }
        });

        if (deltaLines.length > 0 && xR - xL > 50) {
          ctx.font = `bold 10px ${FONT_MONO}`;
          const lineH = 13;
          const maxTw = Math.max(...deltaLines.map(l => ctx.measureText(typeof l === "string" ? l : l.text).width));
          const boxW = maxTw + 16, boxH = deltaLines.length * lineH + 8;
          const bx = midX - boxW / 2, by = pad.top + plotH / 2 - boxH / 2;

          // Background
          ctx.fillStyle = t.chart; ctx.globalAlpha = 0.92;
          ctx.fillRect(bx, by, boxW, boxH);
          ctx.strokeStyle = t.cursor2; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
          ctx.strokeRect(bx, by, boxW, boxH); ctx.globalAlpha = 1;

          // Lines
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          deltaLines.forEach((line, li) => {
            const ly = by + 4 + lineH / 2 + li * lineH;
            if (typeof line === "string") {
              ctx.fillStyle = t.cursor2; ctx.globalAlpha = 0.9; ctx.font = `bold 10px ${FONT_MONO}`;
              ctx.fillText(line, midX, ly);
            } else {
              ctx.fillStyle = line.color; ctx.globalAlpha = 0.85; ctx.font = `bold 9px ${FONT_MONO}`;
              ctx.fillText(line.text, midX, ly);
            }
          });
          ctx.globalAlpha = 1; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        }
      } else {
        // cursor2 not placed yet — just show the "1" label on cursor1
        ctx.font = `bold 13px ${FONT_DISPLAY}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const lblY = pad.top - 1;
        ctx.fillStyle = t.chart; ctx.globalAlpha = 0.9;
        ctx.fillRect(x1 - 10, lblY - 7, 20, 14);
        ctx.strokeStyle = t.cursor1; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
        ctx.strokeRect(x1 - 10, lblY - 7, 20, 14); ctx.globalAlpha = 1;
        ctx.fillStyle = t.cursor1; ctx.fillText("1", x1, lblY);
        ctx.textBaseline = "alphabetic";
      }
    }
  }, [signalEntries, yRanges, cursorIdx, cursor2Idx, deltaMode, pillsEnabled, start, end, t, getGeo, timestamps]);

  useEffect(() => { drawTraces(); }, [drawTraces]);
  useEffect(() => { drawCursors(); }, [drawCursors]);
  useEffect(() => { const obs = new ResizeObserver(() => { drawTraces(); drawCursors(); }); if (containerRef.current) obs.observe(containerRef.current); return () => obs.disconnect(); }, [drawTraces, drawCursors]);

  const getIdx = useCallback((e) => { const c = traceRef.current; if (!c) return null; const r = c.getBoundingClientRect(); const pw = r.width - 88; const x = e.clientX - r.left - 68; const f = x / pw; if (f < 0 || f > 1) return null; return Math.max(start, Math.min(end - 1, Math.round(start + f * (end - start)))); }, [start, end]);

  const handleMouseMove = useCallback((e) => {
    if (panStart.current) {
      const r = traceRef.current.getBoundingClientRect(); const pw = r.width - 88;
      const dx = e.clientX - panStart.current.x; const s2 = panStart.current.end - panStart.current.start;
      const shift = Math.round((-dx / pw) * s2); let ns = panStart.current.start + shift, ne = panStart.current.end + shift;
      if (ns < 0) { ne -= ns; ns = 0; } if (ne > timestamps.length) { ns -= (ne - timestamps.length); ne = timestamps.length; }
      setViewRange([Math.max(0, ns), Math.min(timestamps.length, ne)]); return;
    }
    const idx = getIdx(e); if (idx === null) return;

    if (deltaMode) {
      // Delta mode mousemove: ONLY live-preview cursor2 after cursor1 is placed
      // and cursor2 hasn't been locked by a click yet. Never place cursor1 on move.
      if (cursorIdx !== null && !deltaLocked) {
        setCursor2Idx(idx);
      }
      // If neither cursor placed, or both locked — do nothing on hover
    } else {
      // Normal mode: update cursor position via rAF throttle
      pendingIdx.current = idx;
      if (!rafPending.current) {
        rafPending.current = requestAnimationFrame(() => {
          rafPending.current = null;
          if (pendingIdx.current !== null) setCursorIdx(pendingIdx.current);
        });
      }
    }
  }, [getIdx, deltaMode, deltaLocked, cursorIdx, setCursorIdx, setCursor2Idx, timestamps, setViewRange]);

  useEffect(() => () => { if (rafPending.current) cancelAnimationFrame(rafPending.current); }, []);

  const handleClick = useCallback((e) => {
    if (panStart.current) return;
    const idx = getIdx(e); if (idx === null) return;
    if (deltaMode) {
      if (cursorIdx === null) {
        // First click: place cursor 1, start live-previewing cursor 2
        setCursorIdx(idx);
        setCursor2Idx(null);
        setDeltaLocked(false);
      } else if (!deltaLocked) {
        // Second click: lock cursor 2 in place
        setCursor2Idx(idx);
        setDeltaLocked(true);
      } else {
        // Third click: reset — place new cursor 1, unlock cursor 2
        setCursorIdx(idx);
        setCursor2Idx(null);
        setDeltaLocked(false);
      }
    }
  }, [deltaMode, deltaLocked, cursorIdx, getIdx, setCursorIdx, setCursor2Idx, setDeltaLocked]);
  const handleWheel = useCallback((e) => { e.preventDefault(); const zoom = e.deltaY > 0 ? 1.15 : 0.85; const idx = getIdx(e); const center = idx !== null ? idx : Math.floor((start + end) / 2); const s2 = end - start; const nc = Math.max(50, Math.min(timestamps.length, Math.round(s2 * zoom))); const fr = (center - start) / s2; let ns = Math.round(center - fr * nc), ne = ns + nc; if (ns < 0) { ne -= ns; ns = 0; } if (ne > timestamps.length) { ns -= (ne - timestamps.length); ne = timestamps.length; } setViewRange([Math.max(0, ns), Math.min(timestamps.length, ne)]); }, [start, end, timestamps, getIdx, setViewRange]);
  const handleMouseDown = useCallback((e) => { if (e.button === 0 && !deltaMode) { panStart.current = { x: e.clientX, start, end }; e.preventDefault(); } if (e.button === 1) { panStart.current = { x: e.clientX, start, end }; e.preventDefault(); } }, [start, end, deltaMode]);
  const handleMouseUp = useCallback(() => { panStart.current = null; }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas ref={traceRef} data-export="trace" style={{ width: "100%", height: "100%", display: "block", position: "absolute", top: 0, left: 0 }} />
      <canvas ref={cursorRef} data-export="cursor" style={{ width: "100%", height: "100%", display: "block", position: "absolute", top: 0, left: 0, cursor: deltaMode ? "crosshair" : "grab" }}
        onMouseMove={handleMouseMove} onClick={handleClick} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   EXPORT PANEL
   ═══════════════════════════════════════════════════════════════════════ */
function ExportPanel({ data, metadata, viewRange, getDisplayName, theme, onToast, rebaseOffset }) {
  const t = THEMES[theme];
  const [exportPens, setExportPens] = useState(() => data.signals.map(() => true));
  const [rateMultiplier, setRateMultiplier] = useState(1);
  const [exportRange, setExportRange] = useState("all");
  const [showPreview, setShowPreview] = useState(false);
  const basePeriod = data.meta.samplePeriod || 5; const baseUnit = data.meta.sampleUnit || "ms";
  const multipliers = [1, 2, 3, 4, 5, 10, 20, 50, 100];
  const togglePen = (i) => setExportPens(p => { const n = [...p]; n[i] = !n[i]; return n; });
  const selPens = exportPens.map((v, i) => v ? i : -1).filter(i => i >= 0); const hasSel = selPens.length > 0;
  const [rs, re] = exportRange === "view" ? viewRange : [0, data.timestamps.length];
  const srcSamples = re - rs; const outSamples = Math.ceil(srcSamples / rateMultiplier); const effRate = basePeriod * rateMultiplier;
  const buildCSV = useCallback(() => {
    const L = []; L.push("# TraceLab Export", `# Source Trend: ${data.meta.trendName || "Unknown"}`, `# Controller: ${data.meta.controller || "Unknown"}`, `# Export Date: ${fmtTsClean(Date.now())}`, `# Original Sample Rate: ${basePeriod} ${baseUnit}`, `# Export Sample Rate: ${effRate} ${baseUnit} (${rateMultiplier}x)`);
    if (rebaseOffset !== 0) L.push(`# Timestamp Rebase: ${rebaseOffset >= 0 ? "+" : ""}${rebaseOffset} ms`);
    L.push(`# Time Range: ${fmtTsClean(data.timestamps[rs] + rebaseOffset)} to ${fmtTsClean(data.timestamps[Math.min(re, data.timestamps.length) - 1] + rebaseOffset)}`, `# Samples: ${outSamples.toLocaleString()} (from ${srcSamples.toLocaleString()} source)`, `# Tags: ${selPens.length} of ${data.signals.length}`, "#");
    selPens.forEach(i => { const m = metadata[i] || {}; const p = [`#   [${i}] ${data.tagNames[i]}`]; if (m.displayName) p.push(`(${m.displayName})`); if (m.unit) p.push(`[${m.unit}]`); if (m.description) p.push(`— ${m.description}`); L.push(p.join(" ")); });
    L.push("#", ""); const hdr = ["Sample", "Timestamp", "Elapsed_ms"]; selPens.forEach(i => hdr.push((metadata[i] || {}).displayName || data.tagNames[i])); L.push(hdr.join(","));
    const t0 = data.timestamps[rs] + rebaseOffset; let sn = 0;
    for (let i = rs; i < re; i += rateMultiplier) { const ts = data.timestamps[i] + rebaseOffset; const row = [sn, fmtTsClean(ts), (ts - t0).toFixed(1)]; selPens.forEach(si => { const v = data.signals[si].values[i]; row.push(v !== null ? v : ""); }); L.push(row.join(",")); sn++; }
    return L.join("\n");
  }, [data, metadata, selPens, rateMultiplier, rs, re, basePeriod, baseUnit, effRate, outSamples, srcSamples, rebaseOffset]);
  const previewLines = useMemo(() => { if (!showPreview) return []; const csv = buildCSV(); const all = csv.split("\n"); const cm = all.filter(l => l.startsWith("#")); const hi = all.findIndex(l => l.startsWith("Sample,")); if (hi === -1) return all.slice(0, 20); const r = []; r.push(...cm.slice(0, 9)); if (cm.length > 9) r.push(`  ... ${cm.length - 9} more`); r.push("", all[hi]); const dr = all.slice(hi + 1); r.push(...dr.slice(0, 5)); if (dr.length > 5) r.push(`  ... ${dr.length - 5} more rows`); return r; }, [showPreview, buildCSV]);
  const handleExport = () => { try { const csv = buildCSV(); const blob = new Blob([csv], { type: "text/csv" }); const filename = `${(data.meta.trendName || "export").replace(/\s+/g, "_").replace(/[^\w-]/g, "")}_${effRate}${baseUnit}_${fmtDateISO(Date.now())}.csv`; downloadBlob(blob, filename, () => onToast(`Exported ${outSamples.toLocaleString()} samples`, "success")); } catch (e) { onToast("Export failed: " + e.message, "error"); } };
  const ls = { fontSize: 13, color: t.text3, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600, marginBottom: 6, fontFamily: FONT_DISPLAY };
  const ss = { marginBottom: 14 };
  const btnA = (active, ac) => ({ padding: "4px 8px", fontSize: 12, fontFamily: FONT_MONO, cursor: "pointer", borderRadius: 8, fontWeight: 600, transition: "all 0.15s", border: `1px solid ${active ? ac + "44" : t.border}`, background: active ? ac + "18" : t.surface, color: active ? ac : t.text3 });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "100%" }}>
      <div style={ss}><div style={ls}>Sample Rate</div><div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{multipliers.map(m => <button key={m} onClick={() => setRateMultiplier(m)} style={btnA(rateMultiplier === m, t.green)}>{basePeriod * m}{baseUnit}</button>)}</div><div style={{ fontSize: 13, color: t.text4, marginTop: 4, fontFamily: FONT_MONO }}>{rateMultiplier > 1 ? `Every ${rateMultiplier}${rateMultiplier === 2 ? "nd" : rateMultiplier === 3 ? "rd" : "th"} sample (${rateMultiplier}× base)` : "Original rate — no decimation"}</div></div>
      <div style={ss}><div style={ls}>Range</div><div style={{ display: "flex", gap: 4 }}>{[["all", "Full Dataset"], ["view", "Current View"]].map(([v, l]) => <button key={v} onClick={() => setExportRange(v)} style={{ ...btnA(exportRange === v, t.accent), flex: 1, padding: "5px 0" }}>{l}</button>)}</div></div>
      <div style={{ ...ss, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><div style={ls}>Tags</div><div style={{ display: "flex", gap: 6 }}><button onClick={() => setExportPens(data.signals.map(() => true))} style={{ background: "none", border: "none", color: t.accent, fontSize: 13, cursor: "pointer", fontFamily: FONT_DISPLAY, fontWeight: 600 }}>ALL</button><button onClick={() => setExportPens(data.signals.map(() => false))} style={{ background: "none", border: "none", color: t.text3, fontSize: 13, cursor: "pointer", fontFamily: FONT_DISPLAY, fontWeight: 600 }}>NONE</button></div></div>
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 2 }}>{data.signals.map((sig, i) => { const a = exportPens[i]; const sc2 = t.sigColors[i % t.sigColors.length]; return <div key={i} onClick={() => togglePen(i)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 8, cursor: "pointer", background: a ? t.surface : "transparent", opacity: a ? 1 : 0.35, transition: "all 0.15s" }}><div style={{ width: 16, height: 16, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 700, border: `1.5px solid ${a ? sc2 : t.border}`, background: a ? sc2 + "22" : "transparent", color: a ? sc2 : "transparent" }}>{a ? "✓" : ""}</div><div style={{ fontSize: 12, color: a ? t.text1 : t.text3, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontFamily: FONT_MONO }}>{getDisplayName(i)}</div></div>; })}</div>
      </div>
      <div style={{ padding: "10px 12px", marginBottom: 8, borderRadius: 10, background: t.surface, border: `1px solid ${t.borderSubtle}`, boxShadow: t.cardShadow }}>{[["Output Rows", outSamples.toLocaleString(), t.text1], ["Columns", `3 + ${selPens.length} tags`, t.text1], ["Rate", `${effRate} ${baseUnit}`, t.green], ["Reduction", rateMultiplier > 1 ? `${((1 - 1 / rateMultiplier) * 100).toFixed(0)}% smaller` : "None", rateMultiplier > 1 ? t.warn : t.text4]].map(([l, v, c]) => <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}><span style={{ color: t.text3, fontFamily: FONT_DISPLAY, fontWeight: 500 }}>{l}</span><span style={{ color: c, fontWeight: 700, fontFamily: FONT_MONO }}>{v}</span></div>)}</div>
      <button onClick={() => setShowPreview(!showPreview)} style={{ width: "100%", padding: "5px 0", fontSize: 13, fontFamily: FONT_DISPLAY, cursor: "pointer", borderRadius: 8, fontWeight: 600, letterSpacing: 0.8, marginBottom: 4, border: `1px solid ${t.border}`, background: showPreview ? t.surface : "transparent", color: t.text3 }}>{showPreview ? "HIDE PREVIEW" : "SHOW PREVIEW"}</button>
      {showPreview && <div style={{ maxHeight: 160, overflow: "auto", marginBottom: 6, borderRadius: 8, background: theme === "dark" ? "#131314" : "#d9d5d1", border: `1px solid ${t.borderSubtle}`, padding: 8 }}>{previewLines.map((line, li) => <div key={li} style={{ fontSize: 12, fontFamily: FONT_MONO, whiteSpace: "pre", color: line.startsWith("#") ? t.text4 : line.startsWith("Sample") ? t.accent : line.startsWith("  ...") ? t.text3 : t.text2, lineHeight: "14px" }}>{line}</div>)}</div>}
      <button onClick={handleExport} disabled={!hasSel} style={{ width: "100%", padding: "10px 0", fontSize: 13, fontFamily: FONT_DISPLAY, cursor: hasSel ? "pointer" : "not-allowed", borderRadius: 10, fontWeight: 700, letterSpacing: 1.2, border: `1px solid ${hasSel ? t.green + "44" : t.border}`, background: hasSel ? t.green + "22" : t.surface, color: hasSel ? t.green : t.text4, flexShrink: 0 }}>EXPORT CSV</button>
    </div>
  );
}

function ThemeToggle({ theme, setTheme }) {
  const isDark = theme === "dark";
  return <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: THEMES[theme].text3, fontFamily: FONT_DISPLAY }}>{isDark ? "DARK" : "LIGHT"}</span><div onClick={() => setTheme(isDark ? "light" : "dark")} style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", background: isDark ? THEMES[theme].accent : THEMES[theme].border, position: "relative", transition: "background 0.2s", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.15)" }}><div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 2, left: isDark ? 20 : 2, transition: "left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} /></div></div>;
}

function ToolBtn({ children, onClick, active, activeColor, title, t, style: xs }) {
  const ac = activeColor || t.accent;
  return <button onClick={onClick} title={title} style={{ background: active ? `${ac}18` : t.surface, border: `1px solid ${active ? `${ac}33` : t.border}`, color: active ? ac : t.text2, borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: 0.5, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5, ...xs }}>{children}</button>;
}

/* ═══════════════════════════════════════════════════════════════════════
   SIGNAL CARD — draggable card within a group panel
   ═══════════════════════════════════════════════════════════════════════ */
function SignalCard({ index, signal, color, dash, displayName, tagName, unit, visible: vis, cursorValue, cursor2Value, deltaMode, isDigital, onToggleVisible, onStyleChange, theme }) {
  const t = THEMES[theme];
  const hasCustomName = displayName !== tagName;
  const [showStylePicker, setShowStylePicker] = useState(false);
  const DASH_OPTIONS = [
    { value: "solid", label: "—", desc: "Solid" },
    { value: "dashed", label: "- -", desc: "Dashed" },
    { value: "dotted", label: "···", desc: "Dotted" },
  ];
  const PALETTE = ["#7c8cf5","#f87171","#34d399","#f0b866","#a78bfa","#f472b6","#38bdf8","#fb923c","#a3e635","#818cf8","#2dd4bf","#f43f5e","#e8e4df","#9d97a0"];
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(index)); e.dataTransfer.effectAllowed = "move"; }}
      style={{
        display: "flex", alignItems: "center", gap: 5, padding: "5px 7px", borderRadius: 8, marginBottom: 2,
        background: vis ? t.surface : "transparent",
        opacity: vis ? 1 : 0.3, transition: "all 0.15s",
        cursor: "grab", userSelect: "none",
        border: `1px solid transparent`,
        position: "relative", overflow: "visible",
      }}
    >
      {/* Visibility toggle */}
      <div onClick={(e) => { e.stopPropagation(); onToggleVisible(index); }} style={{
        width: 12, height: 12, borderRadius: 3, flexShrink: 0, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1.5px solid ${vis ? color : t.text4}`,
        background: vis ? color + "33" : "transparent",
        transition: "all 0.15s",
      }} title={vis ? "Hide signal" : "Show signal"}>
        {vis && <svg width="7" height="7" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      {/* Color/style picker trigger */}
      <div onClick={(e) => { e.stopPropagation(); setShowStylePicker(!showStylePicker); }} style={{
        width: 10, height: 10, borderRadius: 2, flexShrink: 0, cursor: "pointer",
        background: vis ? color : t.border,
        boxShadow: vis ? `0 0 4px ${color}44` : "none", transition: "all 0.15s",
      }} title="Change color/style" />
      <div onClick={(e) => { e.stopPropagation(); onToggleVisible(index); }} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: vis ? t.text1 : t.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 3 }}>
          {displayName}
          {unit && <span style={{ fontSize: 13, color: t.text3, fontWeight: 400, fontFamily: FONT_MONO, flexShrink: 0 }}>[{unit}]</span>}
          {isDigital && <span style={{ fontSize: 12, color: t.accent, background: t.accentDim, padding: "1px 4px", borderRadius: 3, fontWeight: 700, letterSpacing: 0.5, lineHeight: "10px", flexShrink: 0, fontFamily: FONT_DISPLAY }}>DIG</span>}
        </div>
        {hasCustomName && (
          <div style={{ fontSize: 12, color: t.text4, fontFamily: FONT_MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
            {tagName}
          </div>
        )}
        {cursorValue !== undefined && cursorValue !== null && vis && (
          <div style={{ fontSize: 13, color: color, marginTop: 1, fontFamily: FONT_MONO }}>
            {cursorValue?.toFixed(6) ?? "—"}{unit ? ` ${unit}` : ""}
            {deltaMode && cursor2Value !== undefined && <span style={{ color: THEMES[theme].cursor2, marginLeft: 5, fontSize: 8 }}>Δ {cursor2Value !== null && cursorValue !== null ? (cursor2Value - cursorValue).toFixed(6) : "—"}{unit ? ` ${unit}` : ""}</span>}
          </div>
        )}
      </div>
      <Sparkline values={signal.values} color={color} width={36} height={14} />
      {/* Drag handle hint */}
      <svg width="8" height="10" viewBox="0 0 8 10" style={{ flexShrink: 0, opacity: 0.25 }}>
        <circle cx="2" cy="2" r="1" fill={t.text3}/><circle cx="6" cy="2" r="1" fill={t.text3}/>
        <circle cx="2" cy="5" r="1" fill={t.text3}/><circle cx="6" cy="5" r="1" fill={t.text3}/>
        <circle cx="2" cy="8" r="1" fill={t.text3}/><circle cx="6" cy="8" r="1" fill={t.text3}/>
      </svg>
      {/* Style picker popover */}
      {showStylePicker && vis && (
        <div onClick={e => e.stopPropagation()} style={{
          position: "absolute", left: 4, top: "100%", zIndex: 50, marginTop: 2,
          background: t.panel, border: `1px solid ${t.border}`, borderRadius: 10,
          padding: 8, boxShadow: t.cardShadow, minWidth: 130,
        }}>
          <div style={{ fontSize: 12, color: t.text3, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, fontFamily: FONT_DISPLAY }}>Color</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>
            {PALETTE.map(c => (
              <div key={c} onClick={() => { onStyleChange(index, { color: c }); }} style={{
                width: 14, height: 14, borderRadius: 3, background: c, cursor: "pointer",
                border: c === color ? `2px solid ${t.text1}` : `1px solid ${t.border}`,
                boxShadow: c === color ? `0 0 6px ${c}66` : "none",
              }} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: t.text3, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, fontFamily: FONT_DISPLAY }}>Line Style</div>
          <div style={{ display: "flex", gap: 3 }}>
            {DASH_OPTIONS.map(d => (
              <button key={d.value} onClick={() => { onStyleChange(index, { dash: d.value }); }} style={{
                flex: 1, padding: "3px 0", fontSize: 13, fontFamily: FONT_MONO, fontWeight: 600,
                cursor: "pointer", borderRadius: 6, border: `1px solid ${dash === d.value ? color + "66" : t.border}`,
                background: dash === d.value ? color + "18" : t.surface, color: dash === d.value ? color : t.text3,
              }}>{d.label}</button>
            ))}
          </div>
          <div onClick={() => { onStyleChange(index, { color: null, dash: null }); setShowStylePicker(false); }} style={{
            marginTop: 6, fontSize: 12, color: t.text4, cursor: "pointer", textAlign: "center", fontFamily: FONT_DISPLAY,
          }}>Reset to default</div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   GROUP PANEL — collapsible drop-target container for signals
   ═══════════════════════════════════════════════════════════════════════ */
function GroupPanel({ groupIdx, label, color, signals, sigColors, visible, groups, cursorValues, cursor2Values, deltaMode, metadata, data, onDrop, onToggleVisible, onToggleGroup, onSetGroupName, onStyleChange, signalStyles, theme, getDisplayName }) {
  const t = THEMES[theme];
  const [dragOver, setDragOver] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(label);
  const nameRef = useRef(null);

  // Signals in this group
  const members = [];
  if (data) {
    data.signals.forEach((sig, i) => {
      if (groups[i] === groupIdx) members.push(i);
    });
  }

  const isEmpty = members.length === 0;
  const allVisible = members.length > 0 && members.every(i => visible[i]);
  const noneVisible = members.length > 0 && members.every(i => !visible[i]);

  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop2 = (e) => {
    e.preventDefault(); setDragOver(false);
    const idx = parseInt(e.dataTransfer.getData("text/plain"));
    if (!isNaN(idx)) onDrop(idx, groupIdx);
  };

  const startEditing = (e) => {
    e.stopPropagation();
    setNameInput(label);
    setEditingName(true);
    setTimeout(() => nameRef.current?.select(), 0);
  };
  const commitName = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== `Group ${GROUP_LABELS[groupIdx - 1]}`) {
      onSetGroupName(groupIdx, trimmed);
    } else {
      onSetGroupName(groupIdx, null); // reset to default
    }
    setEditingName(false);
  };

  return (
    <div
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop2}
      style={{
        borderRadius: 8, marginBottom: 4, overflow: "visible",
        border: `1px solid ${dragOver ? color + "66" : isEmpty ? t.borderSubtle : color + "22"}`,
        background: dragOver ? color + "0c" : "transparent",
        transition: "all 0.15s",
        minHeight: isEmpty ? 0 : undefined,
      }}
    >
      {/* Panel header */}
      <div
        onClick={() => !isEmpty && !editingName && setCollapsed(!collapsed)}
        style={{
          display: "flex", alignItems: "center", gap: 5, padding: isEmpty ? "3px 8px" : "5px 8px",
          cursor: isEmpty ? "default" : "pointer", userSelect: "none",
          background: color + (isEmpty ? "06" : "10"),
          borderBottom: !collapsed && !isEmpty ? `1px solid ${color}15` : "none",
        }}
      >
        {/* Toggle-all visibility button */}
        {!isEmpty && (
          <div
            onClick={(e) => { e.stopPropagation(); onToggleGroup(groupIdx); }}
            title={allVisible ? "Hide all in group" : "Show all in group"}
            style={{
              width: 14, height: 14, borderRadius: 3, flexShrink: 0, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `1.5px solid ${allVisible ? color : noneVisible ? t.text4 : color + "88"}`,
              background: allVisible ? color + "33" : "transparent",
              transition: "all 0.15s",
            }}
          >
            {allVisible && <svg width="8" height="8" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            {!allVisible && !noneVisible && <div style={{ width: 6, height: 2, borderRadius: 1, background: color }} />}
          </div>
        )}
        {isEmpty && <div style={{ width: 7, height: 7, borderRadius: 2, flexShrink: 0, background: color, opacity: 0.3 }} />}
        {/* Editable label */}
        {editingName ? (
          <input
            ref={nameRef}
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") setEditingName(false); }}
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
              fontFamily: FONT_DISPLAY, color, background: t.inputBg, border: `1px solid ${color}44`,
              borderRadius: 4, padding: "1px 5px", outline: "none", minWidth: 0,
            }}
          />
        ) : (
          <div
            onDoubleClick={!isEmpty ? startEditing : undefined}
            title={!isEmpty ? "Double-click to rename" : undefined}
            style={{
              flex: 1, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
              fontFamily: FONT_DISPLAY,
              color: isEmpty ? t.text4 : color,
            }}
          >
            {label}
            {!isEmpty && <span style={{ fontWeight: 500, color: t.text3, letterSpacing: 0, textTransform: "none", marginLeft: 4 }}>({members.length})</span>}
          </div>
        )}
        {/* Collapse chevron */}
        {!isEmpty && (
          <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0, transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
            <polyline points="2,3 5,6 8,3" fill="none" stroke={t.text3} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>

      {/* Signal cards */}
      {!collapsed && !isEmpty && (
        <div style={{ padding: "3px 3px 2px" }}>
          {members.map(i => (
            <SignalCard
              key={i} index={i} signal={data.signals[i]}
              color={signalStyles[i]?.color || sigColors[i % sigColors.length]}
              dash={signalStyles[i]?.dash || "solid"}
              displayName={getDisplayName(i)}
              tagName={data.tagNames[i]}
              unit={(metadata[i] || {}).unit || ""}
              visible={visible[i]}
              cursorValue={cursorValues?.[i]}
              cursor2Value={cursor2Values?.[i]}
              deltaMode={deltaMode}
              isDigital={data.signals[i].isDigital}
              onToggleVisible={onToggleVisible}
              onStyleChange={onStyleChange}
              theme={theme}
            />
          ))}
        </div>
      )}

      {/* Empty drop hint */}
      {isEmpty && dragOver && (
        <div style={{ padding: "8px", fontSize: 13, color: color, textAlign: "center", fontFamily: FONT_DISPLAY, fontWeight: 500 }}>
          Drop here
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════════ */
export default function TraceLab() {
  const [data, setData] = useState(null);
  const [visible, setVisible] = useState([]);
  const [groups, setGroups] = useState([]);     // NEW: replaces isolated[]
  const [groupNames, setGroupNames] = useState({});  // custom group names: { 1: "Drives", 2: "Flags", ... }
  const [signalStyles, setSignalStyles] = useState({}); // per-signal overrides: { [idx]: { color, dash } }
  const [cursorIdx, setCursorIdx] = useState(null);
  const [cursor2Idx, setCursor2Idx] = useState(null);
  const [deltaMode, setDeltaMode] = useState(false);
  const [deltaLocked, setDeltaLocked] = useState(false); // cursor2 locked across all panes
  const [showPills, setShowPills] = useState(true);
  const [showEdgeValues, setShowEdgeValues] = useState(false);
  const [lockedRanges, setLockedRanges] = useState({}); // { [groupIdx]: true } — unified Y range per pane
  const [viewRange, setViewRange] = useState([0, 0]);
  const [activePanel, setActivePanel] = useState("signals");
  const [metadata, setMetadata] = useState({});
  const [editingMeta, setEditingMeta] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [rebaseOffset, setRebaseOffset] = useState(0);
  const [rebaseInput, setRebaseInput] = useState("");
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const projectInputRef = useRef(null);

  const t = THEMES[theme];
  const gc = theme === "dark" ? GROUP_COLORS_DARK : GROUP_COLORS_LIGHT;
  const showToast = useCallback((msg, type = "info") => setToast({ msg, type }), []);

  const handleFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseStudio5000CSV(e.target.result);
      if (parsed) {
        setData(parsed); setVisible(parsed.signals.map(() => true));
        setGroups(parsed.signals.map((_, i) => (i % MAX_GROUPS) + 1));
        setViewRange([0, parsed.timestamps.length]);
        setCursorIdx(null); setCursor2Idx(null);
        setMetadata({}); setSignalStyles({}); setRebaseOffset(0); setRebaseInput("");
        showToast(`Loaded ${parsed.tagNames.length} tags, ${parsed.timestamps.length.toLocaleString()} samples`, "success");
      } else showToast("Failed to parse CSV — unsupported format", "error");
    };
    reader.readAsText(file);
  }, [showToast]);

  useEffect(() => {
    fetch("/mnt/user-data/uploads/Registration.CSV").then(r => r.text()).then(text => {
      const parsed = parseStudio5000CSV(text);
      if (parsed) { setData(parsed); setVisible(parsed.signals.map(() => true)); setGroups(parsed.signals.map((_, i) => (i % MAX_GROUPS) + 1)); setViewRange([0, parsed.timestamps.length]); }
    }).catch(() => {});
  }, []);

  const handleDrop = useCallback((e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) { if (f.name.endsWith(".tracelab")) loadProject(f); else handleFile(f); } }, [handleFile]);

  const toggleSignal = (i) => setVisible(v => { const n = [...v]; n[i] = !n[i]; return n; });
  const setGroup = (i, g) => setGroups(p => { const n = [...p]; n[i] = g; return n; });
  const combineAll = () => setGroups(p => p.map(() => 1));
  const soloAll = () => setGroups(p => p.map((_, i) => (i % MAX_GROUPS) + 1));
  const isCombined = useMemo(() => groups.length > 0 && groups.every(g => g === groups[0]), [groups]);
  const resetZoom = () => { if (data) setViewRange([0, data.timestamps.length]); };
  const getDisplayName = (i) => metadata[i]?.displayName || data?.tagNames[i] || `Signal ${i}`;
  const getGroupLabel = (g) => groupNames[g] || `Group ${GROUP_LABELS[g - 1]}`;
  const toggleGroup = useCallback((groupIdx) => {
    if (!data) return;
    const members = []; data.signals.forEach((_, i) => { if (groups[i] === groupIdx) members.push(i); });
    if (!members.length) return;
    const allVisible = members.every(i => visible[i]);
    setVisible(v => { const n = [...v]; members.forEach(i => { n[i] = !allVisible; }); return n; });
  }, [data, groups, visible]);

  const cursorValues = useMemo(() => { if (!data || cursorIdx === null) return null; return data.signals.map(s => s.values[cursorIdx]); }, [data, cursorIdx]);
  const cursor2Values = useMemo(() => { if (!data || cursor2Idx === null) return null; return data.signals.map(s => s.values[cursor2Idx]); }, [data, cursor2Idx]);

  // Build chart panes from groups (1-8)
  const chartPanes = useMemo(() => {
    if (!data) return [];
    const sc = t.sigColors;
    const paneMap = new Map();

    data.signals.forEach((signal, i) => {
      if (!visible[i]) return;
      const g = groups[i] || 1;
      if (!paneMap.has(g)) paneMap.set(g, []);
      paneMap.get(g).push({
        signal, originalIndex: i, displayName: getDisplayName(i),
        unit: (metadata[i] || {}).unit || "",
        color: signalStyles[i]?.color || sc[i % sc.length],
        dash: signalStyles[i]?.dash || "solid",
      });
    });

    const panes = [];
    const sortedKeys = [...paneMap.keys()].sort((a, b) => a - b);
    for (const g of sortedKeys) {
      const entries = paneMap.get(g);
      if (!entries.length) continue;
      panes.push({ id: `group-${g}`, entries, label: getGroupLabel(g), groupIdx: g });
    }
    return panes;
  }, [data, visible, groups, metadata, groupNames, signalStyles, t.sigColors]);


  const applyRebase = useCallback(() => {
    if (!data || !rebaseInput.trim()) return;
    try { const target = new Date(rebaseInput.trim()); if (isNaN(target.getTime())) { showToast("Invalid date format", "error"); return; } setRebaseOffset(target.getTime() - data.timestamps[0]); showToast(`Rebased: start → ${fmtTsClean(target.getTime())}`, "success"); } catch { showToast("Invalid date format", "error"); }
  }, [data, rebaseInput, showToast]);
  const clearRebase = useCallback(() => { setRebaseOffset(0); setRebaseInput(""); showToast("Rebase cleared — original timestamps restored", "info"); }, [showToast]);

  const saveProject = useCallback(() => {
    if (!data) return;
    const project = { version: 2, data, visible, groups, groupNames, signalStyles, metadata, viewRange, rebaseOffset, deltaMode, showPills, showEdgeValues, lockedRanges };
    const blob = new Blob([JSON.stringify(project)], { type: "application/json" });
    const filename = `${(data.meta.trendName || "project").replace(/\s+/g, "_")}.tracelab`;
    downloadBlob(blob, filename, () => showToast("Project saved", "success"));
  }, [data, visible, groups, groupNames, signalStyles, metadata, viewRange, rebaseOffset, deltaMode, showPills, showEdgeValues, lockedRanges, showToast]);

  const loadProject = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const proj = JSON.parse(e.target.result);
        if (proj.version && proj.data) {
          proj.data.signals.forEach(sig => { const uniq = new Set(sig.values.filter(v => v !== null)); sig.isDigital = uniq.size <= 2 && [...uniq].every(v => v === 0 || v === 1 || Math.abs(v) < 0.01 || Math.abs(v - 1) < 0.01); });
          setData(proj.data); setVisible(proj.visible || proj.data.signals.map(() => true));
          // Backward compat: convert old formats to groups 1-8
          if (proj.groups) {
            // Migrate any group-0 values to group 1
            setGroups(proj.groups.map(g => g < 1 ? 1 : g));
          }
          else if (proj.isolated) setGroups(proj.isolated.map((iso, i) => iso ? (i % MAX_GROUPS) + 1 : 1));
          else setGroups(proj.data.signals.map((_, i) => (i % MAX_GROUPS) + 1));
          setMetadata(proj.metadata || {}); setGroupNames(proj.groupNames || {}); setSignalStyles(proj.signalStyles || {}); setViewRange(proj.viewRange || [0, proj.data.timestamps.length]);
          setRebaseOffset(proj.rebaseOffset || 0); setDeltaMode(proj.deltaMode || false);
          if (proj.showPills !== undefined) setShowPills(proj.showPills);
          if (proj.showEdgeValues !== undefined) setShowEdgeValues(proj.showEdgeValues);
          if (proj.lockedRanges) setLockedRanges(proj.lockedRanges);
          setCursorIdx(null); setCursor2Idx(null);
          showToast("Project loaded", "success");
        } else showToast("Invalid project file", "error");
      } catch { showToast("Failed to parse project file", "error"); }
    };
    reader.readAsText(file);
  }, [showToast]);

  const exportSnapshot = useCallback(() => {
    const traceCanvases = document.querySelectorAll('canvas[data-export="trace"]');
    if (!traceCanvases.length) { showToast("No chart to export", "error"); return; }
    const dpr = window.devicePixelRatio || 1;
    const LEGEND_H = 20 * dpr; // height per pane legend header
    const maxW = Math.max(...[...traceCanvases].map(c => c.width));
    const totalH = [...traceCanvases].reduce((s, c) => s + c.height, 0) + traceCanvases.length * LEGEND_H;
    const comp = document.createElement("canvas"); comp.width = maxW; comp.height = totalH;
    const ctx = comp.getContext("2d"); let y = 0;
    const gc = theme === "dark" ? GROUP_COLORS_DARK : GROUP_COLORS_LIGHT;

    [...traceCanvases].forEach((tc, pi) => {
      const pane = chartPanes[pi];
      // Draw legend header bar for this pane
      const paneColor = pane ? gc[pane.groupIdx - 1] || gc[0] : t.text2;
      ctx.fillStyle = t.chart; ctx.fillRect(0, y, maxW, LEGEND_H);
      // Group color accent bar
      ctx.fillStyle = paneColor; ctx.globalAlpha = 0.3;
      ctx.fillRect(0, y, maxW, LEGEND_H); ctx.globalAlpha = 1;
      // Separator line
      ctx.strokeStyle = paneColor; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y + LEGEND_H - 0.5); ctx.lineTo(maxW, y + LEGEND_H - 0.5); ctx.stroke(); ctx.globalAlpha = 1;

      let lx = 10 * dpr;
      const ly = y + LEGEND_H / 2;

      if (pane) {
        // Group label
        ctx.font = `bold ${11 * dpr}px ${FONT_DISPLAY}`;
        ctx.fillStyle = paneColor; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(pane.label.toUpperCase(), lx, ly);
        lx += ctx.measureText(pane.label.toUpperCase()).width + 12 * dpr;

        // Divider
        ctx.fillStyle = t.text4; ctx.globalAlpha = 0.4;
        ctx.fillRect(lx, y + 4 * dpr, 1 * dpr, LEGEND_H - 8 * dpr);
        ctx.globalAlpha = 1; lx += 8 * dpr;

        // Signal names
        pane.entries.forEach((entry) => {
          // Dot
          ctx.fillStyle = entry.color;
          ctx.beginPath(); ctx.arc(lx + 3 * dpr, ly, 3 * dpr, 0, Math.PI * 2); ctx.fill();
          lx += 10 * dpr;
          // Name
          ctx.font = `600 ${11 * dpr}px ${FONT_MONO}`;
          ctx.fillStyle = entry.color;
          const nameWithUnit = entry.displayName + (entry.unit ? ` [${entry.unit}]` : "");
          ctx.fillText(nameWithUnit, lx, ly);
          lx += ctx.measureText(nameWithUnit).width + 14 * dpr;
        });
      }
      ctx.textBaseline = "alphabetic";
      y += LEGEND_H;

      // Draw trace layer
      ctx.drawImage(tc, 0, y);
      // Composite cursor overlay
      const cursorCanvas = tc.parentElement?.querySelector('canvas[data-export="cursor"]');
      if (cursorCanvas) ctx.drawImage(cursorCanvas, 0, y);
      y += tc.height;
    });
    try {
      const dataUrl = comp.toDataURL("image/png");
      const byteString = atob(dataUrl.split(",")[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: "image/png" });
      const filename = `${(data?.meta?.trendName || "snapshot").replace(/\s+/g, "_")}_${fmtDateISO(Date.now())}.png`;
      downloadBlob(blob, filename, () => showToast("Chart snapshot saved as PNG", "success"));
    } catch (e) { showToast("Snapshot failed: " + e.message, "error"); }
  }, [data, showToast, chartPanes, theme, t]);

  if (!data) {
    return (
      <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg, fontFamily: FONT_DISPLAY, color: t.text1, position: "relative", overflow: "hidden" }} onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
        <div style={{ position: "absolute", inset: 0, opacity: theme === "dark" ? 0.03 : 0.04, backgroundImage: `radial-gradient(${t.text3} 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ marginBottom: 6 }}><span style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1.5, fontFamily: FONT_DISPLAY }}><span style={{ color: t.accent }}>Trace</span><span style={{ color: t.text2 }}>Lab</span></span></div>
          <div style={{ fontSize: 13, color: t.text3, letterSpacing: 3, textTransform: "uppercase", marginBottom: 48, fontWeight: 500, fontFamily: FONT_DISPLAY }}>Industrial Trend Analysis</div>
          <div onClick={() => fileInputRef.current?.click()} style={{ border: `2px dashed ${t.accentBorder}`, borderRadius: 16, padding: "56px 72px", cursor: "pointer", transition: "all 0.25s", background: t.surface, boxShadow: t.cardShadow }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.background = t.surfaceHover; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = t.accentBorder; e.currentTarget.style.background = t.surface; }}>
            <div style={{ marginBottom: 16, opacity: 0.5 }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" /></svg></div>
            <div style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>Drop Studio 5000 CSV or .tracelab project</div>
            <div style={{ fontSize: 13, color: t.text3 }}>or click to browse</div>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,.CSV,.tracelab" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { f.name.endsWith(".tracelab") ? loadProject(f) : handleFile(f); } }} />
          <div style={{ marginTop: 24 }}><ThemeToggle theme={theme} setTheme={setTheme} /></div>
        </div>
        {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      </div>
    );
  }

  const sc = t.sigColors;
  const getSignalColor = (i) => signalStyles[i]?.color || sc[i % sc.length];
  const tabSt = (active, accent) => ({ padding: "8px 12px", fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", background: "none", border: "none", borderBottom: `2px solid ${active ? (accent || t.accent) : "transparent"}`, color: active ? (accent || t.text1) : t.text3, transition: "all 0.15s", fontFamily: FONT_DISPLAY });

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: t.bg, fontFamily: FONT_MONO, color: t.text1, overflow: "hidden" }}>
      <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: `1px solid ${t.border}`, background: t.panel, flexShrink: 0, boxShadow: theme === "dark" ? "0 1px 8px rgba(0,0,0,0.3)" : "0 1px 4px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 800, letterSpacing: -0.5 }}><span style={{ color: t.accent }}>Trace</span><span style={{ color: t.text3 }}>Lab</span></div>
          <div style={{ width: 1, height: 22, background: t.border }} />
          <div style={{ fontSize: 13, color: t.text2, fontFamily: FONT_DISPLAY, fontWeight: 500 }}>{data.meta.trendName || "Untitled"}</div>
          <div style={{ fontSize: 12, color: t.text3, fontFamily: FONT_MONO }}>{data.signals.length} tags · {data.timestamps.length.toLocaleString()} samples · {data.meta.samplePeriod}{data.meta.sampleUnit}</div>
          {rebaseOffset !== 0 && <div style={{ fontSize: 12, color: t.warn, fontWeight: 700, letterSpacing: 1, padding: "2px 8px", borderRadius: 6, background: `${t.warn}18`, border: `1px solid ${t.warn}33`, fontFamily: FONT_DISPLAY }}>REBASED</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <div style={{ width: 1, height: 22, background: t.border, marginLeft: 4, marginRight: 4 }} />
          <ToolBtn onClick={() => { setDeltaMode(!deltaMode); setCursorIdx(null); setCursor2Idx(null); setDeltaLocked(false); }} active={deltaMode} activeColor={t.cursor2} t={t}>Δ Delta</ToolBtn>
          <ToolBtn onClick={() => setShowPills(!showPills)} active={showPills} activeColor={t.green} t={t} title="Toggle cursor value pills">Pills</ToolBtn>
          <ToolBtn onClick={() => setShowEdgeValues(!showEdgeValues)} active={showEdgeValues} activeColor={t.warn} t={t} title="Show entry/exit values at view edges">Edges</ToolBtn>
          <ToolBtn onClick={isCombined ? soloAll : combineAll} active={!isCombined} activeColor={t.isolate} t={t}>{isCombined ? "Solo All" : "Combine"}</ToolBtn>
          <ToolBtn onClick={resetZoom} t={t}>Fit</ToolBtn>
          <ToolBtn onClick={exportSnapshot} title="Save chart as PNG" t={t}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" /></svg></ToolBtn>
          <ToolBtn onClick={saveProject} title="Save project" t={t}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17,21 17,13 7,13 7,21" /><polyline points="7,3 7,8 15,8" /></svg></ToolBtn>
          <ToolBtn onClick={() => projectInputRef.current?.click()} title="Load project" t={t}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg></ToolBtn>
          <input ref={projectInputRef} type="file" accept=".tracelab" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) loadProject(e.target.files[0]); }} />
          <ToolBtn onClick={() => fileInputRef.current?.click()} t={t} style={{ background: t.accentDim, borderColor: `${t.accent}33`, color: t.accent }}>Load CSV</ToolBtn>
          <input ref={fileInputRef} type="file" accept=".csv,.CSV,.tracelab" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { f.name.endsWith(".tracelab") ? loadProject(f) : handleFile(f); } }} />
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ width: 280, flexShrink: 0, background: t.panel, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: t.panelShadow }}>
          <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${t.border}`, padding: "0 6px" }}>
            {["signals", "stats", "meta", "rebase", "export"].map(tab => <button key={tab} onClick={() => setActivePanel(tab)} style={tabSt(activePanel === tab, tab === "export" ? t.green : tab === "rebase" ? t.warn : null)}>{tab}</button>)}
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 10 }}>
            {/* ── Signals Tab — drag-and-drop group panels ── */}
            {activePanel === "signals" && (
              <div>
                {Array.from({ length: MAX_GROUPS }, (_, i) => {
                  const g = i + 1; // groups are 1-8
                  return (
                    <GroupPanel
                      key={g}
                      groupIdx={g}
                      label={getGroupLabel(g)}
                      color={gc[i]}
                      signals={data.signals}
                      sigColors={sc}
                      visible={visible}
                      groups={groups}
                      cursorValues={cursorValues}
                      cursor2Values={cursor2Values}
                      deltaMode={deltaMode}
                      metadata={metadata}
                      data={data}
                      signalStyles={signalStyles}
                      onDrop={(sigIdx, targetGroup) => setGroup(sigIdx, targetGroup)}
                      onToggleVisible={toggleSignal}
                      onToggleGroup={toggleGroup}
                      onSetGroupName={(g, name) => setGroupNames(prev => { const n = { ...prev }; if (name) n[g] = name; else delete n[g]; return n; })}
                      onStyleChange={(idx, updates) => setSignalStyles(prev => {
                        const cur = prev[idx] || {};
                        const next = { ...cur };
                        if (updates.color !== undefined) next.color = updates.color;
                        if (updates.dash !== undefined) next.dash = updates.dash;
                        // If both null, remove override entirely
                        if (!next.color && !next.dash) { const n = { ...prev }; delete n[idx]; return n; }
                        return { ...prev, [idx]: next };
                      })}
                      theme={theme}
                      getDisplayName={getDisplayName}
                    />
                  );
                })}
              </div>
            )}

            {activePanel === "stats" && data.signals.map((sig, i) => {
              if (!visible[i]) return null;
              const s = computeStats(sig.values, viewRange[0], viewRange[1]);
              return <div key={i} style={{ padding: "10px 12px", marginBottom: 6, borderRadius: 10, background: t.surface, borderLeft: `3px solid ${getSignalColor(i)}`, boxShadow: t.cardShadow }}><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.text1, fontFamily: FONT_DISPLAY }}>{getDisplayName(i)}{metadata[i]?.unit && <span style={{ fontWeight: 400, color: t.text3 }}> [{metadata[i].unit}]</span>}</div>{[["Min", s.min], ["Max", s.max], ["Avg", s.avg], ["Range", s.range]].map(([l, v]) => <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}><span style={{ color: t.text3, fontFamily: FONT_DISPLAY, fontWeight: 500 }}>{l}</span><span style={{ color: t.text2, fontFamily: FONT_MONO, fontWeight: 600 }}>{v}</span></div>)}</div>;
            })}

            {activePanel === "meta" && data.signals.map((sig, i) => {
              const m = metadata[i] || {}; const editing = editingMeta === i;
              const UNIT_PRESETS = [
                { label: "°F", value: "°F" }, { label: "°C", value: "°C" }, { label: "K", value: "K" },
                { label: "mm", value: "mm" }, { label: "cm", value: "cm" }, { label: "m", value: "m" }, { label: "in", value: "in" }, { label: "ft", value: "ft" },
                { label: "mm/s", value: "mm/s" }, { label: "m/s", value: "m/s" }, { label: "ft/min", value: "ft/min" }, { label: "RPM", value: "RPM" },
                { label: "psi", value: "psi" }, { label: "bar", value: "bar" }, { label: "kPa", value: "kPa" }, { label: "Pa", value: "Pa" },
                { label: "mA", value: "mA" }, { label: "A", value: "A" }, { label: "V", value: "V" }, { label: "mV", value: "mV" }, { label: "kW", value: "kW" }, { label: "W", value: "W" }, { label: "Ω", value: "Ω" },
                { label: "Hz", value: "Hz" }, { label: "kHz", value: "kHz" },
                { label: "ms", value: "ms" }, { label: "s", value: "s" }, { label: "min", value: "min" },
                { label: "kg", value: "kg" }, { label: "g", value: "g" }, { label: "lb", value: "lb" }, { label: "N", value: "N" }, { label: "N·m", value: "N·m" },
                { label: "L/min", value: "L/min" }, { label: "GPM", value: "GPM" },
                { label: "%", value: "%" }, { label: "°", value: "°" }, { label: "rad", value: "rad" },
                { label: "counts", value: "counts" }, { label: "pulses", value: "pulses" }, { label: "bool", value: "bool" },
              ];
              return <div key={i} style={{ padding: "10px 12px", marginBottom: 6, borderRadius: 10, background: t.surface, borderLeft: `3px solid ${getSignalColor(i)}`, boxShadow: t.cardShadow }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.text1, fontFamily: FONT_DISPLAY }}>{sig.name}</div>
                  <button onClick={() => setEditingMeta(editing ? null : i)} style={{ background: "none", border: "none", color: t.accent, fontSize: 13, cursor: "pointer", fontFamily: FONT_DISPLAY, fontWeight: 600 }}>{editing ? "DONE" : "EDIT"}</button>
                </div>
                {editing ? <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {["displayName", "description"].map(field => <input key={field} placeholder={field === "displayName" ? "Display Name" : "Description"} value={m[field] || ""} onChange={e => setMetadata(prev => ({ ...prev, [i]: { ...prev[i], [field]: e.target.value } }))} style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: "5px 8px", color: t.text1, fontSize: 12, fontFamily: FONT_MONO, outline: "none" }} />)}
                  {/* Unit input with symbol dropdown */}
                  <div style={{ display: "flex", gap: 3, alignItems: "stretch" }}>
                    <input placeholder="Unit" value={m.unit || ""} onChange={e => setMetadata(prev => ({ ...prev, [i]: { ...prev[i], unit: e.target.value } }))} style={{ flex: 1, background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: "5px 8px", color: t.text1, fontSize: 12, fontFamily: FONT_MONO, outline: "none", minWidth: 0 }} />
                    <select
                      value=""
                      onChange={e => { if (e.target.value) setMetadata(prev => ({ ...prev, [i]: { ...prev[i], unit: e.target.value } })); }}
                      style={{ width: 36, background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, color: t.text2, fontSize: 12, fontFamily: FONT_MONO, cursor: "pointer", outline: "none", padding: "0 4px", appearance: "none", textAlign: "center" }}
                      title="Insert unit symbol"
                    >
                      <option value="" disabled>⌄</option>
                      <optgroup label="Temperature">{UNIT_PRESETS.filter(u => ["°F","°C","K"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                      <optgroup label="Length">{UNIT_PRESETS.filter(u => ["mm","cm","m","in","ft"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                      <optgroup label="Speed">{UNIT_PRESETS.filter(u => ["mm/s","m/s","ft/min","RPM"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                      <optgroup label="Pressure">{UNIT_PRESETS.filter(u => ["psi","bar","kPa","Pa"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                      <optgroup label="Electrical">{UNIT_PRESETS.filter(u => ["mA","A","V","mV","kW","W","Ω","Hz","kHz"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                      <optgroup label="Time">{UNIT_PRESETS.filter(u => ["ms","s","min"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                      <optgroup label="Mass / Force">{UNIT_PRESETS.filter(u => ["kg","g","lb","N","N·m"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                      <optgroup label="Flow">{UNIT_PRESETS.filter(u => ["L/min","GPM"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                      <optgroup label="Other">{UNIT_PRESETS.filter(u => ["%","°","rad","counts","pulses","bool"].includes(u.value)).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</optgroup>
                    </select>
                  </div>
                </div> : <div style={{ fontSize: 12, color: t.text3, fontFamily: FONT_DISPLAY }}>{m.displayName && <div>Name: <span style={{ color: t.text2 }}>{m.displayName}</span></div>}{m.unit && <div>Unit: <span style={{ color: t.text2 }}>{m.unit}</span></div>}{m.description && <div style={{ marginTop: 2 }}>{m.description}</div>}{!m.displayName && !m.unit && !m.description && <div style={{ fontStyle: "italic" }}>No metadata</div>}</div>}
              </div>;
            })}

            {activePanel === "rebase" && <div>
              <div style={{ fontSize: 13, color: t.text3, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600, marginBottom: 10, fontFamily: FONT_DISPLAY }}>Timestamp Rebase</div>
              <div style={{ fontSize: 12, color: t.text2, marginBottom: 10, fontFamily: FONT_DISPLAY, lineHeight: 1.5 }}>Redefine the start time. All timestamps shift uniformly.</div>
              <div style={{ fontSize: 12, color: t.text3, marginBottom: 6, fontFamily: FONT_MONO }}>Original start: <span style={{ color: t.text1, fontWeight: 600 }}>{fmtTsClean(data.timestamps[0])}</span></div>
              {rebaseOffset !== 0 && <div style={{ fontSize: 12, color: t.warn, marginBottom: 6, fontFamily: FONT_MONO }}>Current start: <span style={{ fontWeight: 700 }}>{fmtTsClean(data.timestamps[0] + rebaseOffset)}</span></div>}
              <div style={{ marginBottom: 10 }}><div style={{ fontSize: 13, color: t.text3, marginBottom: 4, fontFamily: FONT_DISPLAY }}>New start (YYYY-MM-DD HH:MM:SS):</div><input value={rebaseInput} onChange={e => setRebaseInput(e.target.value)} placeholder="2026-03-25 08:00:00" style={{ width: "100%", boxSizing: "border-box", background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: "7px 10px", color: t.text1, fontSize: 13, fontFamily: FONT_MONO, outline: "none" }} /></div>
              <div style={{ display: "flex", gap: 4 }}><button onClick={applyRebase} style={{ flex: 1, padding: "8px 0", fontSize: 12, fontFamily: FONT_DISPLAY, cursor: "pointer", borderRadius: 8, fontWeight: 700, border: `1px solid ${t.warn}44`, background: `${t.warn}18`, color: t.warn }}>APPLY REBASE</button>{rebaseOffset !== 0 && <button onClick={clearRebase} style={{ padding: "8px 12px", fontSize: 12, fontFamily: FONT_DISPLAY, cursor: "pointer", borderRadius: 8, fontWeight: 600, border: `1px solid ${t.border}`, background: t.surface, color: t.text3 }}>RESET</button>}</div>
              <div style={{ fontSize: 13, color: t.text4, marginTop: 10, fontFamily: FONT_MONO }}>Offset: {rebaseOffset >= 0 ? "+" : ""}{rebaseOffset} ms</div>
            </div>}

            {activePanel === "export" && <ExportPanel data={data} metadata={metadata} viewRange={viewRange} getDisplayName={getDisplayName} theme={theme} onToast={showToast} rebaseOffset={rebaseOffset} />}
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ height: 30, display: "flex", alignItems: "center", gap: 16, padding: "0 14px", background: t.chart, borderBottom: `1px solid ${t.borderSubtle}`, fontSize: 12, color: t.text3, flexShrink: 0 }}>
            {cursorIdx !== null && <><span><span style={{ color: t.text3, fontFamily: FONT_DISPLAY, fontWeight: 500 }}>T₁</span> <span style={{ color: t.text1, fontFamily: FONT_MONO, fontWeight: 600 }}>{fmtTime(data.timestamps[cursorIdx] + rebaseOffset)}</span></span>{deltaMode && cursor2Idx !== null && <><span><span style={{ color: t.text3, fontFamily: FONT_DISPLAY, fontWeight: 500 }}>T₂</span> <span style={{ color: t.cursor2, fontFamily: FONT_MONO, fontWeight: 600 }}>{fmtTime(data.timestamps[cursor2Idx] + rebaseOffset)}</span></span><span><span style={{ color: t.text3, fontFamily: FONT_DISPLAY, fontWeight: 500 }}>ΔT</span> <span style={{ color: t.cursor2, fontFamily: FONT_MONO, fontWeight: 700 }}>{Math.abs(data.timestamps[cursor2Idx] - data.timestamps[cursorIdx]).toFixed(0)} ms</span></span></>}</>}
            {/* Active group summary */}
            {chartPanes.length > 1 && <span style={{ color: t.isolate, fontSize: 12, fontWeight: 700, letterSpacing: 1, padding: "2px 8px", borderRadius: 5, background: t.isolateDim, fontFamily: FONT_DISPLAY }}>
              {chartPanes.length} panes
            </span>}
            <span style={{ marginLeft: "auto", color: t.text4, fontSize: 13, fontFamily: FONT_DISPLAY }}>{deltaMode ? "click: place cursors · scroll: zoom" : "drag: pan · scroll: zoom"}</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {chartPanes.map((pane, pi) => {
              const paneGc = gc[pane.groupIdx - 1] || gc[0];
              return (
                <div key={pane.id} style={{ flex: 1, minHeight: 48, position: "relative", display: "flex", flexDirection: "column", borderBottom: pi === chartPanes.length - 1 ? "none" : `1px solid ${t.border}` }}>
                  {/* Group color bar at top of pane */}
                  {paneGc && (
                    <div style={{
                      height: 22, display: "flex", alignItems: "center", gap: 6, padding: "0 10px",
                      background: paneGc + "12", borderBottom: `1px solid ${paneGc}22`, flexShrink: 0, overflow: "hidden",
                    }}>
                      <div style={{ width: 5, height: 5, borderRadius: 2, background: paneGc, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: paneGc, fontFamily: FONT_DISPLAY, flexShrink: 0 }}>
                        {pane.label}
                      </span>
                      <span style={{ fontSize: 12, color: t.text4, fontFamily: FONT_MONO, flexShrink: 0 }}>
                        {pane.entries.length} tag{pane.entries.length !== 1 ? "s" : ""}
                      </span>
                      <span style={{ width: 1, height: 8, background: t.border, flexShrink: 0, marginLeft: 2, marginRight: 2 }} />
                      {pane.entries.map((entry, ei) => (
                        <span key={ei} style={{ display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: entry.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: entry.color, fontFamily: FONT_MONO, whiteSpace: "nowrap" }}>{entry.displayName}{entry.unit && <span style={{ fontWeight: 400, opacity: 0.6 }}> [{entry.unit}]</span>}</span>
                        </span>
                      ))}
                      {/* Unified Y-range toggle — only useful with 2+ signals */}
                      {pane.entries.length > 1 && (
                        <span
                          onClick={() => setLockedRanges(prev => ({ ...prev, [pane.groupIdx]: !prev[pane.groupIdx] }))}
                          title={lockedRanges[pane.groupIdx] ? "Split Y-axes (per signal)" : "Unify Y-axis (shared range)"}
                          style={{
                            marginLeft: "auto", flexShrink: 0, cursor: "pointer",
                            fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
                            padding: "1px 5px", borderRadius: 3,
                            fontFamily: FONT_DISPLAY,
                            background: lockedRanges[pane.groupIdx] ? t.accent + "22" : "transparent",
                            border: `1px solid ${lockedRanges[pane.groupIdx] ? t.accent + "44" : t.border}`,
                            color: lockedRanges[pane.groupIdx] ? t.accent : t.text4,
                            transition: "all 0.15s",
                          }}
                        >
                          {lockedRanges[pane.groupIdx] ? "Y =" : "Y ≠"}
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ flex: 1, position: "relative" }}>
                    <ChartPane timestamps={data.timestamps} signalEntries={pane.entries}
                      cursorIdx={cursorIdx} setCursorIdx={setCursorIdx} cursor2Idx={cursor2Idx} setCursor2Idx={setCursor2Idx}
                      deltaMode={deltaMode} viewRange={viewRange} setViewRange={setViewRange}
                      showTimeAxis={pi === chartPanes.length - 1} label={paneGc ? null : pane.label} compact={chartPanes.length > 2}
                      theme={theme} rebaseOffset={rebaseOffset}
                      groupColor={paneGc} showPills={showPills} showEdgeValues={showEdgeValues} unifyRange={!!lockedRanges[pane.groupIdx]}
                      deltaLocked={deltaLocked} setDeltaLocked={setDeltaLocked} />
                  </div>
                </div>
              );
            })}
            {chartPanes.length === 0 && <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: t.text4, fontSize: 13, fontFamily: FONT_DISPLAY }}>No visible signals</div>}
          </div>
          <div style={{ height: 26, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: t.panel, borderTop: `1px solid ${t.borderSubtle}`, fontSize: 13, color: t.text4, flexShrink: 0, fontFamily: FONT_MONO }}>
            <span>{fmtDate(data.timestamps[0] + rebaseOffset)} {fmtTime(data.timestamps[viewRange[0]] + rebaseOffset)}</span>
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 500 }}>Viewing {(viewRange[1] - viewRange[0]).toLocaleString()} / {data.timestamps.length.toLocaleString()} ({((viewRange[1] - viewRange[0]) / data.timestamps.length * 100).toFixed(1)}%)</span>
            <span>{fmtTime(data.timestamps[Math.min(viewRange[1], data.timestamps.length) - 1] + rebaseOffset)}</span>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
