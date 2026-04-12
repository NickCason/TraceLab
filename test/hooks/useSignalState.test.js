import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSignalState } from '../../src/hooks/useSignalState.js';

const mkData = (signalCount = 3) => ({
  timestamps: [0, 1, 2, 3, 4],
  signals: Array.from({ length: signalCount }, (_, i) => ({ values: [i, i + 1, i + 2, i + 3, i + 4] })),
  tagNames: Array.from({ length: signalCount }, (_, i) => `Tag${i}`),
});

describe('useSignalState', () => {
  it('initializes with empty visible, groups, and zero viewRange', () => {
    const { result } = renderHook(() => useSignalState(null));
    expect(result.current.visible).toEqual([]);
    expect(result.current.groups).toEqual([]);
    expect(result.current.viewRange).toEqual([0, 0]);
  });

  it('toggleSignal flips the boolean at the given index', () => {
    const { result } = renderHook(() => useSignalState(mkData(3)));
    act(() => { result.current.setVisible([true, true, true]); });
    act(() => { result.current.toggleSignal(1); });
    expect(result.current.visible[1]).toBe(false);
    expect(result.current.visible[0]).toBe(true);
  });

  it('setGroup updates only the targeted index', () => {
    const { result } = renderHook(() => useSignalState(mkData(3)));
    act(() => { result.current.setGroups([1, 1, 1]); });
    act(() => { result.current.setGroup(2, 3); });
    expect(result.current.groups[2]).toBe(3);
    expect(result.current.groups[0]).toBe(1);
  });

  it('combineAll assigns every signal to group 1', () => {
    const { result } = renderHook(() => useSignalState(mkData(4)));
    act(() => { result.current.setGroups([1, 2, 3, 4]); });
    act(() => { result.current.combineAll(); });
    expect(result.current.groups.every(g => g === 1)).toBe(true);
  });

  it('resetZoom sets viewRange to [0, timestamps.length]', () => {
    const data = mkData(2);
    const { result } = renderHook(() => useSignalState(data));
    act(() => { result.current.setViewRange([1, 3]); });
    act(() => { result.current.resetZoom(); });
    expect(result.current.viewRange).toEqual([0, data.timestamps.length]);
  });

  it('getDisplayName returns tagName when no metadata override exists', () => {
    const data = mkData(2);
    const { result } = renderHook(() => useSignalState(data));
    expect(result.current.getDisplayName(0)).toBe('Tag0');
  });

  it('getDisplayName returns displayName from metadata when set', () => {
    const data = mkData(2);
    const { result } = renderHook(() => useSignalState(data));
    act(() => { result.current.setMetadata({ 0: { displayName: 'Motor Speed' } }); });
    expect(result.current.getDisplayName(0)).toBe('Motor Speed');
  });

  it('cursorValues returns null when cursorIdx is null', () => {
    const { result } = renderHook(() => useSignalState(mkData(2)));
    expect(result.current.cursorValues).toBe(null);
  });

  it('cursorValues returns signal values at cursorIdx', () => {
    const data = mkData(2);
    const { result } = renderHook(() => useSignalState(data));
    act(() => {
      result.current.setVisible([true, true]);
      result.current.setCursorIdx(2);
    });
    expect(result.current.cursorValues[0].value).toBe(2);
    expect(result.current.cursorValues[1].value).toBe(3);
  });

  it('isCombined is true when all groups are the same', () => {
    const { result } = renderHook(() => useSignalState(mkData(3)));
    act(() => { result.current.setGroups([2, 2, 2]); });
    expect(result.current.isCombined).toBe(true);
  });

  it('isCombined is false when groups differ', () => {
    const { result } = renderHook(() => useSignalState(mkData(3)));
    act(() => { result.current.setGroups([1, 2, 2]); });
    expect(result.current.isCombined).toBe(false);
  });
});
