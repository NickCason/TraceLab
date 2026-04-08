const SIGNAL_TOKEN_PATTERN = /\bs(\d+)\b/g;

const ALLOWED_FUNCTIONS = {
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  trunc: Math.trunc,
  sign: Math.sign,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  exp: Math.exp,
  log: Math.log,
  log10: Math.log10,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
};

const CONSTANTS = {
  pi: Math.PI,
  e: Math.E,
};

export function normalizeEquationExpression(expression = "") {
  return String(expression).replace(SIGNAL_TOKEN_PATTERN, (_, idx) => `__s(${idx})`);
}

function tokenize(input = "") {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[()+\-*/%^,]/.test(ch)) { tokens.push({ type: ch }); i++; continue; }
    if (/\d|\./.test(ch)) {
      let start = i;
      while (i < input.length && /[\d.]/.test(input[i])) i++;
      const raw = input.slice(start, i);
      if (!/^\d*\.?\d+(?:e[+-]?\d+)?$/i.test(raw)) throw new Error("Invalid numeric literal");
      tokens.push({ type: "number", value: Number(raw) });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let start = i;
      while (i < input.length && /[A-Za-z0-9_]/.test(input[i])) i++;
      const ident = input.slice(start, i);
      tokens.push({ type: "ident", value: ident });
      continue;
    }
    throw new Error(`Unsupported character: ${ch}`);
  }
  return tokens;
}

function parseExpression(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = (type) => {
    const token = tokens[pos];
    if (!token || token.type !== type) throw new Error(`Expected token ${type}`);
    pos++;
    return token;
  };

  const parsePrimary = () => {
    const token = peek();
    if (!token) throw new Error("Unexpected end of expression");
    if (token.type === "number") { pos++; return { type: "number", value: token.value }; }
    if (token.type === "(") {
      consume("(");
      const expr = parseAddSub();
      consume(")");
      return expr;
    }
    if (token.type === "ident") {
      pos++;
      const name = token.value;
      if (/^s\d+$/i.test(name)) return { type: "signal", index: Number(name.slice(1)) };
      const lowered = name.toLowerCase();
      if (peek()?.type === "(") {
        if (!ALLOWED_FUNCTIONS[lowered]) throw new Error(`Unsupported function: ${name}`);
        consume("(");
        const args = [];
        if (peek()?.type !== ")") {
          while (true) {
            args.push(parseAddSub());
            if (peek()?.type === ",") { consume(","); continue; }
            break;
          }
        }
        consume(")");
        return { type: "call", name: lowered, args };
      }
      if (Object.prototype.hasOwnProperty.call(CONSTANTS, lowered)) return { type: "number", value: CONSTANTS[lowered] };
      throw new Error(`Unsupported identifier: ${name}`);
    }
    throw new Error(`Unexpected token: ${token.type}`);
  };

  const parseUnary = () => {
    const token = peek();
    if (token?.type === "+") { consume("+"); return parseUnary(); }
    if (token?.type === "-") { consume("-"); return { type: "neg", value: parseUnary() }; }
    return parsePrimary();
  };

  const parsePower = () => {
    let node = parseUnary();
    while (peek()?.type === "^") {
      consume("^");
      node = { type: "binary", op: "^", left: node, right: parseUnary() };
    }
    return node;
  };

  const parseMulDiv = () => {
    let node = parsePower();
    while (peek() && ["*", "/", "%"].includes(peek().type)) {
      const op = consume(peek().type).type;
      node = { type: "binary", op, left: node, right: parsePower() };
    }
    return node;
  };

  const parseAddSub = () => {
    let node = parseMulDiv();
    while (peek() && ["+", "-"].includes(peek().type)) {
      const op = consume(peek().type).type;
      node = { type: "binary", op, left: node, right: parseMulDiv() };
    }
    return node;
  };

  const ast = parseAddSub();
  if (pos !== tokens.length) throw new Error("Unexpected trailing tokens");
  return ast;
}

function evaluateAst(node, sampleIdx, getAt) {
  if (node.type === "number") return node.value;
  if (node.type === "signal") {
    const raw = getAt(node.index, sampleIdx);
    return (raw === null || raw === undefined || Number.isNaN(raw)) ? null : Number(raw);
  }
  if (node.type === "neg") {
    const v = evaluateAst(node.value, sampleIdx, getAt);
    return v === null ? null : -v;
  }
  if (node.type === "binary") {
    const l = evaluateAst(node.left, sampleIdx, getAt);
    const r = evaluateAst(node.right, sampleIdx, getAt);
    if (l === null || r === null) return null;
    if (node.op === "+") return l + r;
    if (node.op === "-") return l - r;
    if (node.op === "*") return l * r;
    if (node.op === "/") return Math.abs(r) < 1e-12 ? null : l / r;
    if (node.op === "%") return Math.abs(r) < 1e-12 ? null : l % r;
    if (node.op === "^") return Math.pow(l, r);
    return null;
  }
  if (node.type === "call") {
    const args = node.args.map((arg) => evaluateAst(arg, sampleIdx, getAt));
    if (args.some((arg) => arg === null)) return null;
    const fn = ALLOWED_FUNCTIONS[node.name];
    if (!fn) return null;
    const result = fn(...args);
    return (typeof result === "number" && Number.isFinite(result)) ? result : null;
  }
  return null;
}

export function buildEquationEvaluator(expression = "") {
  try {
    const ast = parseExpression(tokenize(String(expression || "")));
    return (sampleIdx, getAt) => {
      try {
        const value = evaluateAst(ast, sampleIdx, getAt);
        return (typeof value === "number" && Number.isFinite(value)) ? value : null;
      } catch {
        return null;
      }
    };
  } catch {
    return () => null;
  }
}
