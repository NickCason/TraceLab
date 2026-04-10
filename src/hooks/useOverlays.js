// src/hooks/useOverlays.js
import { useState, useCallback } from "react";
import { OVERLAY_COLOR_SWATCHES } from "../constants/colors";

export function useOverlays(data, groups, visible, viewRange, splitRanges) {
  const [referenceOverlays, setReferenceOverlays] = useState({});
  const [overlayPickerGroup, setOverlayPickerGroup] = useState(null);

  const addOverlay = useCallback((groupIdx, type = "line") => {
    const [baseType, axis] = String(type).includes(":") ? String(type).split(":") : [type, "y"];
    const [start, end] = viewRange;
    const span = Math.max(2, end - start);
    const centerSample = Math.round(start + span / 2);
    const bandHalfSamples = Math.max(2, Math.round(span * 0.12));
    let vMin = 0, vMax = 10;
    if (data?.signals?.length) {
      const groupMembers = [];
      data.signals.forEach((_, i) => {
        if ((groups[i] || 1) === groupIdx && visible[i]) groupMembers.push(i);
      });
      const targetMembers = splitRanges[groupIdx] ? groupMembers.slice(0, 1) : groupMembers;
      let mn = Infinity; let mx = -Infinity;
      targetMembers.forEach((i) => {
        const sig = data.signals[i];
        for (let s = start; s < end; s++) {
          const val = sig.values?.[s];
          if (val === null || val === undefined || Number.isNaN(val)) continue;
          if (val < mn) mn = val;
          if (val > mx) mx = val;
        }
      });
      if (mn !== Infinity && mx !== -Infinity) {
        if (mn === mx) { mn -= 1; mx += 1; }
        vMin = mn; vMax = mx;
      }
    }
    const vSpan = Math.max(0.001, vMax - vMin);
    const vCenter = vMin + vSpan / 2;
    const vHalfBand = vSpan * 0.1;
    const overlay = baseType === "band"
      ? { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: "band", axis: axis || "y", visible: true, min: vCenter - vHalfBand, max: vCenter + vHalfBand, sample: Math.max(0, centerSample - bandHalfSamples), sampleEnd: Math.max(1, centerSample + bandHalfSamples), label: axis === "x" ? "Sample Band" : "Band", color: OVERLAY_COLOR_SWATCHES[groupIdx % OVERLAY_COLOR_SWATCHES.length], opacity: 0.12 }
      : { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: "line", axis: axis || "y", visible: true, value: vCenter, sample: centerSample, label: axis === "x" ? "Sample Marker" : "Reference", color: OVERLAY_COLOR_SWATCHES[groupIdx % OVERLAY_COLOR_SWATCHES.length], dashed: true, opacity: 1 };
    setReferenceOverlays(prev => ({ ...prev, [groupIdx]: [...(prev[groupIdx] || []), overlay] }));
  }, [data, groups, visible, viewRange, splitRanges]);

  const updateOverlay = useCallback((groupIdx, overlayId, updates) => {
    setReferenceOverlays(prev => ({
      ...prev,
      [groupIdx]: (prev[groupIdx] || []).map(o => o.id === overlayId ? { ...o, ...updates } : o),
    }));
  }, []);

  const deleteOverlay = useCallback((groupIdx, overlayId) => {
    setReferenceOverlays(prev => ({
      ...prev,
      [groupIdx]: (prev[groupIdx] || []).filter(o => o.id !== overlayId),
    }));
  }, []);

  return {
    referenceOverlays, setReferenceOverlays,
    overlayPickerGroup, setOverlayPickerGroup,
    addOverlay, updateOverlay, deleteOverlay,
  };
}
