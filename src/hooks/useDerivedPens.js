// src/hooks/useDerivedPens.js
import { useState, useCallback } from "react";
import { shiftSeriesBackward, remapDerivedConfig, shiftIndexedMap } from "../utils/signalRemapping";
import { buildEquationEvaluator } from "../utils/derivedEquation";
import { inferSeamDomain } from "../utils/seamAdjustment";

export function useDerivedPens(data, setData, signalState, gc, showToast) {
  const [derivedConfigs, setDerivedConfigs] = useState({});
  const [derivedDialog, setDerivedDialog] = useState({
    open: false, mode: "create", groupIdx: 1, type: "equation", editIdx: null, initialDraft: null,
  });

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
        const buf = []; let sum = 0;
        for (let i = 0; i < out.length; i++) {
          const v = getAt(src, i);
          if (v !== null) {
            buf.push(v); sum += v;
            if (buf.length > win) sum -= buf.shift();
            out[i] = sum / buf.length;
          } else out[i] = buf.length ? sum / buf.length : null;
        }
        const phaseShift = (win - 1) / 2;
        const shifted = shiftSeriesBackward(out, phaseShift);
        for (let i = 0; i < out.length; i++) out[i] = shifted[i];
      } else if (cfg.type === "difference" || cfg.type === "sum" || cfg.type === "ratio" || cfg.type === "product" || cfg.type === "min" || cfg.type === "max") {
        const [aIdx, bIdx] = cfg.sources || [];
        const domainA = inferSeamDomain(signals[aIdx]?.values || []);
        const domainB = inferSeamDomain(signals[bIdx]?.values || []);
        const rolloverSpan = Math.max(domainA.span || 0, domainB.span || 0, 0);
        for (let i = 0; i < out.length; i++) {
          const a = getAt(aIdx, i), b = getAt(bIdx, i);
          if (a === null || b === null) continue;
          if (cfg.type === "difference") {
            let diff = a - b;
            if (cfg.unwrapDiff && rolloverSpan > 0) {
              const half = rolloverSpan / 2;
              diff = ((diff + half) % rolloverSpan + rolloverSpan) % rolloverSpan - half;
            }
            out[i] = cfg.absDiff ? Math.abs(diff) : diff;
          } else if (cfg.type === "sum") out[i] = a + b;
          else if (cfg.type === "ratio") out[i] = Math.abs(b) < 1e-12 ? null : a / b;
          else if (cfg.type === "product") out[i] = a * b;
          else if (cfg.type === "min") out[i] = Math.min(a, b);
          else if (cfg.type === "max") out[i] = Math.max(a, b);
        }
      } else if (cfg.type === "equation") {
        try {
          const evaluate = buildEquationEvaluator(cfg.expression);
          for (let i = 0; i < out.length; i++) out[i] = evaluate(i, getAt);
        } catch { /* keep nulls */ }
      }
      signals[idx] = { ...signals[idx], values: out, isDigital: false, isDerived: true, derivedType: cfg.type };
    });
    return { ...sourceData, signals };
  }, []);

  const toDerivedCfg = useCallback((draft) => {
    const type = draft.type || "equation";
    if (type === "equation") return { type: "equation", expression: draft.expression || "s0 - s1" };
    if (type === "rolling_avg") return { type: "rolling_avg", source: parseInt(draft.source, 10) || 0, window: Math.max(2, parseInt(draft.window, 10) || 20) };
    const base = { type, sources: [parseInt(draft.sources?.[0], 10) || 0, parseInt(draft.sources?.[1], 10) || 1] };
    if (type === "difference") return { ...base, absDiff: !!draft.absDiff, unwrapDiff: !!draft.unwrapDiff };
    return base;
  }, []);

  const createDerivedPen = useCallback((draft) => {
    if (!data) return;
    const type = draft.type || "equation";
    const nextIdx = data.signals.length;
    const cfg = toDerivedCfg(draft);
    const friendly = type === "rolling_avg" ? `RollingAvg(s${cfg.source}, ${cfg.window})` :
      type === "equation" ? `Eq: ${cfg.expression}` :
      type === "difference" ? `diff(${(cfg.sources || []).map(s => `s${s}`).join(", ")})${cfg.absDiff ? " abs" : ""}${cfg.unwrapDiff ? " unwrap" : ""}` :
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
    signalState.setVisible(v => [...v, true]);
    signalState.setGroups(g => [...g, parseInt(draft.groupIdx, 10) || 1]);
    signalState.setMetadata(m => ({ ...m, [nextIdx]: { ...(m[nextIdx] || {}), displayName: baseName } }));
    const targetGroup = parseInt(draft.groupIdx, 10) || 1;
    signalState.setSignalStyles(s => ({ ...s, [nextIdx]: { color: gc[(targetGroup - 1) % gc.length], dash: "dashed", strokeMode: "dashed", thickness: 1.8, opacity: 0.95 } }));
    showToast(`Derived pen added to Group ${targetGroup}`, "success");
  }, [data, derivedConfigs, recomputeDerivedSignals, gc, showToast, toDerivedCfg, signalState]);

  const updateDerivedPen = useCallback((idx, draft) => {
    if (!data || !derivedConfigs[idx]) return;
    const cfg = toDerivedCfg(draft);
    const targetGroup = parseInt(draft.groupIdx, 10) || signalState.groups[idx] || 1;
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
    signalState.setGroups(g => { const n = [...g]; n[idx] = targetGroup; return n; });
    signalState.setMetadata(m => ({ ...m, [idx]: { ...(m[idx] || {}), displayName: baseName } }));
    showToast(`Derived pen updated`, "success");
  }, [data, derivedConfigs, signalState, recomputeDerivedSignals, showToast, toDerivedCfg]);

  const deleteDerivedPen = useCallback((idx) => {
    if (!data || !data.signals[idx]?.isDerived) return;
    const deletedName = signalState.metadata[idx]?.displayName || data.tagNames[idx] || `Derived ${idx}`;
    const nextBaseData = {
      ...data,
      tagNames: data.tagNames.filter((_, i) => i !== idx),
      signals: data.signals.filter((_, i) => i !== idx),
    };
    const nextDerivedCfgs = {};
    Object.entries(derivedConfigs || {}).forEach(([k, cfg]) => {
      const oldIdx = parseInt(k, 10);
      if (Number.isNaN(oldIdx) || oldIdx === idx) return;
      const newIdx = oldIdx > idx ? oldIdx - 1 : oldIdx;
      nextDerivedCfgs[newIdx] = remapDerivedConfig(cfg, idx);
    });
    const recomputed = recomputeDerivedSignals(nextBaseData, nextDerivedCfgs);
    setData(recomputed);
    setDerivedConfigs(nextDerivedCfgs);
    signalState.setVisible(prev => prev.filter((_, i) => i !== idx));
    signalState.setGroups(prev => prev.filter((_, i) => i !== idx));
    signalState.setMetadata(prev => shiftIndexedMap(prev, idx));
    signalState.setSignalStyles(prev => shiftIndexedMap(prev, idx));
    signalState.setAvgWindow(prev => shiftIndexedMap(prev, idx));
    signalState.setHideOriginal(prev => shiftIndexedMap(prev, idx));
    setDerivedDialog(prev => (prev.editIdx === idx ? { ...prev, open: false, editIdx: null, initialDraft: null } : prev));
    showToast(`Deleted derived pen: ${deletedName}`, "success");
  }, [data, derivedConfigs, signalState, recomputeDerivedSignals, showToast]);

  return {
    derivedConfigs, setDerivedConfigs,
    derivedDialog, setDerivedDialog,
    recomputeDerivedSignals,
    createDerivedPen, updateDerivedPen, deleteDerivedPen,
  };
}
