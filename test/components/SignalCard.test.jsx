import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import SignalCard from '../../src/components/SignalCard.jsx';

const defaultProps = {
  index: 0,
  signal: { values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  color: '#39f',
  dash: 'solid',
  strokeMode: 'solid',
  thickness: 1.5,
  opacity: 0.92,
  displayName: 'MotorSpeed',
  tagName: 'MotorSpeed',
  unit: 'rpm',
  visible: true,
  cursorValue: null,
  cursorValueIsInterpolated: false,
  cursor2Value: null,
  deltaMode: false,
  isDigital: false,
  isDerived: false,
  derivedType: null,
  seamOffset: 0,
  onEditDerived: vi.fn(),
  onDeleteDerived: vi.fn(),
  onToggleVisible: vi.fn(),
  onStyleChange: vi.fn(),
  onRenameDisplay: vi.fn(),
  theme: 'dark',
};

describe('SignalCard', () => {
  it('renders the display name', () => {
    const { container } = render(<SignalCard {...defaultProps} />);
    expect(container.textContent).toContain('MotorSpeed');
  });

  it('calls onToggleVisible with the signal index when visibility checkbox is clicked', () => {
    const onToggleVisible = vi.fn();
    const { container } = render(<SignalCard {...defaultProps} onToggleVisible={onToggleVisible} />);
    const toggleDiv = container.querySelector('[title="Hide signal"]');
    fireEvent.click(toggleDiv);
    expect(onToggleVisible).toHaveBeenCalledWith(0);
  });

  it('renders unit label when unit is provided', () => {
    const { container } = render(<SignalCard {...defaultProps} unit="rpm" />);
    expect(container.textContent).toContain('[rpm]');
  });

  it('renders DIG badge for digital signals', () => {
    const { container } = render(<SignalCard {...defaultProps} isDigital={true} />);
    expect(container.textContent).toContain('DIG');
  });

  it('renders sparkline SVG for a signal with values', () => {
    const { container } = render(<SignalCard {...defaultProps} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders with reduced opacity when not visible', () => {
    const { container } = render(<SignalCard {...defaultProps} visible={false} />);
    const card = container.firstChild;
    expect(card.style.opacity).toBe('0.3');
  });
});
