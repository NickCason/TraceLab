// test/components/AppHeader.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import AppHeader from '../../src/components/AppHeader.jsx';
import { THEMES } from '../../src/constants/theme.js';

const t = THEMES.dark;

const mkData = () => ({
  timestamps: [0, 1, 2],
  signals: [{ name: 'S0', values: [1, 2, 3], isDigital: false }],
  tagNames: ['Tag0'],
  meta: { trendName: 'TestTrend', samplePeriod: 5, sampleUnit: 'ms' },
});

const mkProps = (overrides = {}) => ({
  t,
  theme: 'dark',
  setTheme: vi.fn(),
  data: mkData(),
  rebaseOffset: 0,
  importMode: null,
  comparisonData: null,
  deltaMode: false,
  showPills: true,
  showEdgeValues: false,
  showExtrema: false,
  isCombined: true,
  fileInputRef: { current: null },
  projectInputRef: { current: null },
  setDeltaMode: vi.fn(),
  setShowPills: vi.fn(),
  setShowEdgeValues: vi.fn(),
  setShowExtrema: vi.fn(),
  setCursorIdx: vi.fn(),
  setCursor2Idx: vi.fn(),
  setDeltaLocked: vi.fn(),
  combineAll: vi.fn(),
  soloAll: vi.fn(),
  resetZoom: vi.fn(),
  exportSnapshot: vi.fn(),
  saveProject: vi.fn(),
  loadProject: vi.fn(),
  handleFile: vi.fn(),
  setTutorialOpen: vi.fn(),
  setImportDialogOpen: vi.fn(),
  setImportMode: vi.fn(),
  setComparisonData: vi.fn(),
  setComparisonState: vi.fn(),
  setActiveSidebarDataset: vi.fn(),
  ...overrides,
});

describe('AppHeader', () => {
  it('renders the TraceLab brand name', () => {
    const { container } = render(<AppHeader {...mkProps()} />);
    expect(container.textContent).toContain('TraceLab');
  });

  it('renders the trend name from data.meta', () => {
    const { container } = render(<AppHeader {...mkProps()} />);
    expect(container.textContent).toContain('TestTrend');
  });

  it('shows REBASED badge when rebaseOffset is non-zero', () => {
    const { container } = render(<AppHeader {...mkProps({ rebaseOffset: 5000 })} />);
    expect(container.textContent).toContain('REBASED');
  });

  it('does not show REBASED badge when rebaseOffset is 0', () => {
    const { container } = render(<AppHeader {...mkProps({ rebaseOffset: 0 })} />);
    expect(container.textContent).not.toContain('REBASED');
  });
});
