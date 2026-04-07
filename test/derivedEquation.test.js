import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEquationExpression, buildEquationEvaluator } from '../src/utils/derivedEquation.js';

test('normalizeEquationExpression rewrites signal tokens for evaluator', () => {
  assert.equal(normalizeEquationExpression('s0 - s12 + sin(s3)'), '__s(0) - __s(12) + sin(__s(3))');
});

test('buildEquationEvaluator supports sN token syntax and Math functions', () => {
  const values = [
    [10, 11],
    [4, 8],
  ];
  const getAt = (sigIdx, sampleIdx) => values[sigIdx]?.[sampleIdx] ?? null;
  const evaluate = buildEquationEvaluator('abs(s0 - s1) + round(cos(0))');

  assert.equal(evaluate(0, getAt), 7);
  assert.equal(evaluate(1, getAt), 4);
});

test('buildEquationEvaluator returns null for invalid equations', () => {
  const evaluate = buildEquationEvaluator('s0 +');
  const getAt = () => 1;
  assert.equal(evaluate(0, getAt), null);
});
