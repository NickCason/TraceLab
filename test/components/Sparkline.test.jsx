import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Sparkline from '../../src/components/Sparkline.jsx';

describe('Sparkline', () => {
  it('renders an SVG element when given sufficient non-null values', () => {
    const { container } = render(
      <Sparkline values={[1, 2, 3, 4, 5]} color="#39f" />
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders nothing when values has fewer than 2 non-null points', () => {
    const { container } = render(
      <Sparkline values={[null, null, 1]} color="#39f" />
    );
    expect(container.firstChild).toBe(null);
  });

  it('renders nothing when values is empty', () => {
    const { container } = render(<Sparkline values={[]} color="#39f" />);
    expect(container.firstChild).toBe(null);
  });

  it('applies the color to the polyline stroke', () => {
    const { container } = render(
      <Sparkline values={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} color="#ff3399" />
    );
    const polyline = container.querySelector('polyline');
    expect(polyline.getAttribute('stroke')).toBe('#ff3399');
  });

  it('respects custom width and height props', () => {
    const { container } = render(
      <Sparkline values={[1, 2, 3, 4, 5]} color="#39f" width={80} height={24} />
    );
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('width')).toBe('80');
    expect(svg.getAttribute('height')).toBe('24');
  });
});
