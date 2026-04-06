import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import ChartPane from "./components/ChartPane";
import ExportPanel from "./components/ExportPanel";
import ThemeToggle from "./components/ThemeToggle";
import ToolBtn from "./components/ToolBtn";
import GroupPanel from "./components/GroupPanel";
import MarqueeText from "./components/MarqueeText";
import Toast from "./components/Toast";
import DerivedPenDialog from "./components/DerivedPenDialog";
import { THEMES, FONT_DISPLAY, FONT_MONO } from "./constants/theme";
import { GROUP_COLORS_DARK, GROUP_COLORS_LIGHT, GROUP_LABELS, MAX_GROUPS } from "./constants/groups";
import { parseStudio5000CSV } from "./utils/parser";
import { fmtDate, fmtDateISO, fmtTime, fmtTsClean } from "./utils/date";
import { computeStats } from "./utils/stats";
import { downloadBlob } from "./utils/download";
import { ensureFonts } from "./utils/fonts";

export default function App() {
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
  const [splitRanges, setSplitRanges] = useState({}); // { [groupIdx]: true } — split Y range (default: unified)
  const [avgWindow, setAvgWindow] = useState({}); // { [signalIdx]: number } — moving average window size (0 = off)
  const [hideOriginal, setHideOriginal] = useState({}); // { [signalIdx]: true } — hide original when avg shown
  const [derivedConfigs, setDerivedConfigs] = useState({}); // { [signalIdx]: { type, ...params } }
  const [derivedPresetByGroup, setDerivedPresetByGroup] = useState({}); // { [groupIdx]: "equation" | "rolling_avg" | ... }
  const [derivedDialog, setDerivedDialog] = useState({ open: false, mode: "create", groupIdx: 1, type: "equation", editIdx: null, initialDraft: null });
  const [viewRange, setViewRange] = useState([0, 0]);
  const [activePanel, setActivePanel] = useState("signals");
  const [metadata, setMetadata] = useState({});
  const [editingMeta, setEditingMeta] = useState(null);
  const [theme, setTheme] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );
  const [rebaseOffset, setRebaseOffset] = useState(0);
  const [rebaseInput, setRebaseInput] = useState("");
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const projectInputRef = useRef(null);

  const t = THEMES[theme];
  const gc = theme === "dark" ? GROUP_COLORS_DARK : GROUP_COLORS_LIGHT;
  const showToast = useCallback((msg, type = "info") => setToast({ msg, type }), []);

  const recomputeDerivedSignals = useCallback((sourceData, cfgMap) => {
    if (!sourceData) return sourceData;
    const signals = sourceData.signals.map(sig => ({ ...sig, values: [...sig.values] }));
    const derivedIdxs = Object.keys(cfgMap).map(k => parseInt(k)).filter(i => !isNaN(i)).sort((a, b) => a - b);
    derivedIdxs.forEach((idx) => {
      const cfg = cfgMap[idx];
      if (!cfg || !signals[idx]) return;
      const getAt = (sigIdx, sampleIdx) => {
        const v = signals[sigIdx]?.values?.[sampleIdx];
        return (v === null || v === undefined || Number.isNaN(v)) ? null : v;
      };
      const out = new Array(sourceData.timestamps.length).fill(null);
      if (cfg.type === "rolling_avg") {
        const src = cfg.source;
        const win = Math.max(2, parseInt(cfg.window || 20));
        const buf = [];
        let sum = 0;
        for (let i = 0; i < out.length; i++) {
          const v = getAt(src, i);
          if (v !== null) {
            buf.push(v); sum += v;
            if (buf.length > win) sum -= buf.shift();
            out[i] = sum / buf.length;
          } else out[i] = buf.length ? sum / buf.length : null;
        }
      } else if (cfg.type === "difference" || cfg.type === "sum" || cfg.type === "ratio") {
        const [aIdx, bIdx] = cfg.sources || [];
        for (let i = 0; i < out.length; i++) {
          const a = getAt(aIdx, i), b = getAt(bIdx, i);
          if (a === null || b === null) continue;
          if (cfg.type === "difference") out[i] = a - b;
          else if (cfg.type === "sum") out[i] = a + b;
          else out[i] = Math.abs(b) < 1e-12 ? null : a / b;
        }
      } else if (cfg.type === "equation") {
        try {
          // Equation can reference signals as s0, s1, ... (base or derived)
          const fn = new Function("s", "Math", `with (Math) { return ${cfg.expression}; }`);
          for (let i = 0; i < out.length; i++) {
            const val = fn((sigIdx) => getAt(sigIdx, i), Math);
            out[i] = (typeof val === "number" && Number.isFinite(val)) ? val : null;
          }
        } catch {
          // keep nulls
        }
      }
      signals[idx] = { ...signals[idx], values: out, isDigital: false, isDerived: true, derivedType: cfg.type };
    });
    return { ...sourceData, signals };
  }, []);

  const toDerivedCfg = useCallback((draft) => {
    const type = draft.type || "equation";
    if (type === "equation") return { type: "equation", expression: draft.expression || "s0 - s1" };
    if (type === "rolling_avg") return { type: "rolling_avg", source: parseInt(draft.source, 10) || 0, window: Math.max(2, parseInt(draft.window, 10) || 20) };
    return { type, sources: [parseInt(draft.sources?.[0], 10) || 0, parseInt(draft.sources?.[1], 10) || 1] };
  }, []);

  const createDerivedPen = useCallback((draft) => {
    if (!data) return;
    const type = draft.type || "equation";
    const nextIdx = data.signals.length;
    const cfg = toDerivedCfg(draft);

    const friendly = type === "rolling_avg" ? `RollingAvg(s${cfg.source}, ${cfg.window})` :
      type === "equation" ? `Eq: ${cfg.expression}` :
      `${type}(${(cfg.sources || []).map(s => `s${s}`).join(", ")})`;
    const baseName = (draft.name || "").trim() || friendly;

    const baseData = {
      ...data,
      tagNames: [...data.tagNames, baseName],
      signals: [...data.signals, { name: baseName, values: new Array(data.timestamps.length).fill(null), isDigital: false, isDerived: true, derivedType: type }],
    };
    const nextCfgs = { ...derivedConfigs, [nextIdx]: cfg };
    const recomputed = recomputeDerivedSignals(baseData, nextCfgs);
    setDerivedConfigs(nextCfgs);
    setData(recomputed);
    setVisible(v => [...v, true]);
    setGroups(g => [...g, parseInt(draft.groupIdx, 10) || 1]);
    setMetadata(m => ({ ...m, [nextIdx]: { ...(m[nextIdx] || {}), displayName: baseName } }));
    const targetGroup = parseInt(draft.groupIdx, 10) || 1;
    setSignalStyles(s => ({ ...s, [nextIdx]: { color: gc[(targetGroup - 1) % gc.length], dash: "dashed" } }));
    showToast(`Derived pen added to Group ${targetGroup}`, "success");
  }, [data, derivedConfigs, recomputeDerivedSignals, gc, showToast, toDerivedCfg]);

  const updateDerivedPen = useCallback((idx, draft) => {
    if (!data || !derivedConfigs[idx]) return;
    const cfg = toDerivedCfg(draft);
    const targetGroup = parseInt(draft.groupIdx, 10) || groups[idx] || 1;
    const baseName = (draft.name || "").trim() || data.tagNames[idx] || `Derived ${idx}`;
    const nextCfgs = { ...derivedConfigs, [idx]: cfg };
    const dataWithRename = {
      ...data,
      tagNames: data.tagNames.map((n, i) => i === idx ? baseName : n),
      signals: data.signals.map((s, i) => i === idx ? { ...s, name: baseName, isDerived: true, derivedType: cfg.type } : s),
    };
    const recomputed = recomputeDerivedSignals(dataWithRename, nextCfgs);
    setDerivedConfigs(nextCfgs);
    setData(recomputed);
    setGroups(g => { const n = [...g]; n[idx] = targetGroup; return n; });
    setMetadata(m => ({ ...m, [idx]: { ...(m[idx] || {}), displayName: baseName } }));
    showToast(`Derived pen updated`, "success");
  }, [data, derivedConfigs, groups, recomputeDerivedSignals, showToast, toDerivedCfg]);

  useEffect(() => {
    ensureFonts();
  }, []);

  useEffect(() => {
    const defaultCsvUrl = import.meta.env.VITE_DEFAULT_CSV_URL;
    if (!defaultCsvUrl) return;

    fetch(defaultCsvUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to fetch ${defaultCsvUrl}`);
        return response.text();
      })
      .then((csvText) => {
        const parsed = parseStudio5000CSV(csvText);
        if (!parsed) throw new Error("Unsupported CSV format");
        setData(parsed);
        setVisible(parsed.signals.map(() => true));
        setGroups(parsed.signals.map((_, i) => (i % MAX_GROUPS) + 1));
        setViewRange([0, parsed.timestamps.length]);
        setCursorIdx(null);
        setCursor2Idx(null);
        setMetadata({});
        setSignalStyles({});
        setDerivedConfigs({});
        setDerivedPresetByGroup({});
        setRebaseOffset(0);
        setRebaseInput("");
        showToast(`Loaded default CSV: ${parsed.tagNames.length} tags`, "success");
      })
      .catch((error) => {
        console.warn("Default CSV load skipped:", error);
      });
  }, [showToast]);

  const handleFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseStudio5000CSV(e.target.result);
      if (parsed) {
        setData(parsed); setVisible(parsed.signals.map(() => true));
        setGroups(parsed.signals.map((_, i) => (i % MAX_GROUPS) + 1));
        setViewRange([0, parsed.timestamps.length]);
        setCursorIdx(null); setCursor2Idx(null);
        setMetadata({}); setSignalStyles({}); setDerivedConfigs({}); setDerivedPresetByGroup({}); setRebaseOffset(0); setRebaseInput("");
        showToast(`Loaded ${parsed.tagNames.length} tags, ${parsed.timestamps.length.toLocaleString()} samples`, "success");
      } else showToast("Failed to parse CSV — unsupported format", "error");
    };
    reader.readAsText(file);
  }, [showToast]);


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
      const baseColor = signalStyles[i]?.color || sc[i % sc.length];
      const baseDash = signalStyles[i]?.dash || "solid";

      // Original signal entry (unless hidden by hideOriginal)
      if (!hideOriginal[i]) {
        paneMap.get(g).push({
          signal, originalIndex: i, displayName: getDisplayName(i),
          unit: (metadata[i] || {}).unit || "",
          color: baseColor,
          dash: baseDash,
          isAvg: !!signal.isDerived,
        });
      }

      // Average line entry
      const win = avgWindow[i] || 0;
      if (win > 0) {
        // Simple moving average with configurable window
        const vals = signal.values;
        const avgVals = new Array(vals.length);
        // Use a ring buffer for the window
        const buf = [];
        let bufSum = 0;
        for (let j = 0; j < vals.length; j++) {
          if (vals[j] !== null) {
            buf.push(vals[j]);
            bufSum += vals[j];
            if (buf.length > win) {
              bufSum -= buf.shift();
            }
            avgVals[j] = bufSum / buf.length;
          } else {
            avgVals[j] = buf.length > 0 ? bufSum / buf.length : null;
          }
        }
        const avgSignal = { values: avgVals, isDigital: false };
        paneMap.get(g).push({
          signal: avgSignal, originalIndex: i, displayName: `${getDisplayName(i)} (avg ${win})`,
          unit: (metadata[i] || {}).unit || "",
          color: baseColor,
          dash: "dashed",
          isAvg: true,
          parentIndex: i,
        });
      }
    });

    const panes = [];
    const sortedKeys = [...paneMap.keys()].sort((a, b) => a - b);
    for (const g of sortedKeys) {
      const entries = paneMap.get(g);
      if (!entries.length) continue;
      panes.push({ id: `group-${g}`, entries, label: getGroupLabel(g), groupIdx: g });
    }
    return panes;
  }, [data, visible, groups, metadata, groupNames, signalStyles, t.sigColors, avgWindow, hideOriginal]);

  // Compute a global max edge label width across ALL panes so x-axes align
  const globalEdgeLabelWidth = useMemo(() => {
    if (!showEdgeValues || !data) return 0;
    const [start, end] = viewRange;
    let maxW = 0;
    chartPanes.forEach(pane => {
      pane.entries.forEach(({ signal, unit }) => {
        for (let i = end - 1; i >= start; i--) {
          if (signal.values[i] !== null) {
            const str = signal.values[i].toFixed(2) + (unit ? " " + unit : "");
            maxW = Math.max(maxW, str.length * 6.5 + 14);
            break;
          }
        }
      });
    });
    return maxW;
  }, [showEdgeValues, data, viewRange, chartPanes]);

  const applyRebase = useCallback(() => {
    if (!data || !rebaseInput.trim()) return;
    try { const target = new Date(rebaseInput.trim()); if (isNaN(target.getTime())) { showToast("Invalid date format", "error"); return; } setRebaseOffset(target.getTime() - data.timestamps[0]); showToast(`Rebased: start → ${fmtTsClean(target.getTime())}`, "success"); } catch { showToast("Invalid date format", "error"); }
  }, [data, rebaseInput, showToast]);
  const clearRebase = useCallback(() => { setRebaseOffset(0); setRebaseInput(""); showToast("Rebase cleared — original timestamps restored", "info"); }, [showToast]);

  const saveProject = useCallback(() => {
    if (!data) return;
    const project = { version: 3, data, visible, groups, groupNames, signalStyles, metadata, viewRange, rebaseOffset, deltaMode, showPills, showEdgeValues, splitRanges, avgWindow, hideOriginal, derivedConfigs };
    const blob = new Blob([JSON.stringify(project)], { type: "application/json" });
    const filename = `${(data.meta.trendName || "project").replace(/\s+/g, "_")}.tracelab`;
    downloadBlob(blob, filename, () => showToast("Project saved", "success"));
  }, [data, visible, groups, groupNames, signalStyles, metadata, viewRange, rebaseOffset, deltaMode, showPills, showEdgeValues, splitRanges, avgWindow, hideOriginal, derivedConfigs, showToast]);

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
          const loadedDerived = proj.derivedConfigs || {};
          setDerivedConfigs(loadedDerived);
          setDerivedPresetByGroup({});
          if (Object.keys(loadedDerived).length > 0) {
            proj.data = recomputeDerivedSignals(proj.data, loadedDerived);
          }
          setRebaseOffset(proj.rebaseOffset || 0); setDeltaMode(proj.deltaMode || false);
          if (proj.showPills !== undefined) setShowPills(proj.showPills);
          if (proj.showEdgeValues !== undefined) setShowEdgeValues(proj.showEdgeValues);
          if (proj.splitRanges) setSplitRanges(proj.splitRanges);
          else if (proj.lockedRanges) {
            // Old format: lockedRanges[g]=true meant unified. Invert: groups NOT in lockedRanges are now split=false (unified default)
            // Groups that WERE locked (unified) stay unified (splitRanges absent). Groups that were NOT locked need splitRanges=true.
            const sr = {};
            for (let g = 1; g <= 8; g++) { if (!proj.lockedRanges[g]) sr[g] = true; }
            setSplitRanges(sr);
          } else setSplitRanges({});
          if (proj.avgWindow) setAvgWindow(proj.avgWindow); else if (proj.showAvg) { const aw = {}; Object.keys(proj.showAvg).forEach(k => { if (proj.showAvg[k]) aw[k] = 20; }); setAvgWindow(aw); } else setAvgWindow({});
          if (proj.hideOriginal) setHideOriginal(proj.hideOriginal); else setHideOriginal({});
          setCursorIdx(null); setCursor2Idx(null);
          showToast("Project loaded", "success");
        } else showToast("Invalid project file", "error");
      } catch { showToast("Failed to parse project file", "error"); }
    };
    reader.readAsText(file);
  }, [showToast, recomputeDerivedSignals]);

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
  const tabSt = (active, accent) => ({ padding: "8px 0", fontSize: 10, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase", cursor: "pointer", background: "none", border: "none", borderBottom: `2px solid ${active ? (accent || t.accent) : "transparent"}`, color: active ? (accent || t.text1) : t.text3, transition: "all 0.15s", fontFamily: FONT_DISPLAY, flex: 1, textAlign: "center", whiteSpace: "nowrap" });

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
          <div style={{ display: "flex", borderBottom: `1px solid ${t.border}` }}>
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
                      derivedConfigs={derivedConfigs}
                      onDrop={(sigIdx, targetGroup) => setGroup(sigIdx, targetGroup)}
                      onToggleVisible={toggleSignal}
                      onToggleGroup={toggleGroup}
                      onEditDerived={(idx) => {
                        const cfg = derivedConfigs[idx];
                        if (!cfg) return;
                        setDerivedDialog({
                          open: true,
                          mode: "edit",
                          editIdx: idx,
                          groupIdx: groups[idx] || 1,
                          type: cfg.type || "equation",
                          initialDraft: {
                            name: metadata[idx]?.displayName || data?.tagNames?.[idx] || "",
                            groupIdx: groups[idx] || 1,
                            type: cfg.type || "equation",
                            expression: cfg.expression || "s0 - s1",
                            source: cfg.source ?? 0,
                            window: cfg.window ?? 20,
                            sources: cfg.sources || [0, 1],
                          },
                        });
                      }}
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
              return <div key={i} style={{ padding: "10px 12px", marginBottom: 6, borderRadius: 10, background: t.surface, borderLeft: `3px solid ${getSignalColor(i)}`, boxShadow: t.cardShadow }}><MarqueeText style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.text1, fontFamily: FONT_DISPLAY }}>{getDisplayName(i)}{metadata[i]?.unit && <span style={{ fontWeight: 400, color: t.text3 }}> [{metadata[i].unit}]</span>}</MarqueeText>{[["Min", s.min], ["Max", s.max], ["Avg", s.avg], ["Range", s.range]].map(([l, v]) => <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}><span style={{ color: t.text3, fontFamily: FONT_DISPLAY, fontWeight: 500 }}>{l}</span><span style={{ color: t.text2, fontFamily: FONT_MONO, fontWeight: 600 }}>{v}</span></div>)}</div>;
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 6 }}>
                  <MarqueeText style={{ fontSize: 12, fontWeight: 700, color: t.text1, fontFamily: FONT_DISPLAY, flex: 1, minWidth: 0 }}>{sig.name}</MarqueeText>
                  <button onClick={() => setEditingMeta(editing ? null : i)} style={{ background: "none", border: "none", color: t.accent, fontSize: 13, cursor: "pointer", fontFamily: FONT_DISPLAY, fontWeight: 600, flexShrink: 0 }}>{editing ? "DONE" : "EDIT"}</button>
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
                </div> : <div style={{ fontSize: 12, color: t.text3, fontFamily: FONT_DISPLAY }}>{m.displayName && <MarqueeText style={{ color: t.text3 }}>Name: <span style={{ color: t.text2 }}>{m.displayName}</span></MarqueeText>}{m.unit && <div>Unit: <span style={{ color: t.text2 }}>{m.unit}</span></div>}{m.description && <MarqueeText style={{ marginTop: 2 }}>{m.description}</MarqueeText>}{!m.displayName && !m.unit && !m.description && <div style={{ fontStyle: "italic" }}>No metadata</div>}</div>}
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
                      <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <select
                          value={derivedPresetByGroup[pane.groupIdx] || "equation"}
                          onChange={(e) => setDerivedPresetByGroup(prev => ({ ...prev, [pane.groupIdx]: e.target.value }))}
                          style={{ height: 20, background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 4, color: t.text2, fontSize: 11, fontFamily: FONT_MONO }}
                          title="Derived pen type"
                        >
                          <option value="equation">Equation</option>
                          <option value="rolling_avg">Rolling Avg</option>
                          <option value="difference">Difference</option>
                          <option value="sum">Sum</option>
                          <option value="ratio">Ratio</option>
                        </select>
                        <button
                          onClick={() => setDerivedDialog({ open: true, mode: "create", groupIdx: pane.groupIdx, type: derivedPresetByGroup[pane.groupIdx] || "equation", editIdx: null, initialDraft: null })}
                          style={{ padding: "1px 6px", borderRadius: 4, border: `1px solid ${paneGc}66`, background: paneGc + "22", color: paneGc, fontSize: 11, fontWeight: 700, fontFamily: FONT_DISPLAY, cursor: "pointer" }}
                          title="Add derived pen to this chart"
                        >
                          + Derived
                        </button>
                      </span>
                      {/* Unified Y-range toggle — only useful with 2+ signals */}
                      {pane.entries.length > 1 && (
                        <span
                          onClick={() => setSplitRanges(prev => ({ ...prev, [pane.groupIdx]: !prev[pane.groupIdx] }))}
                          title={splitRanges[pane.groupIdx] ? "Unify Y-axis (shared range)" : "Split Y-axes (per signal)"}
                          style={{
                            flexShrink: 0, cursor: "pointer",
                            fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
                            padding: "1px 5px", borderRadius: 3,
                            fontFamily: FONT_DISPLAY,
                            background: !splitRanges[pane.groupIdx] ? t.accent + "22" : "transparent",
                            border: `1px solid ${!splitRanges[pane.groupIdx] ? t.accent + "44" : t.border}`,
                            color: !splitRanges[pane.groupIdx] ? t.accent : t.text4,
                            transition: "all 0.15s",
                          }}
                        >
                          {splitRanges[pane.groupIdx] ? "Y ≠" : "Y ="}
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
                      groupColor={paneGc} showPills={showPills} showEdgeValues={showEdgeValues} unifyRange={!splitRanges[pane.groupIdx]}
                      deltaLocked={deltaLocked} setDeltaLocked={setDeltaLocked} globalEdgeLabelWidth={globalEdgeLabelWidth} />
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
      <DerivedPenDialog
        open={derivedDialog.open}
        mode={derivedDialog.mode}
        theme={theme}
        signals={data.signals}
        groups={groups}
        defaultGroupIdx={derivedDialog.groupIdx}
        defaultType={derivedDialog.type}
        initialDraft={derivedDialog.initialDraft}
        getDisplayName={getDisplayName}
        onCancel={() => setDerivedDialog(prev => ({ ...prev, open: false, editIdx: null, initialDraft: null }))}
        onCreate={(draft) => {
          if (derivedDialog.mode === "edit" && derivedDialog.editIdx !== null) updateDerivedPen(derivedDialog.editIdx, draft);
          else createDerivedPen(draft);
          setDerivedDialog(prev => ({ ...prev, open: false, editIdx: null, initialDraft: null }));
        }}
      />
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
