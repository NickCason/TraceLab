import { test, expect, vi } from 'vitest';
import { ensureFonts } from '../../src/utils/fonts.js';

test('ensureFonts is a no-op when document is unavailable', () => {
  const originalDocument = globalThis.document;
  vi.stubGlobal('document', undefined);

  expect(() => ensureFonts()).not.toThrow();

  vi.unstubAllGlobals();
  globalThis.document = originalDocument;
});

test('ensureFonts appends stylesheet link once and avoids duplicates', () => {
  const originalDocument = globalThis.document;

  let existing = false;
  const appended = [];
  vi.stubGlobal('document', {
    querySelector: () => (existing ? { tagName: 'LINK' } : null),
    createElement: (tag) => ({ tagName: tag, href: '', rel: '' }),
    head: {
      appendChild: (node) => {
        appended.push(node);
        existing = true;
      },
    },
  });

  ensureFonts();
  ensureFonts();

  expect(appended.length).toBe(1);
  expect(appended[0].tagName).toBe('link');
  expect(appended[0].rel).toBe('stylesheet');
  expect(appended[0].href).toMatch(/fonts\.googleapis\.com/);

  vi.unstubAllGlobals();
  globalThis.document = originalDocument;
});
