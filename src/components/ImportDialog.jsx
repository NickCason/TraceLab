import { useState, useRef, useCallback } from "react";
import { FONT_DISPLAY, FONT_MONO } from "../constants/theme";
import { parseStudio5000CSV } from "../utils/parser";
import { computeAlignmentInfo, mergeUnified } from "../utils/mergeDatasets";
import RebasePreview from "./RebasePreview";

const OVERLAY_STYLE = {
  position: "fixed", inset: 0, zIndex: 1000,
  background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)",
  display: "flex", alignItems: "center", justifyContent: "center",
};

const fmtTs = (ms) => {
  if (!ms) return "–";
  const d = new Date(ms);
  return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
};

const fmtDuration = (ms) => {
  if (!ms) return "–";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
};

/**
 * ImportDialog — multi-step wizard for importing an additional CSV.
 *
 * Props:
 *   open               — boolean, whether dialog is shown
 *   onClose            — () => void
 *   existingData       — the currently loaded primary dataset
 *   theme              — "dark" | "light"
 *   t                  — theme token object
 *   onImportUnified    — (mergedData, newSignalStartIdx) => void
 *   onImportComparison — (newData) => void
 */
export default function ImportDialog({ open, onClose, existingData, theme, t, onImportUnified, onImportComparison }) {
  const [step, setStep] = useState("select"); // "select" | "rebase" | "confirm"
  const [mode, setMode] = useState("unified"); // "unified" | "comparison"
  const [parsedData, setParsedData] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [fileName, setFileName] = useState("");
  const [offset, setOffset] = useState(0);
  const [alignInfo, setAlignInfo] = useState(null);
  const fileInputRef = useRef(null);

  const reset = useCallback(() => {
    setStep("select");
    setMode("unified");
    setParsedData(null);
    setParseError(null);
    setFileName("");
    setOffset(0);
    setAlignInfo(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    setParseError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseStudio5000CSV(e.target.result);
      if (!parsed) {
        setParseError("Could not parse this file. Ensure it is a Studio 5000 Logix trend CSV export.");
        setParsedData(null);
        return;
      }
      setParsedData(parsed);
      // Compute alignment info with zero offset initially
      const info = computeAlignmentInfo(existingData, parsed, 0);
      setAlignInfo(info);
      setOffset(0);
    };
    reader.readAsText(file);
  }, [existingData]);

  const handleNext = useCallback(() => {
    if (step === "select") {
      if (!parsedData) return;
      if (mode === "unified" && alignInfo && !alignInfo.overlaps) {
        setStep("rebase");
      } else {
        setStep("confirm");
      }
    } else if (step === "rebase") {
      setStep("confirm");
    }
  }, [step, parsedData, mode, alignInfo]);

  const handleOffsetChange = useCallback((newOffset) => {
    setOffset(newOffset);
    if (parsedData) {
      setAlignInfo(computeAlignmentInfo(existingData, parsedData, newOffset));
    }
  }, [parsedData, existingData]);

  const handleImport = useCallback(() => {
    if (!parsedData) return;
    const taggedData = { ...parsedData, meta: { ...parsedData.meta, sourceFile: fileName } };
    if (mode === "unified") {
      const merged = mergeUnified(existingData, taggedData, offset);
      const newSignalStartIdx = existingData.signals.length;
      onImportUnified(merged, newSignalStartIdx);
    } else {
      onImportComparison(taggedData);
    }
    reset();
  }, [parsedData, fileName, mode, existingData, offset, onImportUnified, onImportComparison, reset]);

  if (!open) return null;

  const canAdvance = !!parsedData && !parseError;
  const newSignalCount = parsedData?.signals.length || 0;
  const newSampleCount = parsedData?.timestamps.length || 0;

  // Modal card dimensions
  const cardW = 560;

  const sectionTitle = (txt) => (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: t.text3, fontFamily: FONT_DISPLAY, marginBottom: 10 }}>
      {txt}
    </div>
  );

  const btn = (label, onClick, disabled, accent) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 20px", borderRadius: 8, fontSize: 13, fontFamily: FONT_DISPLAY,
        fontWeight: 700, cursor: disabled ? "default" : "pointer", letterSpacing: 0.3,
        border: `1px solid ${disabled ? t.border : (accent || t.accent) + "55"}`,
        background: disabled ? t.surface : (accent || t.accent) + "18",
        color: disabled ? t.text4 : (accent || t.accent),
        opacity: disabled ? 0.6 : 1, transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  const renderStepSelect = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sectionTitle("Select CSV File")}

      {/* File drop zone / picker */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFileSelect(e.dataTransfer.files?.[0]); }}
        style={{
          border: `2px dashed ${parsedData ? t.green + "88" : t.border}`,
          borderRadius: 10, padding: "20px 16px", cursor: "pointer",
          textAlign: "center", background: parsedData ? t.green + "08" : t.chart,
          transition: "all 0.15s",
        }}
      >
        {parsedData ? (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.green, fontFamily: FONT_DISPLAY, marginBottom: 6 }}>
              {fileName}
            </div>
            <div style={{ fontSize: 12, color: t.text3, fontFamily: FONT_MONO }}>
              {newSignalCount} tags · {newSampleCount.toLocaleString()} samples
            </div>
            <div style={{ fontSize: 11, color: t.text4, fontFamily: FONT_MONO, marginTop: 4 }}>
              {fmtTs(parsedData.timestamps[0])} → {fmtTs(parsedData.timestamps[parsedData.timestamps.length - 1])}
              {" "}({fmtDuration(parsedData.timestamps[parsedData.timestamps.length - 1] - parsedData.timestamps[0])})
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📂</div>
            <div style={{ fontSize: 13, color: t.text2, fontFamily: FONT_DISPLAY, fontWeight: 600 }}>
              Click or drag & drop a CSV
            </div>
            <div style={{ fontSize: 11, color: t.text4, fontFamily: FONT_MONO, marginTop: 4 }}>
              Studio 5000 Logix trend export (.csv)
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.CSV"
          style={{ display: "none" }}
          onChange={e => handleFileSelect(e.target.files?.[0])}
        />
      </div>

      {parseError && (
        <div style={{ fontSize: 12, color: t.red, fontFamily: FONT_MONO, padding: "8px 12px", background: t.red + "14", borderRadius: 6, border: `1px solid ${t.red}33` }}>
          {parseError}
        </div>
      )}

      {/* Sample rate warning */}
      {parsedData && existingData.meta?.samplePeriod && parsedData.meta?.samplePeriod &&
        existingData.meta.samplePeriod !== parsedData.meta.samplePeriod && (
        <div style={{ fontSize: 12, color: t.warn, fontFamily: FONT_DISPLAY, padding: "8px 12px", background: t.warn + "14", borderRadius: 6, border: `1px solid ${t.warn}33` }}>
          Sample periods differ: {existingData.meta.samplePeriod}{existingData.meta.sampleUnit} vs {parsedData.meta.samplePeriod}{parsedData.meta.sampleUnit}.
          In Unified mode, time axis spacing will be non-uniform. Comparison mode is recommended.
        </div>
      )}

      {/* Existing dataset summary */}
      {existingData && (
        <div style={{ fontSize: 11, color: t.text4, fontFamily: FONT_MONO, padding: "6px 10px", background: t.surface, borderRadius: 6 }}>
          <span style={{ color: t.accent }}>Current:</span> {existingData.signals.length} tags · {existingData.timestamps.length.toLocaleString()} samples
          {" "}· {fmtTs(existingData.timestamps[0])}
        </div>
      )}

      {sectionTitle("Import Mode")}

      {/* Mode cards */}
      <div style={{ display: "flex", gap: 10 }}>
        {[
          {
            id: "unified",
            label: "Unified",
            desc: "Merge all signals into one list, shared timeline. Independent zoom for each section.",
            icon: "⊕",
            color: t.accent,
          },
          {
            id: "comparison",
            label: "Comparison",
            desc: "Side-by-side top/bottom view. Fully independent time scales and configuration.",
            icon: "⊞",
            color: t.green,
          },
        ].map(({ id, label, desc, icon, color }) => (
          <div
            key={id}
            onClick={() => setMode(id)}
            style={{
              flex: 1, padding: "14px 12px", borderRadius: 10, cursor: "pointer",
              border: `2px solid ${mode === id ? color + "88" : t.border}`,
              background: mode === id ? color + "10" : t.chart,
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: mode === id ? color : t.text1, fontFamily: FONT_DISPLAY, marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 11, color: t.text3, fontFamily: FONT_DISPLAY, lineHeight: 1.4 }}>
              {desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStepRebase = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sectionTitle("Align Time Ranges")}
      <RebasePreview
        existingData={existingData}
        newData={parsedData}
        offset={offset}
        onOffsetChange={handleOffsetChange}
        theme={theme}
        t={t}
      />
    </div>
  );

  const renderStepConfirm = () => {
    const totalSignals = existingData.signals.length + newSignalCount;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sectionTitle("Confirm Import")}

        <div style={{ background: t.chart, borderRadius: 8, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: t.text3, fontFamily: FONT_DISPLAY }}>Mode</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: mode === "unified" ? t.accent : t.green, fontFamily: FONT_DISPLAY }}>
              {mode === "unified" ? "Unified" : "Comparison"}
            </span>
          </div>
          <div style={{ height: 1, background: t.border }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: t.text3, fontFamily: FONT_DISPLAY }}>File</span>
            <span style={{ fontSize: 12, color: t.text1, fontFamily: FONT_MONO }}>{fileName}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: t.text3, fontFamily: FONT_DISPLAY }}>New signals</span>
            <span style={{ fontSize: 12, color: t.text1, fontFamily: FONT_MONO }}>{newSignalCount}</span>
          </div>
          {mode === "unified" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: t.text3, fontFamily: FONT_DISPLAY }}>Total signals</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: t.accent, fontFamily: FONT_MONO }}>{totalSignals}</span>
              </div>
              {offset !== 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: t.text3, fontFamily: FONT_DISPLAY }}>Time offset</span>
                  <span style={{ fontSize: 12, color: t.warn, fontFamily: FONT_MONO }}>{offset >= 0 ? "+" : ""}{offset} ms</span>
                </div>
              )}
            </>
          )}
          {mode === "comparison" && (
            <div style={{ fontSize: 11, color: t.text3, fontFamily: FONT_DISPLAY, marginTop: 4, lineHeight: 1.5 }}>
              Charts will be displayed top/bottom. Each chart has independent zoom, pan, cursor, and sidebar controls.
            </div>
          )}
        </div>

        {alignInfo && !alignInfo.overlaps && mode === "unified" && offset === 0 && (
          <div style={{ fontSize: 11, color: t.warn, fontFamily: FONT_DISPLAY, padding: "6px 10px", background: t.warn + "14", borderRadius: 6, border: `1px solid ${t.warn}33` }}>
            Time ranges do not overlap. Signals will be null-filled in each other's time region.
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={OVERLAY_STYLE} onClick={handleClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: cardW, maxWidth: "95vw", maxHeight: "90vh",
          background: t.panel, borderRadius: 14,
          border: `1px solid ${t.border}`, boxShadow: t.cardShadow,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: t.text1, fontFamily: FONT_DISPLAY, letterSpacing: -0.3 }}>
              Import CSV
            </div>
            <div style={{ fontSize: 11, color: t.text4, fontFamily: FONT_MONO, marginTop: 2 }}>
              {step === "select" && "Choose file and mode"}
              {step === "rebase" && "Align time ranges"}
              {step === "confirm" && "Review and confirm"}
            </div>
          </div>
          {/* Step indicator */}
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {["select", "rebase", "confirm"].map((s, i) => (
              <div key={s} style={{
                width: 6, height: 6, borderRadius: "50%",
                background: s === step ? t.accent : t.border,
                transition: "background 0.2s",
              }} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
          {step === "select" && renderStepSelect()}
          {step === "rebase" && parsedData && renderStepRebase()}
          {step === "confirm" && parsedData && renderStepConfirm()}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <button
            onClick={handleClose}
            style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontFamily: FONT_DISPLAY, fontWeight: 600, cursor: "pointer", border: `1px solid ${t.border}`, background: "none", color: t.text3 }}
          >
            Cancel
          </button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {step !== "select" && (
              <button
                onClick={() => setStep(step === "confirm" ? (mode === "unified" && alignInfo && !alignInfo.overlaps ? "rebase" : "select") : "select")}
                style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontFamily: FONT_DISPLAY, fontWeight: 600, cursor: "pointer", border: `1px solid ${t.border}`, background: "none", color: t.text3 }}
              >
                Back
              </button>
            )}
            {step !== "confirm"
              ? btn("Next →", handleNext, !canAdvance, t.accent)
              : btn("Import", handleImport, !canAdvance, t.green)
            }
          </div>
        </div>
      </div>
    </div>
  );
}
