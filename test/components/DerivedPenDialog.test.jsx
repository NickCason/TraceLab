// test/components/DerivedPenDialog.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import DerivedPenDialog from '../../src/components/DerivedPenDialog.jsx';

const mkProps = (overrides = {}) => ({
  open: true,
  mode: 'create',
  theme: 'dark',
  signals: [{ name: 'S0' }, { name: 'S1' }],
  groups: [1, 1],
  defaultGroupIdx: 1,
  defaultType: 'equation',
  initialDraft: null,
  getDisplayName: (i) => `Tag${i}`,
  getGroupLabel: (g) => `Group ${g}`,
  onCancel: vi.fn(),
  onCreate: vi.fn(),
  ...overrides,
});

describe('DerivedPenDialog', () => {
  it('renders when open is true', () => {
    const { container } = render(<DerivedPenDialog {...mkProps()} />);
    expect(container.textContent).toContain('Add Derived Pen');
  });

  it('renders nothing when open is false', () => {
    const { container } = render(<DerivedPenDialog {...mkProps({ open: false })} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    const { container } = render(<DerivedPenDialog {...mkProps({ onCancel })} />);
    const cancelBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Cancel');
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCreate when Create Derived button is clicked with a valid expression', () => {
    const onCreate = vi.fn();
    const { container } = render(<DerivedPenDialog {...mkProps({ onCreate })} />);
    const createBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Create Derived');
    fireEvent.click(createBtn);
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0][0]).toMatchObject({ type: 'equation', expression: 's0 - s1' });
  });

  it('pre-populates fields from initialDraft when provided', () => {
    const draft = { type: 'equation', expression: 's0 + s1', name: 'My Pen', groupIdx: 2 };
    const { container } = render(<DerivedPenDialog {...mkProps({ initialDraft: draft })} />);
    const textarea = container.querySelector('textarea');
    expect(textarea.value).toBe('s0 + s1');
  });

  it('shows Edit Derived Pen title in edit mode', () => {
    const { container } = render(<DerivedPenDialog {...mkProps({ mode: 'edit' })} />);
    expect(container.textContent).toContain('Edit Derived Pen');
  });

  it('does not call onCreate when expression is empty', () => {
    const onCreate = vi.fn();
    const { container } = render(<DerivedPenDialog {...mkProps({ onCreate })} />);
    const textarea = container.querySelector('textarea');
    fireEvent.change(textarea, { target: { value: '' } });
    const createBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Create Derived');
    fireEvent.click(createBtn);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('shows window range slider when type is rolling_avg', () => {
    const { container } = render(<DerivedPenDialog {...mkProps()} />);
    const typeSelect = container.querySelector('select');
    fireEvent.change(typeSelect, { target: { value: 'rolling_avg' } });
    const rangeInput = container.querySelector('input[type="range"]');
    expect(rangeInput).toBeTruthy();
  });

  it('inserts variable token into expression when token button is clicked', () => {
    const { container } = render(<DerivedPenDialog {...mkProps()} />);
    // Token buttons appear in the Variables section; find the first one (s0)
    const tokenButtons = Array.from(container.querySelectorAll('button')).filter(b => /^s\d+$/.test(b.textContent.trim()));
    expect(tokenButtons.length).toBeGreaterThan(0);
    const textarea = container.querySelector('textarea');
    const before = textarea.value;
    fireEvent.click(tokenButtons[0]);
    // After click, expression should contain the appended token
    expect(textarea.value).toContain(tokenButtons[0].textContent.trim());
    expect(textarea.value.length).toBeGreaterThan(before.length);
  });
});
