import { buildMovingAverageCached, profilePerf } from './chartPerf.js';

export function buildMovingAverage(values, win) {
  return buildMovingAverageCached(values, win);
}

function makePaneEntry({
  signal,
  index,
  displayName,
  metadata,
  style,
  baseColor,
  seam,
  isAvg = false,
  parentIndex,
}) {
  const baseDash = style.dash || 'solid';
  const baseStrokeMode = style.strokeMode || baseDash || 'solid';
  const baseThickness = Math.max(0.6, Number(style.thickness) || (signal.isDigital ? 2 : 1.5));
  const baseOpacity = Math.max(0.1, Math.min(1, Number(style.opacity) || 0.92));

  return {
    signal,
    originalIndex: index,
    displayName,
    unit: metadata?.unit || '',
    color: baseColor,
    dash: isAvg ? 'dashed' : baseDash,
    strokeMode: isAvg ? 'dashed' : baseStrokeMode,
    thickness: isAvg ? Math.max(0.6, baseThickness * 0.9) : baseThickness,
    opacity: isAvg ? Math.max(0.2, baseOpacity - 0.1) : baseOpacity,
    seam,
    isAvg,
    ...(typeof parentIndex === 'number' ? { parentIndex } : {}),
  };
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
  return profilePerf(`buildChartPanes:${paneIdPrefix}`, () => {
    if (!data) return [];
    const paneMap = new Map();

    data.signals.forEach((signal, i) => {
      if (!visible?.[i]) return;
      const g = groups?.[i] || 1;
      if (!paneMap.has(g)) paneMap.set(g, []);

      const style = signalStyles?.[i] || {};
      const baseColor = style.color || getAutoSignalColor(theme, i) || palette[i % palette.length];
      const seamCfg = resolveSeam ? resolveSeam(style, signal.values) : null;
      const seam = seamCfg?.active ? { offset: seamCfg.offset, origin: seamCfg.origin, span: seamCfg.span } : null;
      const displayName = getDisplayName(i);

      if (!hideOriginal?.[i]) {
        paneMap.get(g).push(makePaneEntry({
          signal,
          index: i,
          displayName,
          metadata: metadata?.[i],
          style,
          baseColor,
          seam,
          isAvg: !!signal.isDerived,
        }));
      }

      const win = avgWindow?.[i] || 0;
      if (win > 0) {
        paneMap.get(g).push(makePaneEntry({
          signal: { values: buildMovingAverageCached(signal.values, win), isDigital: false },
          index: i,
          displayName: `${displayName} (avg ${win})`,
          metadata: metadata?.[i],
          style,
          baseColor,
          seam,
          isAvg: true,
          parentIndex: i,
        }));
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
  });
}
