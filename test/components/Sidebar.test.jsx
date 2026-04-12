// test/components/Sidebar.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import Sidebar from '../../src/components/sidebar/Sidebar.jsx';
import { THEMES } from '../../src/constants/theme.js';

const t = THEMES.dark;

const mkData = () => ({
  timestamps: [0, 1, 2],
  signals: [{ name: 'S0', values: [1, 2, 3], isDigital: false }],
  tagNames: ['Tag0'],
  meta: { trendName: 'T', samplePeriod: 5, sampleUnit: 'ms' },
});

const mkProps = (activePanel = 'signals') => ({
  t,
  theme: 'dark',
  data: mkData(),
  activePanel,
  setActivePanel: vi.fn(),
  gc: t.sigColors,
  // signals tab
  visible: [true],
  groups: [1],
  signalStyles: {},
  metadata: {},
  cursorValues: null,
  cursor2Values: null,
  deltaMode: false,
  referenceOverlays: {},
  derivedConfigs: {},
  comparisonData: null,
  comparisonState: null,
  updateComparisonState: vi.fn(),
  getDisplayName: (i) => `Tag${i}`,
  getGroupLabel: (g) => `Group ${g}`,
  toggleSignal: vi.fn(),
  toggleGroup: vi.fn(),
  setGroup: vi.fn(),
  onEditDerived: undefined,
  deleteDerivedPen: vi.fn(),
  setGroupNames: vi.fn(),
  addOverlay: vi.fn(),
  updateOverlay: vi.fn(),
  deleteOverlay: vi.fn(),
  onStyleChange: vi.fn(),
  handleRenameDisplay: vi.fn(),
  setDerivedDialog: vi.fn(),
  // stats tab
  viewRange: [0, 3],
  // meta tab
  editingMeta: null,
  setEditingMeta: vi.fn(),
  setMetadata: vi.fn(),
  // rebase tab
  rebaseOffset: 0,
  rebaseInput: '',
  setRebaseInput: vi.fn(),
  applyRebase: vi.fn(),
  clearRebase: vi.fn(),
  // export tab
  activeSidebarDataset: 'primary',
  setActiveSidebarDataset: vi.fn(),
  importMode: null,
  showToast: vi.fn(),
});

describe('Sidebar', () => {
  it('renders the signals tab without throwing', () => {
    expect(() => render(<Sidebar {...mkProps('signals')} />)).not.toThrow();
  });

  it('renders the stats tab without throwing', () => {
    expect(() => render(<Sidebar {...mkProps('stats')} />)).not.toThrow();
  });

  it('renders the meta tab without throwing', () => {
    expect(() => render(<Sidebar {...mkProps('meta')} />)).not.toThrow();
  });

  it('renders the rebase tab without throwing', () => {
    expect(() => render(<Sidebar {...mkProps('rebase')} />)).not.toThrow();
  });
});
