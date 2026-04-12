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

  it('updateDerivedPen modifies config and calls setData with updated signal', () => {
    // Pre-populate data with a derived signal at index 2 so the hook closure
    // sees the derived signal without any stale-closure issue from createDerivedPen.
    const baseData = mkData();
    const derivedSignal = {
      values: Array.from({ length: 20 }, (_, i) => i * 5),
      isDigital: false,
      isDerived: true,
      derivedType: 'equation',
    };
    const data = {
      ...baseData,
      signals: [...baseData.signals, derivedSignal],
      tagNames: [...baseData.tagNames, 'Original Name'],
    };
    const setData = vi.fn();
    const showToast = vi.fn();
    const signalState = mkSignalState();

    const { result } = renderHook(() =>
      useDerivedPens(data, setData, signalState, gc, showToast)
    );

    // Prime derivedConfigs state so updateDerivedPen's guard passes for index 2.
    act(() => {
      result.current.setDerivedConfigs({ 2: { type: 'equation', expression: 's0 + s1', groupIdx: 1 } });
    });

    // Now call updateDerivedPen — the hook's data closure still holds the
    // pre-populated data object with the derived signal at index 2.
    act(() => {
      result.current.updateDerivedPen(2, {
        type: 'equation',
        expression: 's0 - s1',
        name: 'My Updated Pen',
        groupIdx: 1,
      });
    });

    expect(showToast).toHaveBeenCalledWith('Derived pen updated', 'success');
    expect(setData).toHaveBeenCalledOnce();
    const newData = setData.mock.calls[0][0];
    expect(newData.tagNames[2]).toBe('My Updated Pen');
  });

  it('deleteDerivedPen removes derived signal and calls showToast', () => {
    const baseData = mkData();
    const derivedSignal = {
      values: Array.from({ length: 20 }, (_, i) => i),
      isDigital: false,
      isDerived: true,
    };
    const data = {
      ...baseData,
      signals: [...baseData.signals, derivedSignal],
      tagNames: [...baseData.tagNames, 'MyDerivedPen'],
    };
    const setData = vi.fn();
    const showToast = vi.fn();
    const signalState = mkSignalState();

    const { result } = renderHook(() =>
      useDerivedPens(data, setData, signalState, gc, showToast)
    );

    act(() => {
      result.current.deleteDerivedPen(2);
    });

    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Deleted'), 'success');
    expect(setData).toHaveBeenCalledOnce();
  });

  it('createDerivedPen with rolling_avg type calls setData and adds a new signal', () => {
    const data = mkData();
    const setData = vi.fn();
    const showToast = vi.fn();

    const { result } = renderHook(() =>
      useDerivedPens(data, setData, mkSignalState(), gc, showToast)
    );

    act(() => {
      result.current.createDerivedPen({
        type: 'rolling_avg',
        source: 0,
        window: 5,
        groupIdx: 1,
      });
    });

    expect(setData).toHaveBeenCalledOnce();
    const newData = setData.mock.calls[0][0];
    expect(newData.signals.length).toBe(data.signals.length + 1);
  });

  it('createDerivedPen with sum type produces a signal with isDerived:true', () => {
    const data = mkData();
    const setData = vi.fn();

    const { result } = renderHook(() =>
      useDerivedPens(data, setData, mkSignalState(), gc, vi.fn())
    );

    act(() => {
      result.current.createDerivedPen({
        type: 'sum',
        sources: [0, 1],
        groupIdx: 1,
      });
    });

    expect(setData).toHaveBeenCalledOnce();
    const newData = setData.mock.calls[0][0];
    const newSignal = newData.signals[newData.signals.length - 1];
    expect(newSignal.isDerived).toBe(true);
  });
});
