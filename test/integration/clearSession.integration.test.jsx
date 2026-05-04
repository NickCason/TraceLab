import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, fireEvent, act, cleanup } from '@testing-library/react';
import App from '../../src/App.jsx';
import { installCanvasMock } from '../setup/mockCanvas.js';

// Mock downloadBlob so the Save & Clear path doesn't try to use URL.createObjectURL
// (which is not implemented in happy-dom and would throw inside saveProject).
vi.mock('../../src/utils/download', () => ({
  downloadBlob: vi.fn((_blob, _filename, cb) => { cb?.(); }),
}));

beforeEach(() => { installCanvasMock(); });
afterEach(() => cleanup());

// CSV in the format parseStudio5000CSV expects: keyword rows ending with `Header:`,
// followed by `Data,` rows.
const SAMPLE_CSV = [
  'Controller Name:,FakeCtl',
  'Trend Name:,Sample',
  'Sample Period:,5 ms',
  'Header:,"Date","Time","T1","T2"',
  'Data,2025-01-01,00:00:00;000,1,10',
  'Data,2025-01-01,00:00:00;005,2,20',
  'Data,2025-01-01,00:00:00;010,3,30',
].join('\n');

// Helper: drive the app from EmptyState → loaded by simulating a CSV file drop.
async function loadSampleCsv(container) {
  const file = new File([SAMPLE_CSV], 'sample.csv', { type: 'text/csv' });
  const input = container.querySelector('input[type="file"]');
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
  // happy-dom's FileReader uses two chained setTimeouts; flush several rounds
  // to allow the load + react state updates to commit.
  for (let i = 0; i < 8; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

describe('Clear session integration', () => {
  it('Clear menu item opens the confirm dialog', async () => {
    const { container } = render(<App />);
    await loadSampleCsv(container);
    // App is loaded — open the project menu.
    fireEvent.click(container.querySelector('#btn-project-menu'));
    fireEvent.click(container.querySelector('#mi-clear'));
    expect(container.querySelector('#dialog-clear-confirm')).not.toBeNull();
  });

  it('Discard & clear from dialog returns app to EmptyState', async () => {
    const { container, getByText } = render(<App />);
    await loadSampleCsv(container);
    fireEvent.click(container.querySelector('#btn-project-menu'));
    fireEvent.click(container.querySelector('#mi-clear'));
    await act(async () => {
      fireEvent.click(getByText('Discard & clear'));
    });
    // Header (with project menu) only renders when data is loaded.
    expect(container.querySelector('#btn-project-menu')).toBeNull();
    // EmptyState renders the drop zone text.
    expect(container.textContent).toContain('Drop Studio 5000 CSV');
  });

  it('Save & clear menu item bypasses the dialog and clears immediately', async () => {
    const { container } = render(<App />);
    await loadSampleCsv(container);
    fireEvent.click(container.querySelector('#btn-project-menu'));
    await act(async () => {
      fireEvent.click(container.querySelector('#mi-save-and-clear'));
    });
    expect(container.querySelector('#dialog-clear-confirm')).toBeNull();
    expect(container.querySelector('#btn-project-menu')).toBeNull();
    expect(container.textContent).toContain('Drop Studio 5000 CSV');
  });

  it('Cancel from dialog leaves the app loaded and dialog closed', async () => {
    const { container, getByText } = render(<App />);
    await loadSampleCsv(container);
    fireEvent.click(container.querySelector('#btn-project-menu'));
    fireEvent.click(container.querySelector('#mi-clear'));
    fireEvent.click(getByText('Cancel'));
    expect(container.querySelector('#dialog-clear-confirm')).toBeNull();
    expect(container.querySelector('#btn-project-menu')).not.toBeNull();
  });
});
