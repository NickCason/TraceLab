// test/setup/mockCanvas.js
import { vi } from 'vitest';

const CTX_METHODS = [
  'save', 'restore', 'translate', 'scale', 'rotate',
  'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo',
  'bezierCurveTo', 'quadraticCurveTo', 'rect',
  'stroke', 'fill', 'fillRect', 'clearRect', 'strokeRect',
  'fillText', 'strokeText', 'clip',
  'setLineDash', 'createLinearGradient', 'createRadialGradient',
  'drawImage', 'putImageData', 'getImageData', 'createImageData',
];

export function createMockCtx() {
  const ctx = {};
  CTX_METHODS.forEach(m => { ctx[m] = vi.fn(); });
  ctx.measureText = vi.fn(() => ({ width: 50 }));
  ctx.createLinearGradient = vi.fn(() => ({ addColorStop: vi.fn() }));
  ctx.createRadialGradient = vi.fn(() => ({ addColorStop: vi.fn() }));
  ctx.getLineDash = vi.fn(() => []);
  ctx.canvas = { width: 800, height: 300 };
  // settable properties
  ctx.fillStyle = '';
  ctx.strokeStyle = '';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 1;
  ctx.font = '';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.shadowBlur = 0;
  ctx.shadowColor = '';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  return ctx;
}

export function installCanvasMock() {
  const ctx = createMockCtx();
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx);
  return ctx;
}
