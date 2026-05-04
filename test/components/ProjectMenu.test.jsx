import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import ProjectMenu from '../../src/components/ProjectMenu.jsx';
import { THEMES } from '../../src/constants/theme.js';

const t = THEMES.dark;

afterEach(() => cleanup());

const mkProps = (overrides = {}) => ({
  open: false,
  setOpen: vi.fn(),
  t,
  onLoadCsv: vi.fn(),
  onLoadProject: vi.fn(),
  onSaveProject: vi.fn(),
  onSaveAndClear: vi.fn(),
  onClear: vi.fn(),
  ...overrides,
});

describe('ProjectMenu', () => {
  it('renders the trigger button with id btn-project-menu', () => {
    const { container } = render(<ProjectMenu {...mkProps()} />);
    expect(container.querySelector('#btn-project-menu')).not.toBeNull();
  });

  it('does not render the dropdown when closed', () => {
    const { container } = render(<ProjectMenu {...mkProps({ open: false })} />);
    expect(container.querySelector('#mi-load-csv')).toBeNull();
  });

  it('renders all five menu items when open', () => {
    const { container } = render(<ProjectMenu {...mkProps({ open: true })} />);
    expect(container.querySelector('#mi-load-csv')).not.toBeNull();
    expect(container.querySelector('#mi-load-project')).not.toBeNull();
    expect(container.querySelector('#mi-save-project')).not.toBeNull();
    expect(container.querySelector('#mi-save-and-clear')).not.toBeNull();
    expect(container.querySelector('#mi-clear')).not.toBeNull();
  });

  it('clicking the trigger calls setOpen with the toggled value', () => {
    const setOpen = vi.fn();
    const { container } = render(<ProjectMenu {...mkProps({ open: false, setOpen })} />);
    fireEvent.click(container.querySelector('#btn-project-menu'));
    expect(setOpen).toHaveBeenCalledWith(true);
  });

  it('clicking Load CSV calls onLoadCsv and closes', () => {
    const onLoadCsv = vi.fn();
    const setOpen = vi.fn();
    const { container } = render(<ProjectMenu {...mkProps({ open: true, setOpen, onLoadCsv })} />);
    fireEvent.click(container.querySelector('#mi-load-csv'));
    expect(onLoadCsv).toHaveBeenCalledTimes(1);
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('clicking Save & clear calls onSaveAndClear and closes', () => {
    const onSaveAndClear = vi.fn();
    const setOpen = vi.fn();
    const { container } = render(<ProjectMenu {...mkProps({ open: true, setOpen, onSaveAndClear })} />);
    fireEvent.click(container.querySelector('#mi-save-and-clear'));
    expect(onSaveAndClear).toHaveBeenCalledTimes(1);
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('clicking Clear calls onClear and closes', () => {
    const onClear = vi.fn();
    const setOpen = vi.fn();
    const { container } = render(<ProjectMenu {...mkProps({ open: true, setOpen, onClear })} />);
    fireEvent.click(container.querySelector('#mi-clear'));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('Escape key closes the menu when open', () => {
    const setOpen = vi.fn();
    render(<ProjectMenu {...mkProps({ open: true, setOpen })} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(setOpen).toHaveBeenCalledWith(false);
  });
});
