import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import MarqueeText from '../../src/components/MarqueeText.jsx';

describe('MarqueeText', () => {
  it('renders children text content', () => {
    const { container } = render(<MarqueeText>Hello Signal</MarqueeText>);
    expect(container.textContent).toBe('Hello Signal');
  });

  it('renders a span inside a div', () => {
    const { container } = render(<MarqueeText>label</MarqueeText>);
    const outer = container.firstChild;
    expect(outer.tagName).toBe('DIV');
    expect(outer.firstChild.tagName).toBe('SPAN');
  });

  it('outer div has overflow hidden', () => {
    const { container } = render(<MarqueeText style={{ fontSize: 13 }}>text</MarqueeText>);
    expect(container.firstChild.style.overflow).toBe('hidden');
  });

  it('does not throw when children change', () => {
    const { rerender } = render(<MarqueeText>first</MarqueeText>);
    expect(() => rerender(<MarqueeText>second</MarqueeText>)).not.toThrow();
  });
});
