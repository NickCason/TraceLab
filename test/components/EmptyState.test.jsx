// test/components/EmptyState.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import EmptyState from '../../src/components/EmptyState.jsx';
import { THEMES } from '../../src/constants/theme.js';

const mkProps = () => ({
  t: THEMES.dark,
  theme: 'dark',
  setTheme: vi.fn(),
  fileInputRef: { current: { click: vi.fn() } },
  loadProject: vi.fn(),
  handleFile: vi.fn(),
  handleDrop: vi.fn(),
  toast: null,
  setToast: vi.fn(),
});

describe('EmptyState', () => {
  it('renders TraceLab branding', () => {
    const { container } = render(<EmptyState {...mkProps()} />);
    expect(container.textContent).toContain('TraceLab');
  });

  it('renders the drop zone instruction text', () => {
    const { container } = render(<EmptyState {...mkProps()} />);
    expect(container.textContent).toContain('Drop Studio 5000 CSV');
  });

  it('does not render a Toast when toast prop is null', () => {
    const { container } = render(<EmptyState {...mkProps()} />);
    expect(container.querySelector('[class*="toast"]')).toBeNull();
  });
});
