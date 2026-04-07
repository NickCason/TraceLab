import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureFonts } from '../src/utils/fonts.js';

test('ensureFonts is a no-op when document is unavailable', () => {
  const originalDocument = globalThis.document;
  delete globalThis.document;

  assert.doesNotThrow(() => ensureFonts());

  globalThis.document = originalDocument;
});

test('ensureFonts appends stylesheet link once and avoids duplicates', () => {
  const originalDocument = globalThis.document;

  let existing = false;
  const appended = [];
  globalThis.document = {
    querySelector: () => (existing ? { tagName: 'LINK' } : null),
    createElement: (tag) => ({ tagName: tag, href: '', rel: '' }),
    head: {
      appendChild: (node) => {
        appended.push(node);
        existing = true;
      },
    },
  };

  ensureFonts();
  ensureFonts();

  assert.equal(appended.length, 1);
  assert.equal(appended[0].tagName, 'link');
  assert.equal(appended[0].rel, 'stylesheet');
  assert.match(appended[0].href, /fonts\.googleapis\.com/);

  globalThis.document = originalDocument;
});
