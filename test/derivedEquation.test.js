import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEquationExpression, buildEquationEvaluator } from '../src/utils/derivedEquation.js';

test('normalizeEquationExpression rewrites signal tokens for evaluator', () => {
  assert.equal(normalizeEquationExpression('s0 - s12 + sin(s3)'), '__s(0) - __s(12) + sin(__s(3))');
});

test('buildEquationEvaluator supports arithmetic and approved math functions', () => {
  const values = [
    [10, 11],
    [4, 8],
  ];
  const getAt = (sigIdx, sampleIdx) => values[sigIdx]?.[sampleIdx] ?? null;
  const evaluate = buildEquationEvaluator('abs(s0 - s1) + round(cos(0)) + max(1,2)');

  assert.equal(evaluate(0, getAt), 9);
  assert.equal(evaluate(1, getAt), 6);
});

test('buildEquationEvaluator rejects invalid expressions and JS constructs', () => {
  const getAt = () => 1;
  assert.equal(buildEquationEvaluator('s0 +')(0, getAt), null);
  assert.equal(buildEquationEvaluator('globalThis.alert(1)')(0, getAt), null);
  assert.equal(buildEquationEvaluator('process.exit(1)')(0, getAt), null);
  assert.equal(buildEquationEvaluator('Math.max(1,2)')(0, getAt), null);
});

test('buildEquationEvaluator does not allow side effects from imported equations', () => {
  globalThis.__traceLabSideEffect = 0;
  const evaluate = buildEquationEvaluator('(globalThis.__traceLabSideEffect = 5, s0)');
  const result = evaluate(0, () => 42);

  assert.equal(result, null);
  assert.equal(globalThis.__traceLabSideEffect, 0);
  delete globalThis.__traceLabSideEffect;
});
