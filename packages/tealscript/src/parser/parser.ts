/**
 * Tealscript Parser
 *
 * Wraps the Peggy-generated parser with a nice TypeScript interface.
 */

import type { AnyNode, Expression, Program, SourceLocation, Statement } from './ast';
import * as generatedParser from './generated';

const DEFAULT_MAX_SOURCE_LENGTH = 1_000_000;
const DEFAULT_MAX_AST_DEPTH = 1000;

/**
 * Parse error with location information
 */
export class TealscriptParseError extends Error {
  location: SourceLocation;
  found: string | null;
  expected: Array<{ type: string; description: string }>;

  constructor(
    message: string,
    location: SourceLocation,
    found: string | null,
    expected: Array<{ type: string; description: string }>
  ) {
    super(message);
    this.name = 'TealscriptParseError';
    this.location = location;
    this.found = found;
    this.expected = expected;
  }
}

export class TealscriptParseLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TealscriptParseLimitError';
  }
}

/**
 * Parser options
 */
export type ParseStartRule = 'Program' | 'Expression' | 'Statement';

export type ParseResult<T extends ParseStartRule> =
  T extends 'Expression' ? Expression :
  T extends 'Statement' ? Statement :
  Program;

export interface ParseOptions<T extends ParseStartRule = 'Program'> {
  /** Start rule for parsing (default: 'Program') */
  startRule?: T;
  /** Source name for error messages */
  grammarSource?: string;
  /** Maximum source length in UTF-16 code units */
  maxSourceLength?: number;
  /** Maximum AST node nesting depth after parsing */
  maxAstDepth?: number;
}

/**
 * Parse Tealscript source code into an AST
 *
 * @param source - The Tealscript source code to parse
 * @param options - Parser options
 * @returns The parsed AST Program node
 * @throws TealscriptParseError if parsing fails
 *
 * @example
 * ```typescript
 * const ast = parse(`
 *   //@version=6
 *   indicator("My Indicator")
 *   plot(ta.sma(close, 14))
 * `);
 * ```
 */
export function parse(source: string, options?: ParseOptions<'Program'>): Program;
export function parse(source: string, options: ParseOptions<'Expression'>): Expression;
export function parse(source: string, options: ParseOptions<'Statement'>): Statement;
export function parse<T extends ParseStartRule>(source: string, options: ParseOptions<T>): ParseResult<T>;
export function parse(source: string, options: ParseOptions<ParseStartRule> = {}): Program | Expression | Statement {
  // Strip UTF-8 BOM if present so scripts saved with BOM parse correctly.
  source = source.replace(/^﻿/, '');
  // Replace non-breaking spaces (U+00A0) outside string literals with regular spaces.
  source = normalizeNbspOutsideStrings(source);
  assertSourceLength(source, options.maxSourceLength ?? DEFAULT_MAX_SOURCE_LENGTH);
  const normalized = normalizeIndent(normalizeLeadingTabs(source));

  try {
    const result = generatedParser.parse(normalized, {
      startRule: options.startRule || 'Program',
      grammarSource: options.grammarSource || 'input',
    });

    if ((options.startRule ?? 'Program') === 'Program' && isProgramNode(result)) {
      const detectedVersion = detectPineVersion(normalized);
      result.version = detectedVersion ?? result.version;
      result.explicitVersion = detectedVersion !== undefined;
    }
    assertAstDepth(result as AnyNode, options.maxAstDepth ?? DEFAULT_MAX_AST_DEPTH);
    return result as Program | Expression | Statement;
  } catch (error) {
    if (isPeggyError(error)) {
      throw new TealscriptParseError(
        error.message,
        {
          start: {
            line: error.location.start.line,
            column: error.location.start.column,
            offset: error.location.start.offset,
          },
          end: {
            line: error.location.end.line,
            column: error.location.end.column,
            offset: error.location.end.offset,
          },
        },
        error.found,
        error.expected
      );
    }
    throw error;
  }
}

function isProgramNode(value: unknown): value is Program {
  return Boolean(value && typeof value === 'object' && (value as { type?: unknown }).type === 'Program');
}

function detectPineVersion(source: string): number | undefined {
  const match = source.match(/\/\/\s*@version\s*=\s*(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

// Replace leading tabs on each line with 4 spaces (Pine convention).
// Only affects leading whitespace so tabs inside string literals are untouched.
function normalizeLeadingTabs(source: string): string {
  return source.replace(/^(\t+)/gm, (tabs) => '    '.repeat(tabs.length));
}

// Replace U+00A0 (non-breaking space) with regular space outside string literals.
// Leaves NBSP inside single- or double-quoted strings untouched.
function normalizeNbspOutsideStrings(source: string): string {
  const NBSP = ' ';
  if (!source.includes(NBSP)) return source;
  let result = '';
  let inDouble = false;
  let inSingle = false;
  let escaped = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (escaped) {
      escaped = false;
      result += ch;
      continue;
    }
    if (ch === '\\' && (inDouble || inSingle)) {
      escaped = true;
      result += ch;
      continue;
    }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; result += ch; continue; }
    if (ch === "'" && !inDouble) { inSingle = !inSingle; result += ch; continue; }
    if (ch === NBSP && !inDouble && !inSingle) { result += ' '; continue; }
    result += ch;
  }
  return result;
}

// Normalize 2-space or 3-space indented UDF bodies to 4-space.
// Applies when every indented line's leading spaces are an exact multiple of
// the minimum indent unit (2 or 3). This ensures the script is consistently
// small-indent before promoting to 4-space multiples.
function normalizeIndent(source: string): string {
  const lines = source.split('\n');
  const continuationLines = continuationLineIndexes(lines);
  let minIndent = Infinity;
  const indentLevels = new Set<number>();
  for (const [index, line] of lines.entries()) {
    if (continuationLines.has(index)) continue;
    if (line.trim().length === 0) continue;
    const leading = line.match(/^ +/);
    if (leading) {
      const n = leading[0].length;
      indentLevels.add(n);
      if (n < minIndent) minIndent = n;
    }
  }
  if (minIndent === Infinity) return source;
  // Only normalize well-known non-4 indent sizes (2 or 3).
  if (minIndent !== 2 && minIndent !== 3) return source;
  // All observed indent levels must be exact multiples of minIndent.
  // If any level is not a multiple, the script has mixed/irregular indentation — skip.
  if ([...indentLevels].some(n => n % minIndent !== 0)) return source;
  if (!hasSmallIndentBlockBodyLine(lines, continuationLines, minIndent)) return source;
  // Consistent small-unit indent — promote each level to multiples of 4.
  return lines
    .map((line, index) => {
      if (continuationLines.has(index)) return line;
      const leading = line.match(/^ +/);
      if (!leading) return line;
      const spaces = leading[0].length;
      const units = spaces / minIndent;
      return ' '.repeat(units * 4) + line.slice(spaces);
    })
    .join('\n');
}

function hasSmallIndentBlockBodyLine(lines: readonly string[], continuationLines: ReadonlySet<number>, minIndent: number): boolean {
  let previousCode = '';
  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('//')) continue;
    const leading = line.match(/^ +/)?.[0].length ?? 0;
    if (leading === minIndent && !continuationLines.has(index) && opensIndentedBlock(previousCode)) {
      return true;
    }
    previousCode = stripLineCommentOutsideStrings(line).trimEnd();
  }
  return false;
}

function opensIndentedBlock(code: string): boolean {
  return /=>\s*$/.test(code) || /^(?:if|else if|else|for|while|switch)\b/.test(code.trim());
}

function continuationLineIndexes(lines: readonly string[]): Set<number> {
  const indexes = new Set<number>();
  let previousCode = '';

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('//')) continue;

    const leading = line.match(/^ +/)?.[0].length ?? 0;
    if (leading > 0 && previousCode && isLikelyContinuation(previousCode, trimmed)) {
      indexes.add(index);
    }
    previousCode = stripLineCommentOutsideStrings(line).trimEnd();
  }

  return indexes;
}

function isLikelyContinuation(previousCode: string, currentTrimmed: string): boolean {
  if (/^[,?:+\-*\/%]/.test(currentTrimmed)) return true;
  if (/^(else\s+)?if$/.test(previousCode.trimEnd())) return true;
  if (/(^|[^=!<>])=$/.test(previousCode.trimEnd())) return true;
  if (/[,(?:+\-*\/%]$/.test(previousCode.trimEnd())) return true;
  return hasUnclosedDelimiter(previousCode);
}

function hasUnclosedDelimiter(code: string): boolean {
  let parens = 0;
  let brackets = 0;
  let inDouble = false;
  let inSingle = false;
  let escaped = false;
  for (const ch of code) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && (inDouble || inSingle)) {
      escaped = true;
      continue;
    }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (inDouble || inSingle) continue;
    if (ch === '(') parens++;
    if (ch === ')' && parens > 0) parens--;
    if (ch === '[') brackets++;
    if (ch === ']' && brackets > 0) brackets--;
  }
  return parens > 0 || brackets > 0;
}

function stripLineCommentOutsideStrings(line: string): string {
  let inDouble = false;
  let inSingle = false;
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && (inDouble || inSingle)) {
      escaped = true;
      continue;
    }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (!inDouble && !inSingle && ch === '/' && next === '/') return line.slice(0, i);
  }
  return line;
}

function assertSourceLength(source: string, maxSourceLength: number): void {
  const limit = normalizePositiveLimit(maxSourceLength, 'source length');
  if (source.length > limit) {
    throw new TealscriptParseLimitError(`Script source is too large: maximum length is ${limit}`);
  }
}

function assertAstDepth(root: AnyNode, maxAstDepth: number): void {
  const limit = normalizePositiveLimit(maxAstDepth, 'AST depth');
  const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 1 }];
  const seen = new Set<object>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const { value, depth } = current;
    if (!isObjectLike(value)) continue;
    if (seen.has(value)) continue;
    seen.add(value);

    const isNode = isAstNode(value);
    const nodeDepth = isNode ? depth : Math.max(1, depth - 1);
    if (isNode && nodeDepth > limit) {
      throw new TealscriptParseLimitError(`Script AST is too deep: maximum depth is ${limit}`);
    }

    if (Array.isArray(value)) {
      for (const child of value) {
        stack.push({ value: child, depth });
      }
      continue;
    }

    for (const [key, child] of Object.entries(value)) {
      if (key === 'loc') continue;
      stack.push({ value: child, depth: isNode ? nodeDepth + 1 : depth });
    }
  }
}

function normalizePositiveLimit(value: number, label: string): number {
  const limit = Math.trunc(value);
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new TealscriptParseLimitError(`Invalid ${label} limit: ${value}`);
  }
  return limit;
}

function isObjectLike(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function isAstNode(value: object): value is AnyNode {
  return typeof (value as { type?: unknown }).type === 'string';
}

/**
 * Type guard for Peggy syntax errors
 */
interface PeggySyntaxError extends Error {
  location: {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
  };
  found: string | null;
  expected: Array<{ type: string; description: string }>;
}

function isPeggyError(error: unknown): error is PeggySyntaxError {
  return (
    error instanceof Error &&
    'location' in error &&
    'found' in error &&
    'expected' in error
  );
}

/**
 * Validate Tealscript source without returning the AST
 *
 * @param source - The Tealscript source code to validate
 * @returns null if valid, or an error message if invalid
 */
export function validate(source: string): string | null {
  try {
    parse(source);
    return null;
  } catch (error) {
    if (error instanceof TealscriptParseError) {
      return `Line ${error.location.start.line}: ${error.message}`;
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }
}

/**
 * Format a parse error for display
 */
export function formatParseError(error: TealscriptParseError, source: string): string {
  const lines = source.split('\n');
  const line = lines[error.location.start.line - 1] || '';
  const pointer = ' '.repeat(error.location.start.column - 1) + '^';

  return [
    `Parse error at line ${error.location.start.line}, column ${error.location.start.column}:`,
    '',
    `  ${line}`,
    `  ${pointer}`,
    '',
    error.message,
  ].join('\n');
}
