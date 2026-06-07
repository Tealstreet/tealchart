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
  assertSourceLength(source, options.maxSourceLength ?? DEFAULT_MAX_SOURCE_LENGTH);
  const normalized = normalizeLeadingTabs(source);

  try {
    const result = generatedParser.parse(normalized, {
      startRule: options.startRule || 'Program',
      grammarSource: options.grammarSource || 'input',
    });

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

// Replace leading tabs on each line with 4 spaces (Pine convention).
// Only affects leading whitespace so tabs inside string literals are untouched.
function normalizeLeadingTabs(source: string): string {
  return source.replace(/^(\t+)/gm, (tabs) => '    '.repeat(tabs.length));
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
