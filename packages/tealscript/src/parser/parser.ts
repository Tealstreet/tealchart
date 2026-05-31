/**
 * Tealscript Parser
 *
 * Wraps the Peggy-generated parser with a nice TypeScript interface.
 */

import type { Expression, Program, SourceLocation, Statement } from './ast';
import * as generatedParser from './generated';

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
  try {
    const result = generatedParser.parse(source, {
      startRule: options.startRule || 'Program',
      grammarSource: options.grammarSource || 'input',
    });

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
