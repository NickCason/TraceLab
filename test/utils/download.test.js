import { test, expect } from 'vitest';
import { downloadBlob, _blobUrls } from '../../src/utils/download.js';

test('downloadBlob creates temporary anchor, prunes old blob URLs, and schedules cleanup', () => {
  const originalURL = globalThis.URL;
  const originalDocument = globalThis.document;
  const originalSetTimeout = globalThis.setTimeout;

  const revoked = [];
  let createCount = 0;
  globalThis.URL = {
    createObjectURL: () => `blob:url-${++createCount}`,
    revokeObjectURL: (url) => revoked.push(url),
  };

  const anchors = [];
  const removed = [];
  globalThis.document = {
    createElement: () => {
      const anchor = {
        href: '',
        download: '',
        style: {},
        clicked: false,
        click() { this.clicked = true; },
      };
      anchors.push(anchor);
      return anchor;
    },
    body: {
      appendChild: () => {},
      removeChild: (node) => removed.push(node),
    },
  };

  const scheduled = [];
  globalThis.setTimeout = (fn, delay) => {
    scheduled.push({ fn, delay });
    return scheduled.length;
  };

  _blobUrls.splice(0, _blobUrls.length, 'blob:old-1', 'blob:old-2', 'blob:old-3');

  let completed = false;
  downloadBlob({ size: 1 }, 'trend.csv', () => {
    completed = true;
  });

  expect(anchors.length).toBe(1);
  expect(anchors[0].download).toBe('trend.csv');
  expect(anchors[0].clicked).toBe(true);
  expect(completed).toBe(true);

  expect(_blobUrls.length).toBe(3);
  expect(revoked).toEqual(['blob:old-1']);

  expect(scheduled.map((s) => s.delay)).toEqual([200, 60000]);

  // Execute scheduled cleanup callbacks to verify behavior.
  scheduled[0].fn();
  scheduled[1].fn();

  expect(removed.length).toBe(1);
  expect(revoked.includes('blob:url-1')).toBeTruthy();
  expect(_blobUrls.includes('blob:url-1')).toBe(false);

  _blobUrls.splice(0, _blobUrls.length);
  globalThis.URL = originalURL;
  globalThis.document = originalDocument;
  globalThis.setTimeout = originalSetTimeout;
});
