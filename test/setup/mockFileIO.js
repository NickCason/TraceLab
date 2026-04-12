// test/setup/mockFileIO.js
import { vi } from 'vitest';

export function makeFile(name, content, type = 'text/plain') {
  return new File([content], name, { type });
}

export function makeFileReader() {
  const reader = {
    onload: null,
    onerror: null,
    readAsText: vi.fn(function () {}),
    triggerLoad(result) {
      this.onload?.({ target: { result } });
    },
    triggerError(error) {
      this.onerror?.({ target: { error } });
    },
  };
  return reader;
}

export function makeDropEvent(files) {
  return {
    preventDefault: vi.fn(),
    dataTransfer: { files },
  };
}
