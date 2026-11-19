import type { CallArgument, CallExpression, Expression, Program } from '../parser/ast';

import { PINE_V6_REFERENCE_SIGNATURES } from '../compat/pineV6BuiltinSignatures';
import { canonicalBuiltinArguments } from '../pineBuiltinParameterRenames';

/**
 * How many bars a script needs before its longest calculation can produce a
 * value. A chart host uses this to load enough history BEFORE the first bar it
 * shows, so an indicator with a 300-bar lookback is not silently `na` on a
 * chart that loaded 300 bars.
 *
 * This is a static ESTIMATE read from the source, not a measurement. It is
 * `longestLookback + deepestHistoryOffset` (FATCAT: `ta.sma(vol, 500)` over a
 * `vb[1]` series is 500 + 1 = 501), or the declared `max_bars_back` when that is
 * larger. Chained calculations can need more than the longest single one, so
 * treat it as a floor, never as an exact warm-up count.
 */
export interface HistoryRequirement {
  /** Bars needed before the first fully warmed bar, capped at `MAX_HISTORY_REQUIREMENT_BARS`. */
  bars: number;
  /**
   * `inferred` from the script's lookbacks, `declared` when its `max_bars_back`
   * is larger, `unknown` when at least one lookback length could not be
   * resolved statically. With `unknown`, `bars` is still a lower bound and the
   * host should apply its own default on top.
   */
  source: 'inferred' | 'declared' | 'unknown';
  longestLookback: number;
  deepestHistoryOffset: number;
  declaredMaxBarsBack?: number;
  unresolvedLookbacks: number;
}

/** Pine's own `max_bars_back` ceiling, which the checker enforces too. */
export const MAX_HISTORY_REQUIREMENT_BARS = 5000;

/** Parameter names that carry a bar count across the `ta.*` signatures. */
const LOOKBACK_PARAM = /length|len|period|bars|smoothing/i;

const TA_SIGNATURES = PINE_V6_REFERENCE_SIGNATURES.ta as Record<
  string,
  { params: readonly string[]; minArgs?: number }
>;

type AstNode = { type: string; [key: string]: unknown };

function isNode(value: unknown): value is AstNode {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

/** Visits every AST node below `root`, in source order. */
function walk(root: unknown, visit: (node: AstNode) => void): void {
  if (Array.isArray(root)) {
    for (const item of root) walk(item, visit);
    return;
  }
  if (!isNode(root)) return;
  visit(root);
  for (const key of Object.keys(root)) {
    if (key === 'loc' || key === 'range') continue;
    const child = root[key];
    if (typeof child === 'object' && child !== null) walk(child, visit);
  }
}

function callName(call: CallExpression): string | undefined {
  const callee = call.callee;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
    return `${callee.object.name}.${callee.property.name}`;
  }
  return undefined;
}

/** Binds named and positional arguments to a signature's parameter names. */
function bindArguments(args: CallArgument[], params: readonly string[]): Map<string, Expression> {
  const bound = new Map<string, Expression>();
  for (const arg of args) if (arg.name) bound.set(arg.name.name, arg.value);
  const free = params.filter((param) => !bound.has(param));
  args
    .filter((arg) => !arg.name)
    .forEach((arg, index) => {
      const param = free[index];
      if (param !== undefined) bound.set(param, arg.value);
    });
  return bound;
}

const INPUT_FUNCTIONS = new Set(['input', 'input.int', 'input.float']);

/**
 * The value an input currently has: a host override keyed the way the runtime
 * keys inputs (`input_<title>`), else its declared default.
 */
function inputValue(call: CallExpression, env: NumericEnv): number | undefined {
  const params = (PINE_V6_REFERENCE_SIGNATURES.input as Record<string, { params: readonly string[] }>)[callName(call)!]
    ?.params ?? ['defval', 'title'];
  const bound = bindArguments(call.arguments, params);
  const title = bound.get('title');
  if (title?.type === 'StringLiteral') {
    const override = env.inputs?.get(`input_${title.value}`);
    if (typeof override === 'number' && Number.isFinite(override)) return override;
  }
  return numericValue(bound.get('defval'), env);
}

interface NumericEnv {
  constants: Map<string, number>;
  inputs?: ReadonlyMap<string, unknown>;
}

/** Folds an expression to a number, or `undefined` when it is not static. */
function numericValue(expr: Expression | undefined, env: NumericEnv): number | undefined {
  if (!expr) return undefined;
  switch (expr.type) {
    case 'NumericLiteral':
      return expr.value;
    case 'Identifier':
      return env.constants.get(expr.name);
    case 'UnaryExpression': {
      const value = numericValue(expr.argument, env);
      if (value === undefined) return undefined;
      if (expr.operator === '-') return -value;
      if (expr.operator === '+') return value;
      return undefined;
    }
    case 'BinaryExpression': {
      const left = numericValue(expr.left, env);
      const right = numericValue(expr.right, env);
      if (left === undefined || right === undefined) return undefined;
      switch (expr.operator) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return right === 0 ? undefined : left / right;
        default:
          return undefined;
      }
    }
    case 'CallExpression': {
      const name = callName(expr);
      return name !== undefined && INPUT_FUNCTIONS.has(name) ? inputValue(expr, env) : undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Top-level names bound once to a static number (`lookback = 300`,
 * `len = input.int(14, "Length")`). A name reassigned anywhere with `:=` or a
 * compound operator is not static and is left out.
 */
function collectConstants(program: Program, inputs: ReadonlyMap<string, unknown> | undefined): NumericEnv {
  const reassigned = new Set<string>();
  walk(program.body, (node) => {
    if (node.type === 'AssignmentStatement') {
      const left = node.left as Expression;
      if (left.type === 'Identifier') reassigned.add(left.name);
    }
  });

  const env: NumericEnv = { constants: new Map(), inputs };
  const declare = (statement: unknown): void => {
    if (!isNode(statement) || statement.type !== 'VariableDeclaration') return;
    const names = statement.names as { type: string; name?: { name: string } };
    if (names.type !== 'VariableDeclarator' || !names.name) return;
    const name = names.name.name;
    if (reassigned.has(name) || env.constants.has(name)) {
      env.constants.delete(name);
      reassigned.add(name);
      return;
    }
    const value = numericValue(statement.init as Expression, env);
    if (value !== undefined && Number.isFinite(value)) env.constants.set(name, value);
  };
  for (const statement of program.body) {
    const declarations =
      isNode(statement) && Array.isArray(statement.declarations) ? statement.declarations : [statement];
    for (const declaration of declarations) declare(declaration);
  }
  return env;
}

function lookbackLengths(call: CallExpression, name: string, version: number, env: NumericEnv): (number | undefined)[] {
  const signature = TA_SIGNATURES[name];
  if (!signature) return [];
  const args = canonicalBuiltinArguments(call.arguments, name, version);
  const positional = args.filter((arg) => !arg.name);
  // `ta.highest(10)` / `ta.lowest(10)`: the one-argument overload is the length.
  const params =
    positional.length === 1 &&
    args.length === 1 &&
    signature.minArgs === 1 &&
    signature.params.length === 2 &&
    signature.params[1] === 'length'
      ? ['length']
      : signature.params;
  const bound = bindArguments(args, params);
  return params
    .filter((param) => LOOKBACK_PARAM.test(param) && bound.has(param))
    .map((param) => numericValue(bound.get(param), env));
}

export function estimateHistoryRequirement(
  program: Program,
  options: { inputs?: ReadonlyMap<string, unknown> } = {},
): HistoryRequirement {
  const env = collectConstants(program, options.inputs);
  let longestLookback = 0;
  let deepestHistoryOffset = 0;
  let unresolvedLookbacks = 0;
  let declaredMaxBarsBack: number | undefined;

  const note = (value: number | undefined): number | undefined => {
    if (value === undefined || !Number.isFinite(value)) {
      unresolvedLookbacks += 1;
      return undefined;
    }
    return Math.max(0, Math.trunc(value));
  };

  walk(program.body, (node) => {
    if (node.type === 'IndicatorDeclaration') {
      const declared = numericValue(node.max_bars_back as Expression | undefined, env);
      if (declared !== undefined && Number.isFinite(declared)) {
        declaredMaxBarsBack = Math.max(declaredMaxBarsBack ?? 0, Math.trunc(declared));
      }
      return;
    }
    if (node.type === 'IndexExpression') {
      const offset = note(numericValue(node.index as Expression, env));
      if (offset !== undefined) deepestHistoryOffset = Math.max(deepestHistoryOffset, offset);
      return;
    }
    if (node.type !== 'CallExpression') return;
    const call = node as unknown as CallExpression;
    const rawName = callName(call);
    if (rawName === undefined) return;
    if (rawName === 'max_bars_back') {
      const depth = numericValue(call.arguments[1]?.value, env);
      if (depth !== undefined && Number.isFinite(depth)) {
        declaredMaxBarsBack = Math.max(declaredMaxBarsBack ?? 0, Math.trunc(depth));
      }
      return;
    }
    // v4 and earlier call `sma(...)`; v5+ calls `ta.sma(...)`.
    const name = rawName.startsWith('ta.') ? rawName : `ta.${rawName}`;
    if (!rawName.startsWith('ta.') && (program.version >= 5 || rawName.includes('.'))) return;
    for (const length of lookbackLengths(call, name, program.version, env)) {
      const value = note(length);
      if (value !== undefined) longestLookback = Math.max(longestLookback, value);
    }
  });

  const inferred = longestLookback + deepestHistoryOffset;
  const required = Math.max(inferred, declaredMaxBarsBack ?? 0);
  return {
    bars: Math.min(MAX_HISTORY_REQUIREMENT_BARS, required),
    source: unresolvedLookbacks > 0 ? 'unknown' : (declaredMaxBarsBack ?? 0) > inferred ? 'declared' : 'inferred',
    longestLookback,
    deepestHistoryOffset,
    declaredMaxBarsBack,
    unresolvedLookbacks,
  };
}
