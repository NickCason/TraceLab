const SIGNAL_TOKEN_PATTERN = /\bs(\d+)\b/g;

export function normalizeEquationExpression(expression = "") {
  return expression.replace(SIGNAL_TOKEN_PATTERN, (_, idx) => `__s(${idx})`);
}

export function buildEquationEvaluator(expression = "") {
  try {
    const normalized = normalizeEquationExpression(expression);
    const fn = new Function("__s", "Math", `with (Math) { return (${normalized}); }`);
    return (sampleIdx, getAt) => {
      try {
        const value = fn((sigIdx) => getAt(sigIdx, sampleIdx), Math);
        return (typeof value === "number" && Number.isFinite(value)) ? value : null;
      } catch {
        return null;
      }
    };
  } catch {
    return () => null;
  }
}
