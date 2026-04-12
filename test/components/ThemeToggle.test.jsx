import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../../src/components/ThemeToggle.jsx';

describe('ThemeToggle', () => {
  it('displays DARK label when theme is dark', () => {
    render(<ThemeToggle theme="dark" setTheme={() => {}} />);
    expect(screen.getByText('DARK')).toBeTruthy();
  });

  it('displays LIGHT label when theme is light', () => {
    render(<ThemeToggle theme="light" setTheme={() => {}} />);
    expect(screen.getByText('LIGHT')).toBeTruthy();
  });

  it('calls setTheme with "light" when clicked in dark mode', () => {
    const setTheme = vi.fn();
    const { container } = render(<ThemeToggle theme="dark" setTheme={setTheme} />);
    // outer div children: [span (label), div (track with onClick)]
    const track = container.firstChild.children[1];
    fireEvent.click(track);
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('calls setTheme with "dark" when clicked in light mode', () => {
    const setTheme = vi.fn();
    const { container } = render(<ThemeToggle theme="light" setTheme={setTheme} />);
    // outer div children: [span (label), div (track with onClick)]
    const track = container.firstChild.children[1];
    fireEvent.click(track);
    expect(setTheme).toHaveBeenCalledWith('dark');
  });
});
