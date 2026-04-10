// src/utils/signalRemapping.js
import { clampSeamPercent, hasSeamAdjustment, inferSeamDomain, seamPercentToOffset, seamOffsetToPercent } from "./seamAdjustment.js";

const SIGNAL_TOKEN_PATTERN = /\bs(\d+)\b/g;

export function remapSignalIndex(sigIdx, removedIdx) {
  if (sigIdx === removedIdx) return null;
  if (sigIdx > removedIdx) return sigIdx - 1;
  return sigIdx;
}

export function shiftIndexedMap(mapObj, removedIdx) {
  const next = {};
  Object.entries(mapObj || {}).forEach(([k, v]) => {
    const idx = parseInt(k, 10);
    if (Number.isNaN(idx) || idx === removedIdx) return;
    next[idx > removedIdx ? idx - 1 : idx] = v;
  });
  return next;
}

export function remapEquationExpression(expression, removedIdx) {
  return (expression || "").replace(SIGNAL_TOKEN_PATTERN, (_, rawIdx) => {
    const mapped = remapSignalIndex(parseInt(rawIdx, 10), removedIdx);
    return mapped === null ? "NaN" : `s${mapped}`;
  });
}

export function remapDerivedConfig(cfg, removedIdx) {
  if (!cfg) return cfg;
  if (cfg.type === "rolling_avg") {
    const source = remapSignalIndex(cfg.source ?? 0, removedIdx);
    return source === null ? { ...cfg, source: 0, invalidRef: true } : { ...cfg, source };
  }
  if (cfg.type === "difference" || cfg.type === "sum" || cfg.type === "ratio" || cfg.type === "product" || cfg.type === "min" || cfg.type === "max") {
    const [a = 0, b = 1] = cfg.sources || [];
    const sourceA = remapSignalIndex(a, removedIdx);
    const sourceB = remapSignalIndex(b, removedIdx);
    if (sourceA === null || sourceB === null) return { ...cfg, sources: [0, 1], invalidRef: true };
    return { ...cfg, sources: [sourceA, sourceB] };
  }
  if (cfg.type === "equation") return { ...cfg, expression: remapEquationExpression(cfg.expression, removedIdx) };
  return cfg;
}

export function resolveSignalSeam(styleCfg, values) {
  const domain = inferSeamDomain(values);
  const percent = styleCfg?.seamOffsetPct !== undefined
    ? Number(styleCfg.seamOffsetPct) || 0
    : seamOffsetToPercent(styleCfg?.seamOffset || 0, domain.span);
  const boundedPercent = clampSeamPercent(percent);
  const offset = seamPercentToOffset(boundedPercent, domain.span);
  return { ...domain, percent: boundedPercent, offset, active: hasSeamAdjustment({ offset }) };
}

export function shiftSeriesBackward(values, shiftSamples) {
  const shift = Math.max(0, Number(shiftSamples) || 0);
  if (shift <= 1e-9) return values;
  const shifted = new Array(values.length).fill(null);
  for (let i = 0; i < values.length; i++) {
    const srcPos = i + shift;
    const lo = Math.floor(srcPos);
    const hi = Math.ceil(srcPos);
    if (lo < 0 || hi >= values.length) continue;
    const loV = values[lo];
    const hiV = values[hi];
    if (loV === null && hiV === null) continue;
    if (loV === null) { shifted[i] = hiV; continue; }
    if (hiV === null) { shifted[i] = loV; continue; }
    if (lo === hi) { shifted[i] = loV; continue; }
    const frac = srcPos - lo;
    shifted[i] = loV + (hiV - loV) * frac;
  }
  return shifted;
}
