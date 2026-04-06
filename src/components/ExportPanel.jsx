import { useState, useCallback, useMemo } from "react";
import { THEMES, FONT_DISPLAY, FONT_MONO } from "../constants/theme";
import { fmtDateISO, fmtTsClean } from "../utils/date";
import { downloadBlob } from "../utils/download";

export default function ExportPanel({ data, metadata, viewRange, getDisplayName, theme, onToast, rebaseOffset }) {
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
