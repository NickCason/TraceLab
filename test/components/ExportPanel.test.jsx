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

  it('toggling an individual pen deselects it but export stays enabled', () => {
    const { container } = render(<ExportPanel {...mkProps()} />);
    // Find the first signal row (contains Tag0 display name)
    const tag0Row = Array.from(container.querySelectorAll('div')).find(
      el => el.textContent === 'Tag0' && el.tagName === 'DIV'
    );
    // The clickable row is the parent div wrapping the checkbox + label
    const clickableRow = tag0Row.parentElement;
    fireEvent.click(clickableRow);
    // Export button should still be enabled because Tag1 and Tag2 remain selected
    const exportBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'EXPORT CSV');
    expect(exportBtn.disabled).toBe(false);
  });

  it('clicking SHOW PREVIEW renders preview content', () => {
    const { container } = render(<ExportPanel {...mkProps()} />);
    const previewBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent === 'SHOW PREVIEW'
    );
    expect(previewBtn).toBeTruthy();
    fireEvent.click(previewBtn);
    // After clicking, preview content with TraceLab header comment should appear
    expect(container.textContent).toContain('# TraceLab Export');
    // The button label should now say HIDE PREVIEW
    const hideBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent === 'HIDE PREVIEW'
    );
    expect(hideBtn).toBeTruthy();
  });

  it('sample rate buttons change the rate display', () => {
    const { container } = render(<ExportPanel {...mkProps()} />);
    // basePeriod=5, baseUnit='ms', so 2x multiplier button is labeled '10ms'
    const rateBtn = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent === '10ms'
    );
    expect(rateBtn).toBeTruthy();
    fireEvent.click(rateBtn);
    // The rate info section should now show '10 ms' in the summary stats
    expect(container.textContent).toContain('10 ms');
    // The decimation message should appear (2nd sample)
    expect(container.textContent).toContain('Every 2nd sample');
  });
});
