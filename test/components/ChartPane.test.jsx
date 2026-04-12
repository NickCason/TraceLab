// test/components/ChartPane.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { installCanvasMock } from '../setup/mockCanvas.js';
import ChartPane from '../../src/components/ChartPane.jsx';

let ctx;
beforeEach(() => { ctx = installCanvasMock(); });
afterEach(() => { ctx._restore(); vi.restoreAllMocks(); });

const mkSignalEntries = () => [
  {
    signal: { name: 'S0', values: Array.from({ length: 20 }, (_, i) => i), isDigital: false, isDerived: false },
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
  },
];

const mkProps = (overrides = {}) => ({
  timestamps: Array.from({ length: 20 }, (_, i) => 1700000000000 + i * 5),
  signalEntries: mkSignalEntries(),
  cursorIdx: null,
  setCursorIdx: vi.fn(),
  cursor2Idx: null,
  setCursor2Idx: vi.fn(),
  deltaMode: false,
  viewRange: [0, 20],
  setViewRange: vi.fn(),
  showTimeAxis: true,
  label: 'Group A',
  compact: false,
  theme: 'dark',
  rebaseOffset: 0,
  groupColor: '#39f',
  showPills: true,
  showEdgeValues: false,
  unifyRange: false,
  referenceOverlays: [],
  onOverlayChange: vi.fn(),
  deltaLocked: false,
  setDeltaLocked: vi.fn(),
  globalEdgeLabelWidth: 0,
  globalLeftEdgeLabelWidth: 0,
  showExtrema: false,
  ...overrides,
});

describe('ChartPane', () => {
  it('renders without throwing', () => {
    expect(() => render(<ChartPane {...mkProps()} />)).not.toThrow();
  });

  it('renders a canvas element', () => {
    const { container } = render(<ChartPane {...mkProps()} />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('renders without throwing when signalEntries is empty', () => {
    expect(() => render(<ChartPane {...mkProps({ signalEntries: [] })} />)).not.toThrow();
  });
});
