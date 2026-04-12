import { test, expect, describe, it, vi } from 'vitest';
import { normalizeEquationExpression, buildEquationEvaluator } from '../../src/utils/derivedEquation.js';

test('normalizeEquationExpression rewrites signal tokens for evaluator', () => {
  expect(normalizeEquationExpression('s0 - s12 + sin(s3)')).toBe('__s(0) - __s(12) + sin(__s(3))');
});

test('buildEquationEvaluator supports arithmetic and approved math functions', () => {
  const values = [
    [10, 11],
    [4, 8],
  ];
  const getAt = (sigIdx, sampleIdx) => values[sigIdx]?.[sampleIdx] ?? null;
  const evaluate = buildEquationEvaluator('abs(s0 - s1) + round(cos(0)) + max(1,2)');

  expect(evaluate(0, getAt)).toBe(9);
  expect(evaluate(1, getAt)).toBe(6);
});

test('buildEquationEvaluator rejects invalid expressions and JS constructs', () => {
  const getAt = () => 1;
  expect(buildEquationEvaluator('s0 +')(0, getAt)).toBe(null);
  expect(buildEquationEvaluator('globalThis.alert(1)')(0, getAt)).toBe(null);
  expect(buildEquationEvaluator('process.exit(1)')(0, getAt)).toBe(null);
  expect(buildEquationEvaluator('Math.max(1,2)')(0, getAt)).toBe(null);
});

test('buildEquationEvaluator does not allow side effects from imported equations', () => {
  globalThis.__traceLabSideEffect = 0;
  const evaluate = buildEquationEvaluator('(globalThis.__traceLabSideEffect = 5, s0)');
  const result = evaluate(0, () => 42);

  expect(result).toBe(null);
  expect(globalThis.__traceLabSideEffect).toBe(0);
  delete globalThis.__traceLabSideEffect;
});

describe('buildEquationEvaluator — error paths', () => {
  it('returns null when getAt returns null for a missing signal reference', () => {
    // null from getAt propagates through the evaluator
    const evaluate = buildEquationEvaluator('s99');
    const getAt = vi.fn(() => null);
    const result = evaluate(0, getAt);
    expect(result).toBeNull();
  });

  it('division by zero returns null (guarded by implementation)', () => {
    const evaluate = buildEquationEvaluator('s0 / s1');
    const getAt = (_sigIdx, _sampleIdx) => _sigIdx === 0 ? 10 : 0;
    const result = evaluate(0, getAt);
    expect(result).toBeNull();
  });

  it('operator precedence: multiplication before addition', () => {
    const evaluate = buildEquationEvaluator('s0 + s1 * s2');
    const getAt = (_sig) => _sig === 0 ? 1 : _sig === 1 ? 2 : 3;
    // 1 + (2 * 3) = 7
    expect(evaluate(0, getAt)).toBe(7);
  });

  it('parentheses override default precedence', () => {
    const evaluate = buildEquationEvaluator('(s0 + s1) * s2');
    const getAt = (_sig) => _sig === 0 ? 1 : _sig === 1 ? 2 : 3;
    // (1 + 2) * 3 = 9
    expect(evaluate(0, getAt)).toBe(9);
  });

  it('math function abs evaluates correctly', () => {
    const evaluate = buildEquationEvaluator('abs(s0)');
    const getAt = () => -5;
    expect(evaluate(0, getAt)).toBe(5);
  });

  it('returns null when any operand is null', () => {
    const evaluate = buildEquationEvaluator('s0 + s1');
    const getAt = (_sig) => _sig === 0 ? 5 : null;
    expect(evaluate(0, getAt)).toBeNull();
  });
});
