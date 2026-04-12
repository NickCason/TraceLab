import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChartPanes } from '../../src/hooks/useChartPanes.js';
import { THEMES } from '../../src/constants/theme.js';

const mkData = (signalCount = 3) => ({
  timestamps: Array.from({ length: 50 }, (_, i) => i),
  signals: Array.from({ length: signalCount }, (_, i) => ({
    values: Array.from({ length: 50 }, (_, j) => j * (i + 1)),
    isDigital: false,
  })),
  tagNames: Array.from({ length: signalCount }, (_, i) => `S${i}`),
  meta: {},
});

const mkSignalState = (signalCount = 3) => ({
  visible: Array.from({ length: signalCount }, () => true),
  groups: Array.from({ length: signalCount }, (_, i) => (i % 4) + 1),
  signalStyles: {},
  metadata: {},
  avgWindow: {},
  hideOriginal: {},
  groupNames: {},
  showEdgeValues: false,
  viewRange: [0, 50],
});

const mkFileIO = () => ({ comparisonData: null, comparisonState: null });

describe('useChartPanes', () => {
  it('returns a non-empty chartPanes array for valid data', () => {
    const data = mkData(3);
    const signalState = mkSignalState(3);
    const t = THEMES.dark;

    const { result } = renderHook(() =>
      useChartPanes(data, signalState, mkFileIO(), 'dark', t)
    );

    expect(Array.isArray(result.current.chartPanes)).toBe(true);
    expect(result.current.chartPanes.length).toBeGreaterThan(0);
  });

  it('returns empty chartPanes when data is null', () => {
    const { result } = renderHook(() =>
      useChartPanes(null, mkSignalState(0), mkFileIO(), 'dark', THEMES.dark)
    );
    expect(result.current.chartPanes).toEqual([]);
  });

  it('returns empty comparisonChartPanes when comparisonData is null', () => {
    const { result } = renderHook(() =>
      useChartPanes(mkData(2), mkSignalState(2), mkFileIO(), 'dark', THEMES.dark)
    );
    expect(result.current.comparisonChartPanes).toEqual([]);
  });

  it('globalEdgeLabelWidth is 0 when showEdgeValues is false', () => {
    const signalState = { ...mkSignalState(2), showEdgeValues: false };
    const { result } = renderHook(() =>
      useChartPanes(mkData(2), signalState, mkFileIO(), 'dark', THEMES.dark)
    );
    expect(result.current.globalEdgeLabelWidth).toBe(0);
  });

  it('globalLeftEdgeLabelWidth is 0 when showEdgeValues is false', () => {
    const signalState = { ...mkSignalState(2), showEdgeValues: false };
    const { result } = renderHook(() =>
      useChartPanes(mkData(2), signalState, mkFileIO(), 'dark', THEMES.dark)
    );
    expect(result.current.globalLeftEdgeLabelWidth).toBe(0);
  });

  it('each pane has an entries array and a groupIdx', () => {
    const data = mkData(4);
    const signalState = mkSignalState(4);
    const { result } = renderHook(() =>
      useChartPanes(data, signalState, mkFileIO(), 'dark', THEMES.dark)
    );
    result.current.chartPanes.forEach(pane => {
      expect(Array.isArray(pane.entries)).toBe(true);
      expect(pane.groupIdx).toBeTruthy();
    });
  });
});
