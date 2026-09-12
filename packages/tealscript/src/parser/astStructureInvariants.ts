import type {
  BinaryExpression,
  Expression,
  FunctionDeclaration,
  IfStatement,
  Program,
  SourceLocation,
  Statement,
  SwitchExpression,
  VariableDeclaration,
} from './ast';

export type AstStructureInvariantCode =
  | 'block-child-outside-source-region'
  | 'indented-statement-missing-from-block'
  | 'function-body-outside-function-span'
  | 'if-lost-same-indent-else'
  | 'tuple-if-lost-same-indent-else'
  | 'switch-case-order'
  | 'switch-arm-count-mismatch'
  | 'operator-precedence-root-mismatch';

export interface AstStructureInvariantIssue {
  code: AstStructureInvariantCode;
  message: string;
  line: number;
  column: number;
  nodeType: string;
}

interface NodeLike {
  type: string;
  loc?: SourceLocation;
  [key: string]: unknown;
}

interface ParentEntry {
  node: NodeLike;
  parent?: NodeLike;
}

type BlockOwner = FunctionDeclaration | IfStatement | Extract<Statement, { type: 'ForStatement' | 'WhileStatement' | 'OnceStatement' }>;

interface BlockRegion {
  startLine: number;
  endLine: number;
  headerIndent: number;
}

// Pine v6 operator reference, decreasing precedence: [] 9, unary 8,
// multiplicative 7, additive 6, relational 5, equality 4, and 3, or 2, ?: 1.
// This invariant checks documented binary operators only; []/unary/?: are not
// BinaryExpression nodes, and undocumented bitwise operators are skipped.
const BINARY_PRECEDENCE = new Map<string, number>([
  ['or', 2],
  ['and', 3],
  ['==', 4],
  ['!=', 4],
  ['<', 5],
  ['>', 5],
  ['<=', 5],
  ['>=', 5],
  ['+', 6],
  ['-', 6],
  ['*', 7],
  ['/', 7],
  ['%', 7],
]);

const LEFT_TO_RIGHT_OPERATORS = new Set(BINARY_PRECEDENCE.keys());

export function checkAstStructureInvariants(program: Program, source: string): AstStructureInvariantIssue[] {
  const normalizedSource = normalizeAuditSource(source);
  const searchableSource = maskCommentsAndStrings(normalizedSource);
  const lines = searchableSource.split('\n');
  const entries = collectNodes(program as unknown as NodeLike);
  const parents = new Map(entries.map((entry) => [entry.node, entry.parent]));
  const statements = entries.map((entry) => entry.node).filter(isStatementLike);
  const binarySpanCounts = countBinarySpans(entries);
  const issues: AstStructureInvariantIssue[] = [];

  for (const entry of entries) {
    const { node } = entry;
    if (isBlockOwner(node)) {
      checkBlockOwner(node, lines, statements, parents, issues);
    }
    if (node.type === 'IfStatement') {
      checkIfStatement(node as unknown as IfStatement, searchableSource, issues);
    }
    if (node.type === 'VariableDeclaration') {
      checkTupleIfInitializer(node as unknown as VariableDeclaration, searchableSource, issues);
    }
    if (node.type === 'SwitchExpression') {
      checkSwitchExpression(node as unknown as SwitchExpression, normalizedSource, searchableSource, issues);
    }
    if (
      node.type === 'BinaryExpression'
      && entry.parent?.type !== 'BinaryExpression'
      && binarySpanCounts.get(locationKey(node.loc)) === 1
    ) {
      checkBinaryExpression(node as unknown as BinaryExpression, normalizedSource, issues);
    }
  }

  return dedupeIssues(issues);
}

function normalizeAuditSource(source: string) {
  const normalized = source
    .replace(/^﻿/, '')
    .replace(/\r+\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ');
  return normalizeIndentForAudit(normalizeLeadingTabsForAudit(normalized));
}

function collectNodes(root: NodeLike): ParentEntry[] {
  const entries: ParentEntry[] = [];
  const visit = (node: NodeLike, parent?: NodeLike) => {
    entries.push({ node, parent });
    for (const child of childNodes(node)) visit(child, node);
  };
  visit(root);
  return entries;
}

function childNodes(node: NodeLike): NodeLike[] {
  const children: NodeLike[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNodeLike(item)) children.push(item);
      }
    } else if (isNodeLike(value)) {
      children.push(value);
    }
  }
  return children;
}

function countBinarySpans(entries: ParentEntry[]) {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.node.type !== 'BinaryExpression') continue;
    const key = locationKey(entry.node.loc);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function locationKey(loc?: SourceLocation) {
  return loc ? `${loc.start.offset}:${loc.end.offset}` : 'missing';
}

function isNodeLike(value: unknown): value is NodeLike {
  return !!value && typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string';
}

function isStatementLike(node: NodeLike): node is Statement & NodeLike {
  return node.type.endsWith('Statement')
    || node.type.endsWith('Declaration')
    || node.type === 'MultiAssignment'
    || node.type === 'MultiStatement';
}

function isBlockOwner(node: NodeLike): node is BlockOwner & NodeLike {
  return (node.type === 'FunctionDeclaration' && Array.isArray((node as { body?: unknown }).body))
    || node.type === 'ForStatement'
    || node.type === 'WhileStatement'
    || node.type === 'OnceStatement'
    || node.type === 'IfStatement';
}

function checkBlockOwner(
  owner: BlockOwner & NodeLike,
  lines: string[],
  statements: NodeLike[],
  parents: Map<NodeLike, NodeLike | undefined>,
  issues: AstStructureInvariantIssue[],
) {
  if (!owner.loc) return;
  const regions = blockRegions(owner, lines);
  const directBodyStatements = ownerBodyStatements(owner);
  for (const statement of directBodyStatements) {
    if (!statement.loc) continue;
    const containingRegion = regions.find((region) => statement.loc
      && statement.loc.start.line >= region.startLine
      && statement.loc.start.line <= region.endLine);
    if (!containingRegion) {
      pushIssue(issues, 'block-child-outside-source-region', statement as NodeLike, `${statement.type} starts outside ${owner.type}'s indentation region`);
    }
    if (owner.type === 'FunctionDeclaration' && !within(statement.loc, owner.loc)) {
      pushIssue(issues, 'function-body-outside-function-span', statement as NodeLike, `${statement.type} falls outside its FunctionDeclaration source span`);
    }
  }

  for (const statement of statements) {
    if (!statement.loc || statement === owner) continue;
    const containingRegion = regions.find((region) => statement.loc
      && statement.loc.start.line >= region.startLine
      && statement.loc.start.line <= region.endLine);
    if (owner.type === 'FunctionDeclaration' && !isDescendantOf(statement, owner, parents) && containingRegion) {
      const sourceIndent = lineIndent(lines[statement.loc.start.line - 1] ?? '');
      if (sourceIndent > containingRegion.headerIndent) {
        pushIssue(issues, 'indented-statement-missing-from-block', statement, `${statement.type} is indented under ${owner.type} but is not its AST descendant`);
      }
    }
  }
}

function ownerBodyStatements(owner: BlockOwner & NodeLike): Statement[] {
  if (owner.type === 'FunctionDeclaration') return Array.isArray(owner.body) ? owner.body : [];
  if (owner.type === 'ForStatement' || owner.type === 'WhileStatement' || owner.type === 'OnceStatement') return owner.body;
  const alternate = owner.alternate;
  return [
    ...owner.consequent,
    ...(Array.isArray(alternate) ? alternate : []),
  ];
}

function blockRegions(owner: BlockOwner & NodeLike, lines: string[]): BlockRegion[] {
  if (!owner.loc) return [];
  if (owner.type === 'FunctionDeclaration' && Array.isArray(owner.body) && owner.body.length > 0) {
    return [functionBodyRegion(owner, lines)];
  }
  if (owner.type !== 'IfStatement') return [regionAfterHeader(owner.loc.start.line, lines)];

  const regions: BlockRegion[] = [];
  let current: IfStatement | undefined = owner as unknown as IfStatement;
  while (current?.loc) {
    regions.push(regionForBodyStatements(current.loc.start.line, current.consequent, lines));
    const alternate: IfStatement['alternate'] = current.alternate;
    if (Array.isArray(alternate) && alternate.length > 0 && alternate[0]?.loc) {
      const alternateHeaderLine = findNearestPreviousLineMatching(lines, alternate[0].loc.start.line, /^(\s*)else\b/);
      if (alternateHeaderLine !== undefined) regions.push(regionForBodyStatements(alternateHeaderLine, alternate, lines));
      break;
    }
    current = alternate && !Array.isArray(alternate) ? alternate : undefined;
  }
  return regions;
}

function functionBodyRegion(owner: FunctionDeclaration & NodeLike, lines: string[]): BlockRegion {
  const firstStatement = Array.isArray(owner.body) ? owner.body.find((statement) => statement.loc) : undefined;
  if (!firstStatement?.loc) return regionAfterHeader(owner.loc?.start.line ?? 1, lines);
  const bodyIndent = lineIndent(lines[firstStatement.loc.start.line - 1] ?? '');
  let endLine = owner.loc?.end.line ?? firstStatement.loc.start.line;
  let previousCode = stripLineCommentOutsideStringsForAudit(lines[firstStatement.loc.start.line - 1] ?? '').trimEnd();
  for (let lineNo = firstStatement.loc.start.line + 1; lineNo <= lines.length; lineNo += 1) {
    if (owner.loc && lineNo > owner.loc.end.line) break;
    const line = lines[lineNo - 1] ?? '';
    if (!line.trim()) {
      endLine = lineNo;
      continue;
    }
    if (isContinuationLayoutLine(line, previousCode)) {
      endLine = lineNo;
      previousCode = stripLineCommentOutsideStringsForAudit(line).trimEnd();
      continue;
    }
    if (lineIndent(line) < bodyIndent) break;
    endLine = lineNo;
    previousCode = stripLineCommentOutsideStringsForAudit(line).trimEnd();
  }
  return {
    startLine: firstStatement.loc.start.line,
    endLine,
    headerIndent: Math.max(0, bodyIndent - 1),
  };
}

function regionAfterHeader(headerLine: number, lines: string[]): BlockRegion {
  const headerIndent = lineIndent(lines[headerLine - 1] ?? '');
  let endLine = headerLine;
  for (let lineNo = headerLine + 1; lineNo <= lines.length; lineNo += 1) {
    const line = lines[lineNo - 1] ?? '';
    if (!line.trim()) {
      endLine = lineNo;
      continue;
    }
    if (lineIndent(line) <= headerIndent) break;
    endLine = lineNo;
  }
  return { startLine: headerLine + 1, endLine, headerIndent };
}

function regionForBodyStatements(headerLine: number, body: readonly Statement[], lines: string[]): BlockRegion {
  const headerIndent = lineIndent(lines[headerLine - 1] ?? '');
  const firstStatement = body.find((statement) => statement.loc);
  if (!firstStatement?.loc) return regionAfterHeader(headerLine, lines);
  const bodyIndent = lineIndent(lines[firstStatement.loc.start.line - 1] ?? '');
  if (bodyIndent <= headerIndent) {
    return { startLine: firstStatement.loc.start.line, endLine: headerLine, headerIndent };
  }
  let endLine = firstStatement.loc.start.line;
  let previousCode = stripLineCommentOutsideStringsForAudit(lines[firstStatement.loc.start.line - 1] ?? '').trimEnd();
  for (let lineNo = firstStatement.loc.start.line + 1; lineNo <= lines.length; lineNo += 1) {
    const line = lines[lineNo - 1] ?? '';
    if (!line.trim()) {
      endLine = lineNo;
      continue;
    }
    if (isContinuationLayoutLine(line, previousCode)) {
      endLine = lineNo;
      previousCode = stripLineCommentOutsideStringsForAudit(line).trimEnd();
      continue;
    }
    if (lineIndent(line) < bodyIndent) break;
    endLine = lineNo;
    previousCode = stripLineCommentOutsideStringsForAudit(line).trimEnd();
  }
  return { startLine: firstStatement.loc.start.line, endLine, headerIndent };
}

function isContinuationLayoutLine(line: string, previousCode: string) {
  const trimmed = line.trimStart();
  return /^[,?:+\-*\/%]/.test(trimmed) || hasUnclosedDelimiterForAudit(previousCode);
}

function isDescendantOf(node: NodeLike, ancestor: NodeLike, parents: Map<NodeLike, NodeLike | undefined>) {
  let current = parents.get(node);
  while (current) {
    if (current === ancestor) return true;
    current = parents.get(current);
  }
  return false;
}

function checkIfStatement(node: IfStatement, source: string, issues: AstStructureInvariantIssue[]) {
  if (!node.loc || node.alternate) return;
  const sameIndentElse = sameIndentElseLines(source, node)[0];
  if (sameIndentElse !== undefined) {
    pushIssue(issues, 'if-lost-same-indent-else', node as unknown as NodeLike, `IfStatement source contains same-indent else on line ${sameIndentElse} but AST has no alternate`);
  }
}

function checkTupleIfInitializer(node: VariableDeclaration, source: string, issues: AstStructureInvariantIssue[]) {
  if (!node.loc || node.names.type !== 'TupleDeclarator' || node.init.type !== 'IfStatement' || node.init.alternate) return;
  const sameIndentElse = sameIndentElseLines(source, node.init)[0];
  if (sameIndentElse !== undefined) {
    pushIssue(issues, 'tuple-if-lost-same-indent-else', node as unknown as NodeLike, `Tuple initializer if source contains same-indent else on line ${sameIndentElse} but AST has no alternate`);
  }
}

function sameIndentElseLines(source: string, node: IfStatement) {
  if (!node.loc) return [];
  const lines = source.split('\n');
  const ifIndent = lineIndent(lines[node.loc.start.line - 1] ?? '');
  const result: number[] = [];
  for (let lineNo = node.loc.start.line + 1; lineNo <= node.loc.end.line; lineNo += 1) {
      const line = lines[lineNo - 1] ?? '';
    if (lineIndent(line) === ifIndent && /^\s*else\b/.test(line)) result.push(lineNo);
  }
  return result;
}

function checkSwitchExpression(node: SwitchExpression, source: string, searchableSource: string, issues: AstStructureInvariantIssue[]) {
  let previousStart = -1;
  for (const switchCase of node.cases) {
    if (!switchCase.loc) continue;
    if (switchCase.loc.start.offset < previousStart) {
      pushIssue(issues, 'switch-case-order', switchCase as unknown as NodeLike, 'Switch case order moved backward in AST');
    }
    previousStart = switchCase.loc.start.offset;
  }

  if (!node.loc) return;
  const sourceArrowCount = countDirectSwitchCaseArrows(source, searchableSource, node);
  if (sourceArrowCount !== node.cases.length) {
    pushIssue(issues, 'switch-arm-count-mismatch', node as unknown as NodeLike, `Switch source has ${sourceArrowCount} visible arms but AST has ${node.cases.length}`);
  }
}

function countDirectSwitchCaseArrows(source: string, searchableSource: string, node: SwitchExpression) {
  if (!node.loc || node.cases.length === 0) return 0;
  const lines = source.split('\n');
  const searchableLines = searchableSource.split('\n');
  const caseLines = node.cases
    .map((switchCase) => switchCase.loc?.start.line)
    .filter((line): line is number => typeof line === 'number');
  const uniqueCaseLines = new Set(caseLines);
  if (caseLines.length !== node.cases.length || uniqueCaseLines.size !== node.cases.length) {
    return node.cases.length;
  }
  if (node.cases.some((switchCase) => !switchCase.loc
    || switchCase.loc.start.line <= (node.loc?.start.line ?? 0)
    || switchCase.loc.end.line > (node.loc?.end.line ?? 0)
    || !searchableLines[switchCase.loc.start.line - 1]?.includes('=>'))) {
    return node.cases.length;
  }
  const switchIndent = lineIndent(lines[node.loc.start.line - 1] ?? '');
  const caseIndent = Math.min(...node.cases.map((switchCase) => switchCase.loc ? lineIndent(lines[switchCase.loc.start.line - 1] ?? '') : Infinity));
  if (!Number.isFinite(caseIndent) || caseIndent <= switchIndent) return node.cases.length;
  let count = 0;
  for (let lineNo = node.loc.start.line + 1; lineNo <= node.loc.end.line; lineNo += 1) {
    const line = lines[lineNo - 1] ?? '';
    if (!line.trim()) continue;
    const indent = lineIndent(line);
    if (indent <= switchIndent) break;
    if (indent === caseIndent && searchableLines[lineNo - 1]?.includes('=>')) count += 1;
  }
  return count;
}

function checkBinaryExpression(node: BinaryExpression, source: string, issues: AstStructureInvariantIssue[]) {
  if (!node.loc) return;
  const expressionText = sourceText(source, node);
  if (!isIsolatedBinarySpan(expressionText)) return;
  const rootOperator = rootBinaryOperator(expressionText);
  if (!rootOperator) return;
  if (rootOperator !== node.operator) {
    pushIssue(issues, 'operator-precedence-root-mismatch', node as unknown as NodeLike, `BinaryExpression root operator is ${node.operator}, but source root operator is ${rootOperator}`);
  }

  for (const side of ['left', 'right'] as const) {
    const child = node[side] as Expression;
    if (child.type !== 'BinaryExpression') continue;
    if (!('loc' in child) || !child.loc) continue;
    if (isParenthesizedChild(source, child.loc)) continue;
    const parentPrecedence = BINARY_PRECEDENCE.get(node.operator) ?? 0;
    const childPrecedence = BINARY_PRECEDENCE.get(child.operator) ?? 0;
    if (parentPrecedence === 0 || childPrecedence === 0) continue;
    if (childPrecedence < parentPrecedence) {
      pushIssue(issues, 'operator-precedence-root-mismatch', child as unknown as NodeLike, `Lower-precedence ${child.operator} is an unparenthesized child of ${node.operator}`);
    }
    if (side === 'right' && childPrecedence === parentPrecedence && LEFT_TO_RIGHT_OPERATORS.has(node.operator)) {
      pushIssue(issues, 'operator-precedence-root-mismatch', child as unknown as NodeLike, `Right child ${child.operator} would make ${node.operator} associate incorrectly`);
    }
  }
}

function isIsolatedBinarySpan(text: string) {
  return rootBinaryOperator(text) !== undefined
    && text.length <= 240
    && !text.includes('\n')
    && !text.includes('=>')
    && !/\b(if|switch|for|while)\b/.test(text)
    && !/[?:]/.test(text)
    && !/(^|[^=!<>])=(?!=|>)/.test(text)
    && !/,\s*\S/.test(text);
}

function rootBinaryOperator(text: string): string | undefined {
  const tokens = tokenizeForOperators(text);
  for (let precedence = 1; precedence <= 7; precedence += 1) {
    for (let index = tokens.length - 1; index >= 0; index -= 1) {
      const token = tokens[index];
      if ((BINARY_PRECEDENCE.get(token.value) ?? -1) === precedence) return token.value;
    }
  }
  return undefined;
}

interface OperatorToken {
  value: string;
  index: number;
}

function tokenizeForOperators(text: string): OperatorToken[] {
  const tokens: OperatorToken[] = [];
  let quote: '"' | "'" | '"""' | undefined;
  let lineComment = false;
  let blockComment = false;
  let depth = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    const nextTwo = text.slice(index, index + 3);

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (char === '\\') {
        index += 1;
      } else if (quote === '"""' && nextTwo === '"""') {
        quote = undefined;
        index += 2;
      } else if (quote !== '"""' && char === quote) {
        quote = undefined;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (nextTwo === '"""') {
      quote = '"""';
      index += 2;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
      continue;
    }
    if (char === ')' || char === ']' || char === '}') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth !== 0) continue;

    const rest = text.slice(index);
    const wordOperator = rest.match(/^(and|or)\b/);
    if (wordOperator && !isIdentifierCharacter(text[index - 1] ?? '')) {
      tokens.push({ value: wordOperator[1], index });
      index += wordOperator[1].length - 1;
      continue;
    }
    for (const op of ['=>', '==', '!=', '<=', '>=', '<<', '>>', '+', '-', '*', '/', '%', '<', '>', '&', '^', '|']) {
      if (rest.startsWith(op)) {
        if ((op === '+' || op === '-') && isUnarySign(text, index)) {
          break;
        }
        tokens.push({ value: op, index });
        index += op.length - 1;
        break;
      }
    }
  }

  return tokens;
}

function isIdentifierCharacter(character: string) {
  return /^[A-Za-z0-9_\p{L}\p{N}]$/u.test(character);
}

function isUnarySign(text: string, index: number) {
  let previous = index - 1;
  while (previous >= 0 && /[ \t]/.test(text[previous])) previous -= 1;
  if (previous < 0) return true;
  if ((text[previous] === 'e' || text[previous] === 'E') && /[0-9]/.test(text[previous - 1] ?? '')) return true;
  return /[([{:?,=<>+\-*\/%&|^]/.test(text[previous]);
}

function isParenthesizedChild(source: string, loc: SourceLocation) {
  let before = loc.start.offset - 1;
  while (before >= 0 && /[ \t]/.test(source[before])) before -= 1;
  let after = loc.end.offset;
  while (after < source.length && /[ \t]/.test(source[after])) after += 1;
  return source[before] === '(' && source[after] === ')';
}

function sourceText(source: string, node: { loc?: SourceLocation }) {
  if (!node.loc) return '';
  if (node.loc.start.line === node.loc.end.line) {
    const line = source.split('\n')[node.loc.start.line - 1] ?? '';
    return line.slice(node.loc.start.column - 1, node.loc.end.column - 1);
  }
  return source.slice(node.loc.start.offset, node.loc.end.offset);
}

function lineIndent(line: string) {
  const leading = line.match(/^[ \t]*/)?.[0] ?? '';
  return leading.replace(/\t/g, '    ').length;
}

function findNearestPreviousLineMatching(lines: string[], startLine: number, pattern: RegExp) {
  for (let lineNo = startLine - 1; lineNo >= 1; lineNo -= 1) {
    const line = lines[lineNo - 1] ?? '';
    if (pattern.test(line)) return lineNo;
    if (line.trim() && !line.trim().startsWith('//')) return undefined;
  }
  return undefined;
}

function maskCommentsAndStrings(source: string) {
  let result = '';
  let quote: '"' | "'" | '"""' | undefined;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    const nextTwo = source.slice(index, index + 3);

    if (lineComment) {
      if (char === '\n') {
        lineComment = false;
        result += '\n';
      } else {
        result += ' ';
      }
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        result += '  ';
        index += 1;
      } else {
        result += char === '\n' ? '\n' : ' ';
      }
      continue;
    }
    if (quote) {
      if (char === '\\') {
        result += ' ';
        if (next !== undefined) {
          result += next === '\n' ? '\n' : ' ';
          index += 1;
        }
      } else if (quote === '"""' && nextTwo === '"""') {
        quote = undefined;
        result += '   ';
        index += 2;
      } else if (quote !== '"""' && char === quote) {
        quote = undefined;
        result += ' ';
      } else {
        result += char === '\n' ? '\n' : ' ';
      }
      continue;
    }

    if (char === '/' && next === '/') {
      lineComment = true;
      result += '  ';
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      result += '  ';
      index += 1;
      continue;
    }
    if (nextTwo === '"""') {
      quote = '"""';
      result += '   ';
      index += 2;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      result += ' ';
      continue;
    }

    result += char;
  }

  return result;
}

function normalizeLeadingTabsForAudit(source: string): string {
  return source.replace(/^(\t+)/gm, (tabs) => '    '.repeat(tabs.length));
}

function normalizeIndentForAudit(source: string): string {
  const lines = source.split('\n');
  const continuationLines = continuationLineIndexesForAudit(lines);
  let minIndent = Infinity;
  const indentLevels = new Set<number>();
  for (const [index, line] of lines.entries()) {
    if (continuationLines.has(index)) continue;
    if (line.trim().length === 0) continue;
    const leading = line.match(/^ +/);
    if (!leading) continue;
    const indent = leading[0].length;
    indentLevels.add(indent);
    if (indent < minIndent) minIndent = indent;
  }
  if (minIndent === Infinity || minIndent !== 3) return source;
  if ([...indentLevels].some((indent) => indent % minIndent !== 0)) return source;
  if (!hasSmallIndentBlockBodyLineForAudit(lines, continuationLines, minIndent)) return source;
  return lines
    .map((line, index) => {
      if (continuationLines.has(index)) return line;
      const leading = line.match(/^ +/);
      if (!leading) return line;
      const spaces = leading[0].length;
      return ' '.repeat((spaces / minIndent) * 4) + line.slice(spaces);
    })
    .join('\n');
}

function hasSmallIndentBlockBodyLineForAudit(lines: readonly string[], continuationLines: ReadonlySet<number>, minIndent: number): boolean {
  let previousCode = '';
  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('//')) continue;
    const leading = line.match(/^ +/)?.[0].length ?? 0;
    if (leading === minIndent && !continuationLines.has(index) && opensIndentedBlockForAudit(previousCode)) return true;
    previousCode = stripLineCommentOutsideStringsForAudit(line).trimEnd();
  }
  return false;
}

function opensIndentedBlockForAudit(code: string): boolean {
  return /=>\s*$/.test(code) || /^(?:if|else if|else|for|while|switch)\b/.test(code.trim());
}

function continuationLineIndexesForAudit(lines: readonly string[]): Set<number> {
  const indexes = new Set<number>();
  let previousCode = '';
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('//')) continue;
    const leading = line.match(/^ +/)?.[0].length ?? 0;
    if (leading > 0 && previousCode && isLikelyContinuationForAudit(previousCode, trimmed)) indexes.add(index);
    previousCode = stripLineCommentOutsideStringsForAudit(line).trimEnd();
  }
  return indexes;
}

function isLikelyContinuationForAudit(previousCode: string, currentTrimmed: string): boolean {
  if (/^[,?:+\-*\/%]/.test(currentTrimmed)) return true;
  if (/^(else\s+)?if$/.test(previousCode.trimEnd())) return true;
  if (/(^|[^=!<>])=$/.test(previousCode.trimEnd())) return true;
  if (/[,(?:+\-*\/%]$/.test(previousCode.trimEnd())) return true;
  return hasUnclosedDelimiterForAudit(previousCode);
}

function hasUnclosedDelimiterForAudit(code: string): boolean {
  let parens = 0;
  let brackets = 0;
  let inDouble = false;
  let inSingle = false;
  let escaped = false;
  for (const character of code) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\' && (inDouble || inSingle)) {
      escaped = true;
      continue;
    }
    if (character === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (character === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (inDouble || inSingle) continue;
    if (character === '(') parens += 1;
    if (character === ')' && parens > 0) parens -= 1;
    if (character === '[') brackets += 1;
    if (character === ']' && brackets > 0) brackets -= 1;
  }
  return parens > 0 || brackets > 0;
}

function stripLineCommentOutsideStringsForAudit(line: string): string {
  let inDouble = false;
  let inSingle = false;
  let escaped = false;
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    const next = line[index + 1];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\' && (inDouble || inSingle)) {
      escaped = true;
      continue;
    }
    if (character === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (character === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (!inDouble && !inSingle && character === '/' && next === '/') return line.slice(0, index);
  }
  return line;
}

function within(inner: SourceLocation, outer: SourceLocation) {
  return inner.start.offset >= outer.start.offset && inner.end.offset <= outer.end.offset;
}

function pushIssue(
  issues: AstStructureInvariantIssue[],
  code: AstStructureInvariantCode,
  node: NodeLike,
  message: string,
) {
  issues.push({
    code,
    message,
    line: node.loc?.start.line ?? 1,
    column: node.loc?.start.column ?? 1,
    nodeType: node.type,
  });
}

function dedupeIssues(issues: AstStructureInvariantIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.line}:${issue.column}:${issue.nodeType}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
