import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadBlob, _blobUrls } from '../src/utils/download.js';

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

  assert.equal(anchors.length, 1);
  assert.equal(anchors[0].download, 'trend.csv');
  assert.equal(anchors[0].clicked, true);
  assert.equal(completed, true);

  assert.equal(_blobUrls.length, 3);
  assert.deepEqual(revoked, ['blob:old-1']);

  assert.deepEqual(scheduled.map((s) => s.delay), [200, 60000]);

  // Execute scheduled cleanup callbacks to verify behavior.
  scheduled[0].fn();
  scheduled[1].fn();

  assert.equal(removed.length, 1);
  assert.ok(revoked.includes('blob:url-1'));
  assert.equal(_blobUrls.includes('blob:url-1'), false);

  _blobUrls.splice(0, _blobUrls.length);
  globalThis.URL = originalURL;
  globalThis.document = originalDocument;
  globalThis.setTimeout = originalSetTimeout;
});
