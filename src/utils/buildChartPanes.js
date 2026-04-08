export function buildMovingAverage(values, win) {
  const avgVals = new Array(values.length);
  const buf = [];
  let bufSum = 0;
  for (let j = 0; j < values.length; j++) {
    if (values[j] !== null) {
      buf.push(values[j]);
      bufSum += values[j];
      if (buf.length > win) bufSum -= buf.shift();
      avgVals[j] = bufSum / buf.length;
    } else {
      avgVals[j] = buf.length > 0 ? bufSum / buf.length : null;
    }
  }
  return avgVals;
}

export function buildChartPanes({
  data,
  visible,
  groups,
  signalStyles,
  metadata,
  avgWindow,
  hideOriginal,
  getDisplayName,
  getGroupLabel,
  getAutoSignalColor,
  theme,
  palette,
  resolveSeam,
  paneIdPrefix = 'group',
}) {
  if (!data) return [];
  const paneMap = new Map();

  data.signals.forEach((signal, i) => {
    if (!visible?.[i]) return;
    const g = groups?.[i] || 1;
    if (!paneMap.has(g)) paneMap.set(g, []);

    const style = signalStyles?.[i] || {};
    const baseColor = style.color || getAutoSignalColor(theme, i) || palette[i % palette.length];
    const baseDash = style.dash || 'solid';
    const baseStrokeMode = style.strokeMode || baseDash || 'solid';
    const baseThickness = Math.max(0.6, Number(style.thickness) || (signal.isDigital ? 2 : 1.5));
    const baseOpacity = Math.max(0.1, Math.min(1, Number(style.opacity) || 0.92));
    const seamCfg = resolveSeam ? resolveSeam(style, signal.values) : null;
    const seam = seamCfg?.active ? { offset: seamCfg.offset, origin: seamCfg.origin, span: seamCfg.span } : null;

    if (!hideOriginal?.[i]) {
      paneMap.get(g).push({
        signal,
        originalIndex: i,
        displayName: getDisplayName(i),
        unit: metadata?.[i]?.unit || '',
        color: baseColor,
        dash: baseDash,
        strokeMode: baseStrokeMode,
        thickness: baseThickness,
        opacity: baseOpacity,
        seam,
        isAvg: !!signal.isDerived,
      });
    }

    const win = avgWindow?.[i] || 0;
    if (win > 0) {
      paneMap.get(g).push({
        signal: { values: buildMovingAverage(signal.values, win), isDigital: false },
        originalIndex: i,
        displayName: `${getDisplayName(i)} (avg ${win})`,
        unit: metadata?.[i]?.unit || '',
        color: baseColor,
        dash: 'dashed',
        strokeMode: 'dashed',
        thickness: Math.max(0.6, baseThickness * 0.9),
        opacity: Math.max(0.2, baseOpacity - 0.1),
        seam,
        isAvg: true,
        parentIndex: i,
      });
    }
  });

  return [...paneMap.keys()]
    .sort((a, b) => a - b)
    .map((g) => ({
      id: `${paneIdPrefix}-${g}`,
      entries: paneMap.get(g),
      label: getGroupLabel(g),
      groupIdx: g,
    }))
    .filter((pane) => pane.entries.length > 0);
}
