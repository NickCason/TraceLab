import { test, expect } from 'vitest';
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
