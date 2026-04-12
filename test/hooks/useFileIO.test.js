// test/hooks/useFileIO.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileIO } from '../../src/hooks/useFileIO.js';
import { makeFile, makeFileReader, makeDropEvent } from '../setup/mockFileIO.js';

// Stub parser and session utils used inside handleFile
vi.mock('../../src/utils/parser.js', () => ({
  parseStudio5000CSV: vi.fn(),
}));
vi.mock('../../src/utils/sessionState.js', () => ({
  applyLoadedDataset: vi.fn(),
  createComparisonState: vi.fn(),
}));

vi.mock('../../src/utils/projectPersistence.js', () => ({
  buildProjectPayload: vi.fn(),
  classifyDroppedFile: vi.fn(() => 'csv'),
  hydrateProjectData: vi.fn(),
  normalizeLoadedProject: vi.fn(),
  parseProjectFileText: vi.fn(),
}));
vi.mock('../../src/utils/download.js', () => ({ downloadBlob: vi.fn() }));

import { parseStudio5000CSV } from '../../src/utils/parser.js';
import { applyLoadedDataset, createComparisonState } from '../../src/utils/sessionState.js';
import { classifyDroppedFile } from '../../src/utils/projectPersistence.js';

const mkSignalState = () => ({
  setVisible: vi.fn(),
  setGroups: vi.fn(),
  setViewRange: vi.fn(),
  setCursorIdx: vi.fn(),
  setCursor2Idx: vi.fn(),
  setMetadata: vi.fn(),
  setSignalStyles: vi.fn(),
  setGroupNames: vi.fn(),
  setDeltaMode: vi.fn(),
  setShowPills: vi.fn(),
  setShowEdgeValues: vi.fn(),
  setSplitRanges: vi.fn(),
  setAvgWindow: vi.fn(),
  setHideOriginal: vi.fn(),
});

const mkDerivedPens = () => ({
  setDerivedConfigs: vi.fn(),
  recomputeDerivedSignals: vi.fn(d => d),
});

const mkParsedData = () => ({
  tagNames: ['Tag0', 'Tag1'],
  timestamps: [0, 1, 2],
  signals: [{ values: [1, 2, 3] }, { values: [4, 5, 6] }],
  meta: {},
});

const mkReset = () => ({
  visible: [true, true],
  groups: [1, 1],
  viewRange: [0, 3],
  cursorIdx: null,
  cursor2Idx: null,
  metadata: {},
  signalStyles: {},
  referenceOverlays: {},
  derivedConfigs: {},
  rebaseOffset: 0,
});

describe('useFileIO', () => {
  let setData, signalState, derivedPens, setReferenceOverlays, showToast;

  beforeEach(() => {
    vi.clearAllMocks();
    setData = vi.fn();
    signalState = mkSignalState();
    derivedPens = mkDerivedPens();
    setReferenceOverlays = vi.fn();
    showToast = vi.fn();

    parseStudio5000CSV.mockReturnValue(mkParsedData());
    applyLoadedDataset.mockReturnValue(mkReset());
  });

  it('handleFile calls setData with parsed CSV', () => {
    const { result } = renderHook(() =>
      useFileIO(null, setData, signalState, derivedPens, setReferenceOverlays, showToast)
    );

    const reader = makeFileReader();
    const OriginalFileReader = globalThis.FileReader;
    globalThis.FileReader = function FileReader() { return reader; };

    act(() => {
      result.current.handleFile(makeFile('test.csv', 'csv-content'));
    });
    reader.triggerLoad('csv-content');

    expect(setData).toHaveBeenCalledWith(expect.objectContaining({ tagNames: ['Tag0', 'Tag1'] }));
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('2 tags'), 'success');

    globalThis.FileReader = OriginalFileReader;
  });

  it('handleFile calls showToast with error when CSV cannot be parsed', () => {
    parseStudio5000CSV.mockReturnValue(null);
    const { result } = renderHook(() =>
      useFileIO(null, setData, signalState, derivedPens, setReferenceOverlays, showToast)
    );

    const reader = makeFileReader();
    const OriginalFileReader = globalThis.FileReader;
    globalThis.FileReader = function FileReader() { return reader; };

    act(() => { result.current.handleFile(makeFile('bad.csv', 'garbage')); });
    reader.triggerLoad('garbage');

    expect(showToast).toHaveBeenCalledWith('Failed to parse CSV — unsupported format', 'error');

    globalThis.FileReader = OriginalFileReader;
  });

  it('handleDrop routes csv files to handleFile via classifyDroppedFile', () => {
    classifyDroppedFile.mockReturnValue('csv');
    const { result } = renderHook(() =>
      useFileIO(null, setData, signalState, derivedPens, setReferenceOverlays, showToast)
    );

    const file = makeFile('data.csv', 'csv-content');
    const dropEvent = makeDropEvent([file]);

    const reader = makeFileReader();
    const OriginalFileReader = globalThis.FileReader;
    globalThis.FileReader = function FileReader() { return reader; };

    act(() => { result.current.handleDrop(dropEvent); });
    reader.triggerLoad('csv-content');

    expect(dropEvent.preventDefault).toHaveBeenCalled();
    expect(setData).toHaveBeenCalled();

    globalThis.FileReader = OriginalFileReader;
  });
});
