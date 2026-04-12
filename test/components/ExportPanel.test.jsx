// test/components/ExportPanel.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ExportPanel from '../../src/components/ExportPanel.jsx';

vi.mock('../../src/utils/download.js', () => ({
  downloadBlob: vi.fn(),
}));

const mkData = (signalCount = 3) => ({
  timestamps: Array.from({ length: 20 }, (_, i) => 1700000000000 + i * 5),
  signals: Array.from({ length: signalCount }, (_, i) => ({
    name: `S${i}`,
    values: Array.from({ length: 20 }, (_, j) => j * (i + 1)),
    isDigital: false,
  })),
  tagNames: Array.from({ length: signalCount }, (_, i) => `Tag${i}`),
  meta: { samplePeriod: 5, sampleUnit: 'ms', trendName: 'TestTrend', controller: 'TestCtrl' },
});

const mkProps = (overrides = {}) => ({
  data: mkData(3),
  metadata: {},
  viewRange: [0, 20],
  getDisplayName: (i) => `Tag${i}`,
  theme: 'dark',
  onToast: vi.fn(),
  rebaseOffset: 0,
  ...overrides,
});

describe('ExportPanel', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders a tag for each signal', () => {
    const { container } = render(<ExportPanel {...mkProps()} />);
    expect(container.textContent).toContain('Tag0');
    expect(container.textContent).toContain('Tag1');
    expect(container.textContent).toContain('Tag2');
  });

  it('exportPens resets to all-true when data prop changes', () => {
    const props = mkProps();
    const { rerender, container } = render(<ExportPanel {...props} />);

    // Click NONE to deselect all
    const noneBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'NONE');
    fireEvent.click(noneBtn);

    // Load new data
    const newData = mkData(2);
    rerender(<ExportPanel {...props} data={newData} />);

    // Now there should be 2 tags and EXPORT button enabled
    expect(container.textContent).toContain('Tag0');
    expect(container.textContent).toContain('Tag1');
    // Export button should be enabled (not greyed) — all pens reset to selected
    const exportBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'EXPORT CSV');
    expect(exportBtn.disabled).toBe(false);
  });

  it('NONE deselects all signals and disables export', () => {
    const { container } = render(<ExportPanel {...mkProps()} />);
    const noneBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'NONE');
    fireEvent.click(noneBtn);
    const exportBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'EXPORT CSV');
    expect(exportBtn.disabled).toBe(true);
  });

  it('ALL re-selects all signals after NONE', () => {
    const { container } = render(<ExportPanel {...mkProps()} />);
    const noneBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'NONE');
    fireEvent.click(noneBtn);
    const allBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'ALL');
    fireEvent.click(allBtn);
    const exportBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'EXPORT CSV');
    expect(exportBtn.disabled).toBe(false);
  });
});
