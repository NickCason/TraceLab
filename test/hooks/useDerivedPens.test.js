import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDerivedPens } from '../../src/hooks/useDerivedPens.js';

const mkData = () => ({
  timestamps: Array.from({ length: 20 }, (_, i) => i),
  signals: [
    { values: Array.from({ length: 20 }, (_, i) => i * 2), isDigital: false },
    { values: Array.from({ length: 20 }, (_, i) => i * 3), isDigital: false },
  ],
  tagNames: ['Sig0', 'Sig1'],
  meta: {},
});

const mkSignalState = () => ({
  setVisible: vi.fn(),
  setGroups: vi.fn(),
  setMetadata: vi.fn(),
  setSignalStyles: vi.fn(),
  setAvgWindow: vi.fn(),
  setHideOriginal: vi.fn(),
  groups: [1, 1],
  metadata: {},
});

const gc = ['#39f', '#f39', '#3f9', '#fc3'];

describe('useDerivedPens', () => {
  it('initializes with empty derivedConfigs', () => {
    const { result } = renderHook(() =>
      useDerivedPens(mkData(), vi.fn(), mkSignalState(), gc, vi.fn())
    );
    expect(result.current.derivedConfigs).toEqual({});
  });

  it('createDerivedPen adds a new signal to data and calls setData', () => {
    const data = mkData();
    const setData = vi.fn();
    const showToast = vi.fn();

    const { result } = renderHook(() =>
      useDerivedPens(data, setData, mkSignalState(), gc, showToast)
    );

    act(() => {
      result.current.createDerivedPen({
        type: 'equation',
        expression: 's0 - s1',
        groupIdx: 1,
        name: 'MyDerived',
      });
    });

    expect(setData).toHaveBeenCalledOnce();
    const newData = setData.mock.calls[0][0];
    expect(newData.tagNames.includes('MyDerived')).toBe(true);
    expect(newData.signals.length).toBe(3);
  });

  it('createDerivedPen stores config under the new signal index', () => {
    const data = mkData();
    const setData = vi.fn();

    const { result } = renderHook(() =>
      useDerivedPens(data, setData, mkSignalState(), gc, vi.fn())
    );

    act(() => {
      result.current.createDerivedPen({ type: 'equation', expression: 's0 + s1', groupIdx: 1 });
    });

    expect(result.current.derivedConfigs[2]).toBeTruthy();
    expect(result.current.derivedConfigs[2].type).toBe('equation');
  });

  it('createDerivedPen calls showToast with success', () => {
    const showToast = vi.fn();
    const { result } = renderHook(() =>
      useDerivedPens(mkData(), vi.fn(), mkSignalState(), gc, showToast)
    );

    act(() => {
      result.current.createDerivedPen({ type: 'equation', expression: 's0', groupIdx: 1 });
    });

    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('added'), 'success');
  });

  it('deleteDerivedPen is a no-op when signal at index is not derived', () => {
    const data = mkData();
    const setData = vi.fn();
    const signalState = mkSignalState();

    const { result } = renderHook(() =>
      useDerivedPens(data, setData, signalState, gc, vi.fn())
    );

    act(() => {
      result.current.createDerivedPen({ type: 'equation', expression: 's0 - s1', groupIdx: 1 });
    });
    setData.mockClear();

    act(() => {
      result.current.deleteDerivedPen(0);
    });

    expect(setData).not.toHaveBeenCalled();
  });

  it('deleteDerivedPen calls setData when signal at index is derived', () => {
    const baseData = mkData();
    const derivedSignal = {
      values: Array.from({ length: 20 }, (_, i) => i),
      isDigital: false,
      isDerived: true,
    };
    const data = {
      ...baseData,
      signals: [...baseData.signals, derivedSignal],
      tagNames: [...baseData.tagNames, 'MyDerived'],
    };
    const setData = vi.fn();
    const signalState = mkSignalState();

    const { result } = renderHook(() =>
      useDerivedPens(data, setData, signalState, gc, vi.fn())
    );

    act(() => {
      result.current.deleteDerivedPen(2);
    });

    expect(setData).toHaveBeenCalledOnce();
    const newData = setData.mock.calls[0][0];
    expect(newData.signals.length).toBe(2);
    expect(newData.tagNames.includes('MyDerived')).toBe(false);
  });
});
