import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import ClearConfirmDialog from '../../src/components/ClearConfirmDialog.jsx';
import { THEMES } from '../../src/constants/theme.js';

afterEach(() => { cleanup(); });

const t = THEMES.dark;

const mkProps = (overrides = {}) => ({
  open: true,
  trendName: 'Drive_Test_03',
  t,
  onCancel: vi.fn(),
  onDiscardAndClear: vi.fn(),
  onSaveAndClear: vi.fn(),
  ...overrides,
});

describe('ClearConfirmDialog', () => {
  it('does not render when open is false', () => {
    const { container } = render(<ClearConfirmDialog {...mkProps({ open: false })} />);
    expect(container.querySelector('#dialog-clear-confirm')).toBeNull();
  });

  it('renders the trend name in the body when open', () => {
    const { container } = render(<ClearConfirmDialog {...mkProps()} />);
    expect(container.querySelector('#dialog-clear-confirm')).not.toBeNull();
    expect(container.textContent).toContain('Drive_Test_03');
  });

  it('Cancel button calls onCancel', () => {
    const onCancel = vi.fn();
    const { getByText } = render(<ClearConfirmDialog {...mkProps({ onCancel })} />);
    fireEvent.click(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Discard & clear button calls onDiscardAndClear', () => {
    const onDiscardAndClear = vi.fn();
    const { getByText } = render(<ClearConfirmDialog {...mkProps({ onDiscardAndClear })} />);
    fireEvent.click(getByText('Discard & clear'));
    expect(onDiscardAndClear).toHaveBeenCalledTimes(1);
  });

  it('Save & clear button calls onSaveAndClear', () => {
    const onSaveAndClear = vi.fn();
    const { getByText } = render(<ClearConfirmDialog {...mkProps({ onSaveAndClear })} />);
    fireEvent.click(getByText('Save & clear'));
    expect(onSaveAndClear).toHaveBeenCalledTimes(1);
  });

  it('Escape key calls onCancel', () => {
    const onCancel = vi.fn();
    render(<ClearConfirmDialog {...mkProps({ onCancel })} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('clicking the backdrop calls onCancel', () => {
    const onCancel = vi.fn();
    const { container } = render(<ClearConfirmDialog {...mkProps({ onCancel })} />);
    const backdrop = container.querySelector('[data-testid="dialog-backdrop"]');
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('clicking inside the dialog body does not call onCancel', () => {
    const onCancel = vi.fn();
    const { container } = render(<ClearConfirmDialog {...mkProps({ onCancel })} />);
    const dialog = container.querySelector('#dialog-clear-confirm');
    fireEvent.click(dialog);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
