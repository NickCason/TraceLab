// test/components/ToolBtn.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ToolBtn from '../../src/components/ToolBtn.jsx';
import { THEMES } from '../../src/constants/theme.js';

const t = THEMES.dark;

describe('ToolBtn', () => {
  it('renders its children', () => {
    const { container } = render(<ToolBtn t={t} onClick={vi.fn()}>Delta</ToolBtn>);
    expect(container.textContent).toBe('Delta');
  });

  it('applies active background color when active is true', () => {
    const { container } = render(
      <ToolBtn t={t} active={true} activeColor="#00ff00" onClick={vi.fn()}>Btn</ToolBtn>
    );
    const btn = container.querySelector('button');
    expect(btn.style.color).toBe('#00ff00');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    const { container } = render(<ToolBtn t={t} onClick={onClick}>Click</ToolBtn>);
    fireEvent.click(container.querySelector('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
