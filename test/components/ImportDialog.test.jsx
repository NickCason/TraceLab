// test/components/ImportDialog.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ImportDialog from '../../src/components/ImportDialog.jsx';
import { THEMES } from '../../src/constants/theme.js';

const mkExistingData = () => ({
  timestamps: Array.from({ length: 10 }, (_, i) => 1700000000000 + i * 5),
  signals: [{ name: 'S0', values: Array(10).fill(1), isDigital: false }],
  tagNames: ['Tag0'],
  meta: { samplePeriod: 5, sampleUnit: 'ms' },
});

const mkProps = (overrides = {}) => ({
  open: true,
  onClose: vi.fn(),
  existingData: mkExistingData(),
  theme: 'dark',
  t: THEMES.dark,
  onImportUnified: vi.fn(),
  onImportComparison: vi.fn(),
  ...overrides,
});

describe('ImportDialog', () => {
  it('renders when open is true', () => {
    const { container } = render(<ImportDialog {...mkProps()} />);
    expect(container.textContent).toContain('Import CSV');
  });

  it('renders nothing when open is false', () => {
    const { container } = render(<ImportDialog {...mkProps({ open: false })} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<ImportDialog {...mkProps({ onClose })} />);
    const cancelBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Cancel');
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Next button is disabled before a file is selected', () => {
    const { container } = render(<ImportDialog {...mkProps()} />);
    const nextBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Next'));
    expect(nextBtn.disabled).toBe(true);
  });

  it('shows Unified and Comparison mode cards', () => {
    const { container } = render(<ImportDialog {...mkProps()} />);
    expect(container.textContent).toContain('Unified');
    expect(container.textContent).toContain('Comparison');
  });
});
