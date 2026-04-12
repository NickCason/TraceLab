import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Toast from '../../src/components/Toast.jsx';

describe('Toast', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders the message text', () => {
    render(<Toast message="Upload complete" type="success" onDone={() => {}} />);
    expect(screen.getByText('Upload complete')).toBeTruthy();
  });

  it('calls onDone after 2800ms', () => {
    const onDone = vi.fn();
    render(<Toast message="hello" type="info" onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2800); });
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('does not call onDone before 2800ms', () => {
    const onDone = vi.fn();
    render(<Toast message="hello" type="info" onDone={onDone} />);
    act(() => { vi.advanceTimersByTime(2799); });
    expect(onDone).not.toHaveBeenCalled();
  });

  it('applies a green-ish background for type=success', () => {
    const { container } = render(<Toast message="ok" type="success" onDone={() => {}} />);
    const div = container.firstChild;
    expect(div.style.background).toContain('52, 211, 153');
  });

  it('applies a red-ish background for type=error', () => {
    const { container } = render(<Toast message="fail" type="error" onDone={() => {}} />);
    const div = container.firstChild;
    expect(div.style.background).toContain('248, 113, 113');
  });
});
