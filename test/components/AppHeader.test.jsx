// test/components/AppHeader.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
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
  setTutorialOpen: vi.fn(),
  setImportDialogOpen: vi.fn(),
  setImportMode: vi.fn(),
  setComparisonData: vi.fn(),
  setComparisonState: vi.fn(),
  setActiveSidebarDataset: vi.fn(),
  projectMenuOpen: false,
  setProjectMenuOpen: vi.fn(),
  onClearRequest: vi.fn(),
  onLoadCsvRequest: vi.fn(),
  onLoadProjectRequest: vi.fn(),
  onSaveAndClear: vi.fn(),
  onSaveProject: vi.fn(),
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

  it('renders the project menu trigger and hides the old Save/Load Proj/Load CSV buttons', () => {
    const { container } = render(<AppHeader {...mkProps({
      projectMenuOpen: false,
      setProjectMenuOpen: vi.fn(),
      onClearRequest: vi.fn(),
      onLoadCsvRequest: vi.fn(),
      onLoadProjectRequest: vi.fn(),
      onSaveAndClear: vi.fn(),
    })} />);
    expect(container.querySelector('#btn-project-menu')).not.toBeNull();
    // Old buttons (by their previous IDs) should no longer exist.
    expect(container.querySelector('#btn-save-project')).toBeNull();
    expect(container.querySelector('#btn-load-project')).toBeNull();
    expect(container.querySelector('#btn-load-csv')).toBeNull();
  });

  it('exposes menu items only when projectMenuOpen is true', () => {
    const setProjectMenuOpen = vi.fn();
    const { container, rerender } = render(<AppHeader {...mkProps({
      projectMenuOpen: false, setProjectMenuOpen,
      onClearRequest: vi.fn(), onLoadCsvRequest: vi.fn(),
      onLoadProjectRequest: vi.fn(), onSaveAndClear: vi.fn(),
    })} />);
    expect(container.querySelector('#mi-load-csv')).toBeNull();
    rerender(<AppHeader {...mkProps({
      projectMenuOpen: true, setProjectMenuOpen,
      onClearRequest: vi.fn(), onLoadCsvRequest: vi.fn(),
      onLoadProjectRequest: vi.fn(), onSaveAndClear: vi.fn(),
    })} />);
    expect(container.querySelector('#mi-load-csv')).not.toBeNull();
    expect(container.querySelector('#mi-clear')).not.toBeNull();
  });

  it('clicking Clear menu item invokes onClearRequest', () => {
    const onClearRequest = vi.fn();
    const { container } = render(<AppHeader {...mkProps({
      projectMenuOpen: true,
      setProjectMenuOpen: vi.fn(),
      onClearRequest,
      onLoadCsvRequest: vi.fn(),
      onLoadProjectRequest: vi.fn(),
      onSaveAndClear: vi.fn(),
    })} />);
    fireEvent.click(container.querySelector('#mi-clear'));
    expect(onClearRequest).toHaveBeenCalledTimes(1);
  });
});
