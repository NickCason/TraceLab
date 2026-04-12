import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOverlays } from '../../src/hooks/useOverlays.js';

const mkData = () => ({
  timestamps: Array.from({ length: 100 }, (_, i) => i),
  signals: [
    { values: Array.from({ length: 100 }, (_, i) => i * 2) },
    { values: Array.from({ length: 100 }, (_, i) => i * 3) },
  ],
});

describe('useOverlays', () => {
  it('initializes with empty referenceOverlays', () => {
    const { result } = renderHook(() =>
      useOverlays(mkData(), [1, 1], [true, true], [0, 100], {})
    );
    expect(result.current.referenceOverlays).toEqual({});
  });

  it('addOverlay adds an entry under the given groupIdx', () => {
    const { result } = renderHook(() =>
      useOverlays(mkData(), [1, 1], [true, true], [0, 100], {})
    );
    act(() => { result.current.addOverlay(1, 'line'); });
    expect(Array.isArray(result.current.referenceOverlays[1])).toBe(true);
    expect(result.current.referenceOverlays[1].length).toBe(1);
  });

  it('addOverlay created overlay has an id, type, and color', () => {
    const { result } = renderHook(() =>
      useOverlays(mkData(), [1, 1], [true, true], [0, 100], {})
    );
    act(() => { result.current.addOverlay(1, 'line'); });
    const ov = result.current.referenceOverlays[1][0];
    expect(ov.id).toBeTruthy();
    expect(ov.type).toBe('line');
    expect(ov.color).toBeTruthy();
  });

  it('updateOverlay changes only the targeted overlay by id', () => {
    const { result } = renderHook(() =>
      useOverlays(mkData(), [1, 1], [true, true], [0, 100], {})
    );
    act(() => { result.current.addOverlay(1, 'line'); });
    const id = result.current.referenceOverlays[1][0].id;
    act(() => { result.current.updateOverlay(1, id, { label: 'updated' }); });
    expect(result.current.referenceOverlays[1][0].label).toBe('updated');
  });

  it('deleteOverlay removes the overlay with the given id', () => {
    const { result } = renderHook(() =>
      useOverlays(mkData(), [1, 1], [true, true], [0, 100], {})
    );
    act(() => { result.current.addOverlay(1, 'line'); });
    const id = result.current.referenceOverlays[1][0].id;
    act(() => { result.current.deleteOverlay(1, id); });
    expect(result.current.referenceOverlays[1].length).toBe(0);
  });

  it('addOverlay band type creates a band overlay', () => {
    const { result } = renderHook(() =>
      useOverlays(mkData(), [1, 1], [true, true], [0, 100], {})
    );
    act(() => { result.current.addOverlay(1, 'band'); });
    expect(result.current.referenceOverlays[1][0].type).toBe('band');
  });
});
