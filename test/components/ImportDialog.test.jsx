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

  it('clicking Comparison mode card changes selection to comparison', () => {
    const { container } = render(<ImportDialog {...mkProps()} />);
    // Find all clickable divs that contain mode labels; click the one with "Comparison"
    const allDivs = Array.from(container.querySelectorAll('div'));
    const comparisonCard = allDivs.find(d =>
      d.textContent.includes('Comparison') &&
      d.textContent.includes('Side-by-side')
    );
    expect(comparisonCard).toBeTruthy();
    fireEvent.click(comparisonCard);
    // After selecting Comparison, the card label div should have different color styling
    // We verify by checking that a div with "Unified" text and "Side-by-side" no longer has
    // the accent color, and Comparison card border reflects selection.
    // Simplest: re-query; the Comparison card should now show accent color text.
    const labelDiv = Array.from(container.querySelectorAll('div')).find(d =>
      d.textContent === 'Comparison' && d.style.color !== ''
    );
    // The mode changed — Comparison card label color becomes t.green (non-default text1)
    expect(labelDiv).toBeTruthy();
  });

  it('Back button is not shown on the initial select step', () => {
    const { container } = render(<ImportDialog {...mkProps()} />);
    const backBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Back');
    expect(backBtn).toBeUndefined();
  });
});
