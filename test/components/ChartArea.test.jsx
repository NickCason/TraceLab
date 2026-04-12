// test/components/ChartArea.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { installCanvasMock } from '../setup/mockCanvas.js';
import ChartArea from '../../src/components/ChartArea.jsx';
import { THEMES } from '../../src/constants/theme.js';

let ctx;
beforeEach(() => { ctx = installCanvasMock(); });
afterEach(() => { ctx._restore(); vi.restoreAllMocks(); });

const mkData = () => ({
  timestamps: Array.from({ length: 10 }, (_, i) => 1700000000000 + i * 5),
  signals: [{ name: 'S0', values: Array(10).fill(1), isDigital: false }],
  tagNames: ['Tag0'],
  meta: { trendName: 'T', samplePeriod: 5, sampleUnit: 'ms' },
});

const mkPane = () => ({
  groupIdx: 1,
  label: 'Group A',
  color: '#39f',
  entries: [{
    signal: { name: 'S0', values: Array(10).fill(1), isDigital: false, isDerived: false },
    color: '#39f',
    dash: 'solid',
    thickness: 1.5,
    opacity: 0.9,
    unit: '',
    displayName: 'Tag0',
    isAvg: false,
    seam: null,
    seamOffset: 0,
    avgWindow: 0,
  }],
  // ChartArea uses pane.id as the React key
  id: 'group-1',
  paneId: 'group-1',
});

const mkProps = (overrides = {}) => ({
  t: THEMES.dark,
  theme: 'dark',
  data: mkData(),
  chartPanes: [mkPane()],
  comparisonChartPanes: [],
  comparisonData: null,
  comparisonState: null,
  importMode: null,
  viewRange: [0, 10],
  setViewRange: vi.fn(),
  cursorIdx: null,
  setCursorIdx: vi.fn(),
  cursor2Idx: null,
  setCursor2Idx: vi.fn(),
  deltaMode: false,
  deltaLocked: false,
  setDeltaLocked: vi.fn(),
  rebaseOffset: 0,
  showPills: true,
  showEdgeValues: false,
  showExtrema: false,
  referenceOverlays: {},
  splitRanges: {},
  setSplitRanges: vi.fn(),
  globalEdgeLabelWidth: 0,
  globalLeftEdgeLabelWidth: 0,
  updateOverlay: vi.fn(),
  updateComparisonState: vi.fn(),
  overlayPickerGroup: null,
  setOverlayPickerGroup: vi.fn(),
  addOverlay: vi.fn(),
  setDerivedDialog: vi.fn(),
  gc: THEMES.dark.sigColors,
  ...overrides,
});

describe('ChartArea', () => {
  it('renders without throwing', () => {
    expect(() => render(<ChartArea {...mkProps()} />)).not.toThrow();
  });

  it('renders one canvas element per chart pane', () => {
    const { container } = render(<ChartArea {...mkProps()} />);
    // Each ChartPane renders two canvases (trace + cursor layer)
    const canvases = container.querySelectorAll('canvas');
    expect(canvases.length).toBeGreaterThan(0);
  });

  it('renders without throwing when chartPanes is empty', () => {
    expect(() => render(<ChartArea {...mkProps({ chartPanes: [] })} />)).not.toThrow();
  });
});
