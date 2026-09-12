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
  source = normalizeLineEndings(source);
  // Replace non-breaking spaces (U+00A0) outside string literals with regular spaces.
  source = normalizeNbspOutsideStrings(source);
  assertSourceLength(source, options.maxSourceLength ?? DEFAULT_MAX_SOURCE_LENGTH);
  const normalized = normalizeIndent(normalizeLeadingTabs(source));
  const preflightError = findInvalidForeignSyntax(normalized);
  if (preflightError) throw preflightError;

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
      const enhancedError = enhanceParseError(normalized, error);
      if (enhancedError) throw enhancedError;

      throw new TealscriptParseError(
        error.message,
        sourceLocationFromPeggy(error),
        error.found,
        error.expected
      );
    }
    throw error;
  }
}

function enhanceParseError(source: string, error: PeggySyntaxError): TealscriptParseError | null {
  const rejectedInvisibleCharacter = findRejectedInvisibleCharacterAtError(source, error);
  if (rejectedInvisibleCharacter !== undefined) {
    const character = source[rejectedInvisibleCharacter];
    if (character === '\u3000') {
      return new TealscriptParseError(
        'Unexpected full-width space (U+3000 IDEOGRAPHIC SPACE). Non-breaking spaces (U+00A0) are tolerated as layout whitespace, but full-width spaces are not; replace it with a regular ASCII space.',
        sourceLocationAtOffset(source, rejectedInvisibleCharacter, rejectedInvisibleCharacter + 1),
        '\u3000',
        error.expected
      );
    }
    return new TealscriptParseError(
      `Unexpected ${unicodeCharacterName(character)}. This character is invisible or looks like ordinary whitespace; delete it or replace it with a regular ASCII space. Non-breaking spaces (U+00A0) are tolerated as layout whitespace, but this character is not.`,
      sourceLocationAtOffset(source, rejectedInvisibleCharacter, rejectedInvisibleCharacter + 1),
      character,
      error.expected
    );
  }

  const foreignSyntaxError = enhanceForeignSyntaxError(source, error);
  if (foreignSyntaxError) return foreignSyntaxError;

  const callbackOffset = findJsStyleCallbackOffset(source, error.location.start.offset);
  if (callbackOffset !== undefined) {
    return new TealscriptParseError(
      'Pine Script does not support JavaScript-style inline callback functions. Declare a named Pine function with => syntax and pass only forms supported by the called API.',
      sourceLocationAtOffset(source, callbackOffset, callbackOffset + 'function'.length),
      'function',
      error.expected
    );
  }

  return null;
}

function enhanceForeignSyntaxError(source: string, error: PeggySyntaxError): TealscriptParseError | null {
  const reportedOffset = error.location.start.offset;
  const strictEqualityOffset = findJsStrictEqualityOffset(source, reportedOffset);
  if (strictEqualityOffset !== undefined) {
    const token = source.startsWith('!==', strictEqualityOffset) ? '!==' : '===';
    return new TealscriptParseError(
      `Pine Script uses \`${token === '!==' ? '!=' : '=='}\` for comparison; JavaScript-style \`${token}\` is not valid Pine syntax.`,
      sourceLocationAtOffset(source, strictEqualityOffset, strictEqualityOffset + token.length),
      token,
      error.expected
    );
  }
  const bangOffset = findJsBangOffset(source, reportedOffset);
  if (bangOffset !== undefined) {
    return new TealscriptParseError(
      'Pine Script uses the word operator `not`; JavaScript-style `!` is not valid Pine syntax.',
      sourceLocationAtOffset(source, bangOffset, bangOffset + 1),
      '!',
      error.expected
    );
  }
  const missingWrappedComma = findMissingWrappedArgumentComma(source, reportedOffset);
  if (missingWrappedComma) {
    return new TealscriptParseError(
      `Missing comma before wrapped argument \`${missingWrappedComma.name}=\`. Pine wrapped argument lists still need commas between arguments.`,
      sourceLocationAtOffset(source, missingWrappedComma.offset, missingWrappedComma.offset + missingWrappedComma.name.length),
      missingWrappedComma.name[0] ?? error.found,
      error.expected
    );
  }
  const operatorOffset = source.startsWith('||', reportedOffset - 1) || source.startsWith('&&', reportedOffset - 1)
    ? reportedOffset - 1
    : reportedOffset;
  const token = source.startsWith('||', operatorOffset) ? '||'
    : source.startsWith('&&', operatorOffset) ? '&&'
      : error.found;
  if (token === '||') {
    return new TealscriptParseError(
      'Pine Script uses the word operator `or`; JavaScript-style `||` is not valid Pine syntax.',
      sourceLocationAtOffset(source, operatorOffset, operatorOffset + token.length),
      token,
      error.expected
    );
  }
  if (token === '&&') {
    return new TealscriptParseError(
      'Pine Script uses the word operator `and`; JavaScript-style `&&` is not valid Pine syntax.',
      sourceLocationAtOffset(source, operatorOffset, operatorOffset + token.length),
      token,
      error.expected
    );
  }
  if (token === ';') {
    return new TealscriptParseError(
      'Pine Script statements are separated by new lines or supported comma chains; semicolons are not valid statement separators.',
      sourceLocationAtOffset(source, reportedOffset, reportedOffset + token.length),
      token,
      error.expected
    );
  }
  if (token === '{' || token === '}') {
    return new TealscriptParseError(
      'Pine Script uses indentation to delimit blocks; JavaScript-style braces are not valid Pine syntax.',
      sourceLocationAtOffset(source, reportedOffset, reportedOffset + token.length),
      token,
      error.expected
    );
  }
  return null;
}

function findInvalidForeignSyntax(source: string): TealscriptParseError | null {
  const functionOffset = findJsFunctionDeclarationOffset(source);
  if (functionOffset !== undefined) {
    return new TealscriptParseError(
      'Pine Script functions are declared as `name(args) =>`; JavaScript-style `function name(...)` declarations are not valid Pine syntax.',
      sourceLocationAtOffset(source, functionOffset, functionOffset + 'function'.length),
      'function',
      []
    );
  }

  const returnOffset = findStatementKeywordOffset(source, 'return');
  if (returnOffset !== undefined) {
    return new TealscriptParseError(
      'Pine Script has no `return` statement; a Pine function returns the value of its last expression.',
      sourceLocationAtOffset(source, returnOffset, returnOffset + 'return'.length),
      'return',
      []
    );
  }

  const thenOffset = findIfThenOffset(source);
  if (thenOffset !== undefined) {
    return new TealscriptParseError(
      'Pine Script `if` statements do not use `then`; put the block on the following indented line.',
      sourceLocationAtOffset(source, thenOffset, thenOffset + 'then'.length),
      'then',
      []
    );
  }

  const letOffset = findLetDeclarationOffset(source);
  if (letOffset !== undefined) {
    return new TealscriptParseError(
      'Pine Script does not use JavaScript `let` declarations; assign directly or use a Pine type/qualifier such as `float x = ...` or `var x = ...`.',
      sourceLocationAtOffset(source, letOffset, letOffset + 'let'.length),
      'let',
      []
    );
  }

  return null;
}

function findStatementKeywordOffset(source: string, keyword: string): number | undefined {
  const pattern = new RegExp(`(^|\\n)([ \\t]*)${keyword}\\b`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const offset = match.index + (match[1]?.length ?? 0) + (match[2]?.length ?? 0);
    if (!isInsideStringOrComment(source, offset)) return offset;
  }
  return undefined;
}

function findIfThenOffset(source: string): number | undefined {
  const pattern = /(^|\n)[ \t]*if\b[^\n]*\bthen\b/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const lineStart = match.index + (match[1] === '\n' ? 1 : 0);
    const line = source.slice(lineStart, pattern.lastIndex);
    const thenInLine = line.search(/\bthen\b/);
    if (thenInLine < 0) continue;
    const thenOffset = lineStart + thenInLine;
    if (!isInsideStringOrComment(source, thenOffset)) return thenOffset;
  }
  return undefined;
}

function findLetDeclarationOffset(source: string): number | undefined {
  const pattern = /(^|\n)([ \t]*)let[ \t]+[A-Za-z_\p{L}][A-Za-z0-9_\p{L}\p{N}]*[ \t]*=/gu;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const offset = match.index + (match[1]?.length ?? 0) + (match[2]?.length ?? 0);
    if (!isInsideStringOrComment(source, offset)) return offset;
  }
  return undefined;
}

function findJsFunctionDeclarationOffset(source: string): number | undefined {
  const pattern = /(^|\n)([ \t]*)function[ \t]+[A-Za-z_\p{L}][A-Za-z0-9_\p{L}\p{N}]*[ \t]*\(/gu;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const offset = match.index + (match[1]?.length ?? 0) + (match[2]?.length ?? 0);
    if (!isInsideStringOrComment(source, offset)) return offset;
  }
  return undefined;
}

function sourceLocationFromPeggy(error: PeggySyntaxError): SourceLocation {
  return {
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
  };
}

function sourceLocationAtOffset(source: string, startOffset: number, endOffset: number): SourceLocation {
  return {
    start: positionAtOffset(source, startOffset),
    end: positionAtOffset(source, endOffset),
  };
}

function positionAtOffset(source: string, offset: number): SourceLocation['start'] {
  let line = 1;
  let column = 1;
  for (let index = 0; index < offset; index++) {
    if (source[index] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column, offset };
}

function findRejectedInvisibleCharacterAtError(source: string, error: PeggySyntaxError): number | undefined {
  if (error.found && isRejectedInvisibleCharacter(error.found)) return error.location.start.offset;
  const offset = error.location.start.offset;
  if (isRejectedInvisibleCharacter(source[offset] ?? '')) return offset;
  return undefined;
}

function isRejectedInvisibleCharacter(character: string): boolean {
  return character === '\u3000'
    || character === '\u200b'
    || character === '\u200c'
    || character === '\u200d'
    || character === '\u202f'
    || character === '\u2060'
    || character === '\ufeff';
}

function unicodeCharacterName(character: string): string {
  const names: Record<string, string> = {
    '\u200b': 'zero-width space (U+200B ZERO WIDTH SPACE)',
    '\u200c': 'zero-width non-joiner (U+200C ZERO WIDTH NON-JOINER)',
    '\u200d': 'zero-width joiner (U+200D ZERO WIDTH JOINER)',
    '\u202f': 'narrow no-break space (U+202F NARROW NO-BREAK SPACE)',
    '\u2060': 'word joiner (U+2060 WORD JOINER)',
    '\ufeff': 'byte order mark (U+FEFF) inside the script',
  };
  return names[character] ?? `Unicode character U+${character.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')}`;
}

function findJsStrictEqualityOffset(source: string, errorOffset: number): number | undefined {
  for (const offset of [errorOffset - 2, errorOffset - 1, errorOffset]) {
    if (offset < 0 || isInsideStringOrComment(source, offset)) continue;
    if (source.startsWith('===', offset) || source.startsWith('!==', offset)) return offset;
  }
  return undefined;
}

function findJsBangOffset(source: string, errorOffset: number): number | undefined {
  for (const offset of [errorOffset - 1, errorOffset]) {
    if (offset < 0 || source[offset] !== '!' || source[offset + 1] === '=' || isInsideStringOrComment(source, offset)) continue;
    return offset;
  }
  return undefined;
}

function findMissingWrappedArgumentComma(source: string, errorOffset: number): { offset: number; name: string } | undefined {
  const lineStart = source.lastIndexOf('\n', errorOffset - 1) + 1;
  const lineEnd = source.indexOf('\n', errorOffset);
  const line = source.slice(lineStart, lineEnd < 0 ? source.length : lineEnd);
  const match = line.match(/^([ \t]*)([A-Za-z_\p{L}][A-Za-z0-9_\p{L}\p{N}]*)[ \t]*=/u);
  if (!match) return undefined;
  const argumentOffset = lineStart + match[1].length;
  if (argumentOffset !== errorOffset || isInsideStringOrComment(source, argumentOffset)) return undefined;
  const previousCode = previousNonEmptyCodeLine(source, lineStart);
  if (!previousCode || previousCode.trimEnd().endsWith(',') || previousCode.trimEnd().endsWith('(')) return undefined;
  if (!hasUnclosedDelimiter(source.slice(0, lineStart))) return undefined;
  return { offset: argumentOffset, name: match[2] };
}

function previousNonEmptyCodeLine(source: string, beforeOffset: number): string | undefined {
  const previousSource = source.slice(0, beforeOffset);
  const lines = previousSource.split('\n');
  for (let index = lines.length - 1; index >= 0; index--) {
    const code = stripLineCommentOutsideStrings(lines[index] ?? '').trimEnd();
    if (code.trim().length > 0) return code;
  }
  return undefined;
}

function findJsStyleCallbackOffset(source: string, errorOffset: number): number | undefined {
  for (let offset = 0; offset <= errorOffset && offset < source.length; offset++) {
    if (!source.startsWith('function', offset)) continue;
    if (isIdentifierBoundaryPart(source[offset - 1] ?? '') || isIdentifierBoundaryPart(source[offset + 'function'.length] ?? '')) continue;
    let cursor = offset + 'function'.length;
    while (source[cursor] === ' ' || source[cursor] === '\t') cursor += 1;
    if (source[cursor] !== '(') continue;
    if (isInsideStringOrComment(source, offset)) continue;
    return offset;
  }
  return undefined;
}

function isIdentifierBoundaryPart(character: string): boolean {
  return /^[A-Za-z0-9_]$/u.test(character) || /^[\p{L}\p{N}]$/u.test(character);
}

function isInsideStringOrComment(source: string, targetOffset: number): boolean {
  let inDouble = false;
  let inSingle = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let offset = 0; offset < targetOffset; offset++) {
    const ch = source[offset];
    const next = source[offset + 1];

    if (inLineComment) {
      if (ch === '\n' || ch === '\r') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        offset += 1;
      }
      continue;
    }
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && (inDouble || inSingle)) {
      escaped = true;
      continue;
    }
    if (!inDouble && !inSingle && ch === '/' && next === '/') {
      inLineComment = true;
      offset += 1;
      continue;
    }
    if (!inDouble && !inSingle && ch === '/' && next === '*') {
      inBlockComment = true;
      offset += 1;
      continue;
    }
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
  }

  return inDouble || inSingle || inLineComment || inBlockComment;
}

function isProgramNode(value: unknown): value is Program {
  return Boolean(value && typeof value === 'object' && (value as { type?: unknown }).type === 'Program');
}

function detectPineVersion(source: string): number | undefined {
  const match = source.match(/\/\/\s*@version\s*=\s*(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

function normalizeLineEndings(source: string): string {
  return source.replace(/\r+\n/g, '\n').replace(/\r/g, '\n');
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
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === '\n' || ch === '\r') inLineComment = false;
      result += ch === NBSP ? ' ' : ch;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        result += '*/';
        i += 1;
        inBlockComment = false;
        continue;
      }
      result += ch === NBSP ? ' ' : ch;
      continue;
    }

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
    if (!inDouble && !inSingle && ch === '/' && next === '/') {
      inLineComment = true;
      result += '//';
      i += 1;
      continue;
    }
    if (!inDouble && !inSingle && ch === '/' && next === '*') {
      inBlockComment = true;
      result += '/*';
      i += 1;
      continue;
    }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; result += ch; continue; }
    if (ch === "'" && !inDouble) { inSingle = !inSingle; result += ch; continue; }
    if (ch === NBSP && !inDouble && !inSingle) { result += ' '; continue; }
    result += ch;
  }
  return result;
}

// Normalize 3-space indented UDF bodies to 4-space. Two-space indentation is
// accepted directly by the grammar; normalizing it globally can rewrite valid
// four-space type/enum blocks into deeper blocks when a later two-space UDF is
// present.
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
  // Only normalize the well-known non-grammar indent size.
  if (minIndent !== 3) return source;
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
