#!/usr/bin/env tsx

import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

import { PINE_V6_GRAMMAR_CONSTRUCTS } from '../src/compat/pineV6GrammarReference.ts';
import { parse } from '../src/parser/parser.ts';
import v5Manifest from '../reports/external-pine-corpus-v5.manifest.json' with { type: 'json' };
import v6Manifest from '../reports/external-pine-corpus-v6.manifest.json' with { type: 'json' };
import v7Manifest from '../reports/external-pine-corpus-v7.manifest.json' with { type: 'json' };
import recoveryManifest from '../reports/external-pine-corpus-v7-size-recovery.manifest.json' with { type: 'json' };

interface ManifestScript {
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
}

interface CorpusHit {
  corpus: string;
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
}

interface ConstructStats {
  id: string;
  category: string;
  name: string;
  basis: 'ast' | 'source' | 'ast+source';
  corpusScripts: Set<string>;
  corpusHits: number;
  sampleCorpusHits: CorpusHit[];
  grammarSnippetIds: Set<string>;
  grammarHits: number;
}

interface ConstructSpec {
  id: string;
  category: string;
  name: string;
  basis: 'ast' | 'source' | 'ast+source';
  ast?: (node: any, context: AstContext) => boolean;
  source?: (source: string, stripped: string) => number;
}

interface AstContext {
  functionNames: Set<string>;
  typeNames: Set<string>;
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const v5Corpus = join(packageRoot, '.cache/tealscript/pine-corpus-v5-20260910');
const v6Corpus = join(packageRoot, '.cache/tealscript/pine-corpus-v6-20260911');
const v7Corpus = join(packageRoot, '.cache/tealscript/pine-corpus-v7-20260911');
const recoveryCorpus = join(packageRoot, '.cache/tealscript/pine-corpus-v7-size-recovery-20260911');
const outJson = join(packageRoot, 'reports/pine-corpus-construct-depth-v1.json');
const outMd = join(packageRoot, 'reports/pine-corpus-construct-depth-v1.md');
const expectedCorpusScripts: Record<string, number> = { v5: 1000, v6: 1000, v7: 456, 'v7-size-recovery': 50 };

const namespaceReceivers = new Set([
  'array',
  'barmerge',
  'box',
  'chart',
  'color',
  'currency',
  'dayofweek',
  'display',
  'extend',
  'fill',
  'font',
  'format',
  'hline',
  'input',
  'label',
  'line',
  'linefill',
  'location',
  'map',
  'math',
  'matrix',
  'order',
  'plot',
  'position',
  'request',
  'scale',
  'session',
  'shape',
  'size',
  'str',
  'strategy',
  'syminfo',
  'ta',
  'table',
  'text',
  'timeframe',
  'ticker',
  'xloc',
  'yloc',
]);

const collectionMethodNames = new Set([
  'abs',
  'avg',
  'binary_search',
  'binary_search_leftmost',
  'binary_search_rightmost',
  'clear',
  'concat',
  'copy',
  'covariance',
  'every',
  'fill',
  'first',
  'from',
  'get',
  'includes',
  'indexof',
  'insert',
  'inv',
  'is_antidiagonal',
  'is_antisymmetric',
  'is_binary',
  'is_diagonal',
  'is_identity',
  'is_square',
  'is_stochastic',
  'is_symmetric',
  'is_triangular',
  'join',
  'keys',
  'kron',
  'last',
  'lastindexof',
  'max',
  'median',
  'min',
  'mode',
  'mult',
  'new',
  'percentrank',
  'pop',
  'pow',
  'push',
  'put',
  'range',
  'rank',
  'remove',
  'reverse',
  'row',
  'rows',
  'set',
  'shift',
  'size',
  'slice',
  'sort',
  'sort_indices',
  'stdev',
  'sum',
  'swap',
  'trace',
  'transpose',
  'unshift',
  'values',
  'variance',
]);

const drawingMethodNames = new Set([
  'copy',
  'delete',
  'get_bottom',
  'get_left',
  'get_price',
  'get_right',
  'get_text',
  'get_top',
  'get_x',
  'get_x1',
  'get_x2',
  'get_y',
  'get_y1',
  'get_y2',
  'set_bgcolor',
  'set_border_color',
  'set_border_style',
  'set_border_width',
  'set_bottom',
  'set_bottom_right_point',
  'set_color',
  'set_extend',
  'set_first_point',
  'set_left',
  'set_lefttop',
  'set_line_style',
  'set_line_width',
  'set_point',
  'set_second_point',
  'set_style',
  'set_text',
  'set_text_color',
  'set_text_font_family',
  'set_text_halign',
  'set_text_size',
  'set_text_valign',
  'set_textalign',
  'set_top',
  'set_top_left_point',
  'set_top_right_point',
  'set_width',
  'set_x',
  'set_x1',
  'set_x2',
  'set_xloc',
  'set_xy',
  'set_y',
  'set_y1',
  'set_y2',
  'set_yloc',
]);

function currentCommit(): string {
  return execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], { encoding: 'utf8' }).trim();
}

function stripPineLiteralsAndComments(source: string): string {
  return source
    .replace(/\/\/[^\n\r]*/g, '')
    .replace(/"""[\s\S]*?"""/g, '""""""')
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

function matches(pattern: RegExp, source: string): number {
  return source.match(pattern)?.length ?? 0;
}

function calleeName(callee: any): string | null {
  if (!callee) return null;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression') {
    const object = calleeName(callee.object);
    const property = calleeName(callee.property);
    return object && property ? `${object}.${property}` : null;
  }
  return null;
}

function memberRoot(node: any): string | null {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') return memberRoot(node.object);
  return null;
}

function memberProperty(node: any): string | null {
  if (!node || node.type !== 'MemberExpression') return null;
  return node.property?.name ?? null;
}

function visit(node: any, fn: (node: any) => void): void {
  if (!node || typeof node !== 'object') return;
  fn(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) visit(child, fn);
    } else if (value && typeof value === 'object') {
      visit(value, fn);
    }
  }
}

function countDirectRecursiveCalls(ast: any): number {
  let count = 0;
  const walk = (node: any, functionStack: string[]): void => {
    if (!node || typeof node !== 'object') return;

    let nextStack = functionStack;
    if (node.type === 'FunctionDeclaration' && node.name?.name) {
      nextStack = [...functionStack, node.name.name];
    } else if (
      node.type === 'CallExpression'
      && node.callee?.type === 'Identifier'
      && functionStack[functionStack.length - 1] === node.callee.name
    ) {
      count += 1;
    }

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) walk(child, nextStack);
      } else if (value && typeof value === 'object') {
        walk(value, nextStack);
      }
    }
  };
  walk(ast, []);
  return count;
}

function contextForProgram(ast: any): AstContext {
  const functionNames = new Set<string>();
  const typeNames = new Set<string>();
  visit(ast, (node) => {
    if (node.type === 'FunctionDeclaration') functionNames.add(node.name?.name);
    if (node.type === 'TypeDeclaration') typeNames.add(node.name?.name);
  });
  return { functionNames, typeNames };
}

function hasStatementBody(node: any): boolean {
  return Array.isArray(node.body);
}

function isReceiverMethodCall(node: any): boolean {
  if (node.type !== 'CallExpression' || node.callee?.type !== 'MemberExpression') return false;
  const root = memberRoot(node.callee.object);
  return root === null || !namespaceReceivers.has(root);
}

function isNamespaceCall(node: any, namespace: string): boolean {
  if (node.type !== 'CallExpression' || node.callee?.type !== 'MemberExpression') return false;
  return memberRoot(node.callee.object) === namespace;
}

function assignmentOperator(operator: string): (node: any) => boolean {
  return (node) => node.type === 'AssignmentStatement' && node.operator === operator;
}

const specs: readonly ConstructSpec[] = [
  { id: 'declarations.indicator', category: 'declarations', name: 'indicator/study declaration', basis: 'ast', ast: (node) => node.type === 'IndicatorDeclaration' && node.declarationKind === 'indicator' },
  { id: 'declarations.strategy', category: 'declarations', name: 'strategy declaration', basis: 'ast', ast: (node) => node.type === 'IndicatorDeclaration' && node.declarationKind === 'strategy' },
  { id: 'declarations.library', category: 'declarations', name: 'library declaration', basis: 'ast', ast: (node) => node.type === 'LibraryDeclaration' },
  { id: 'imports.declaration', category: 'imports', name: 'import declaration', basis: 'ast', ast: (node) => node.type === 'ImportDeclaration' },
  { id: 'imports.explicit-alias', category: 'imports', name: 'import with explicit alias', basis: 'source', source: (_source, stripped) => matches(/^\s*import\s+[A-Za-z0-9_]+\/[A-Za-z0-9_]+\/\d+\s+as\s+[A-Za-z_][A-Za-z0-9_]*/gm, stripped) },
  { id: 'imports.implicit-alias', category: 'imports', name: 'import with implicit alias', basis: 'source', source: (_source, stripped) => matches(/^\s*import\s+[A-Za-z0-9_]+\/[A-Za-z0-9_]+\/\d+\s*$/gm, stripped) },
  { id: 'variables.untyped-declaration', category: 'variables', name: 'untyped variable declaration', basis: 'ast', ast: (node) => node.type === 'VariableDeclaration' && !node.typeAnnotation },
  { id: 'variables.typed-declaration', category: 'variables', name: 'typed variable declaration', basis: 'ast', ast: (node) => node.type === 'VariableDeclaration' && Boolean(node.typeAnnotation) },
  { id: 'variables.var', category: 'variables', name: 'var declaration mode', basis: 'ast', ast: (node) => node.type === 'VariableDeclaration' && node.kind === 'var' },
  { id: 'variables.varip', category: 'variables', name: 'varip declaration mode', basis: 'ast', ast: (node) => node.type === 'VariableDeclaration' && node.kind === 'varip' },
  { id: 'variables.reassignment', category: 'variables', name: 'reassignment operator :=', basis: 'ast', ast: assignmentOperator(':=') },
  { id: 'variables.assignment-plus', category: 'variables', name: 'compound assignment +=', basis: 'ast', ast: assignmentOperator('+=') },
  { id: 'variables.assignment-minus', category: 'variables', name: 'compound assignment -=', basis: 'ast', ast: assignmentOperator('-=') },
  { id: 'variables.assignment-multiply', category: 'variables', name: 'compound assignment *=', basis: 'ast', ast: assignmentOperator('*=') },
  { id: 'variables.assignment-divide', category: 'variables', name: 'compound assignment /=', basis: 'ast', ast: assignmentOperator('/=') },
  { id: 'variables.assignment-modulo', category: 'variables', name: 'compound assignment %=', basis: 'ast', ast: assignmentOperator('%=') },
  { id: 'variables.multi-declaration', category: 'variables', name: 'comma-separated declarations', basis: 'source', source: (_source, stripped) => matches(/^\s*(?:varip\s+|var\s+)?(?:const\s+|input\s+|simple\s+|series\s+)?(?:int|float|bool|string|color|array|matrix|map|[A-Z][A-Za-z0-9_]*)?\s*[A-Za-z_][A-Za-z0-9_]*\s*=.*,\s*(?:varip\s+|var\s+)?(?:const\s+|input\s+|simple\s+|series\s+)?(?:int|float|bool|string|color|array|matrix|map|[A-Z][A-Za-z0-9_]*)?\s*[A-Za-z_][A-Za-z0-9_]*\s*=/gm, stripped) },
  { id: 'types.primitive-annotation', category: 'types', name: 'primitive type annotation', basis: 'ast', ast: (node) => node.type === 'TypeAnnotation' && ['int', 'float', 'bool', 'string', 'color'].includes(node.baseType) },
  { id: 'types.qualifier-annotation', category: 'types', name: 'const/input/simple/series qualifier', basis: 'ast', ast: (node) => node.type === 'TypeAnnotation' && Boolean(node.qualifier) },
  { id: 'types.na-typed-initializer', category: 'types', name: 'typed na initializer', basis: 'ast', ast: (node) => node.type === 'VariableDeclaration' && Boolean(node.typeAnnotation) && node.init?.type === 'NaExpression' },
  { id: 'types.array-template', category: 'types', name: 'array<T> type annotation', basis: 'source', source: (_source, stripped) => matches(/\barray\s*<[^>\n\r]+>/g, stripped) },
  { id: 'types.array-shorthand', category: 'types', name: 'T[] array shorthand annotation', basis: 'ast', ast: (node) => node.type === 'TypeAnnotation' && node.baseType === 'array' && Boolean(node.isArray) },
  { id: 'types.matrix-template', category: 'types', name: 'matrix<T> type annotation', basis: 'source', source: (_source, stripped) => matches(/\bmatrix\s*<[^>\n\r]+>/g, stripped) },
  { id: 'types.map-template', category: 'types', name: 'map<K,V> type annotation', basis: 'source', source: (_source, stripped) => matches(/\bmap\s*<[^>\n\r]+>/g, stripped) },
  { id: 'types.udt-annotation', category: 'types', name: 'UDT type annotation', basis: 'ast', ast: (node) => node.type === 'TypeAnnotation' && node.baseType === 'udt' },
  { id: 'types.nested-udt-field', category: 'types', name: 'UDT field typed as another UDT', basis: 'ast', ast: (node, context) => node.type === 'TypeFieldDeclaration' && node.typeAnnotation?.baseType === 'udt' && context.typeNames.has(node.typeAnnotation.name) },
  { id: 'types.udt-collection-field', category: 'types', name: 'UDT field containing array/matrix/map', basis: 'ast', ast: (node) => node.type === 'TypeFieldDeclaration' && ['array', 'matrix', 'map'].includes(node.typeAnnotation?.baseType) },
  { id: 'operators.arithmetic', category: 'operators', name: 'arithmetic binary operator', basis: 'ast', ast: (node) => node.type === 'BinaryExpression' && ['+', '-', '*', '/', '%'].includes(node.operator) },
  { id: 'operators.comparison', category: 'operators', name: 'comparison operator', basis: 'ast', ast: (node) => node.type === 'BinaryExpression' && ['==', '!=', '<', '>', '<=', '>='].includes(node.operator) },
  { id: 'operators.logical', category: 'operators', name: 'logical operator', basis: 'ast', ast: (node) => (node.type === 'BinaryExpression' && ['and', 'or'].includes(node.operator)) || (node.type === 'UnaryExpression' && node.operator === 'not') },
  { id: 'operators.bitwise', category: 'operators', name: 'bitwise operator', basis: 'ast', ast: (node) => node.type === 'BinaryExpression' && ['&', '|', '^', '<<', '>>'].includes(node.operator) },
  { id: 'operators.conditional', category: 'operators', name: 'ternary conditional operator', basis: 'ast', ast: (node) => node.type === 'ConditionalExpression' },
  { id: 'operators.history-reference', category: 'operators', name: 'history/index operator []', basis: 'ast', ast: (node) => node.type === 'IndexExpression' },
  { id: 'operators.member-access', category: 'operators', name: 'member access operator', basis: 'ast', ast: (node) => node.type === 'MemberExpression' },
  { id: 'operators.receiver-method-call', category: 'operators', name: 'receiver method call syntax', basis: 'ast', ast: (node) => isReceiverMethodCall(node) },
  { id: 'operators.collection-receiver-method-call', category: 'operators', name: 'collection receiver method call', basis: 'ast', ast: (node) => isReceiverMethodCall(node) && collectionMethodNames.has(memberProperty(node.callee) ?? '') },
  { id: 'operators.drawing-receiver-method-call', category: 'operators', name: 'drawing receiver method call', basis: 'ast', ast: (node) => isReceiverMethodCall(node) && drawingMethodNames.has(memberProperty(node.callee) ?? '') },
  { id: 'operators.collection-namespace-call', category: 'operators', name: 'array/map/matrix namespace call', basis: 'ast', ast: (node) => ['array', 'map', 'matrix'].some((namespace) => isNamespaceCall(node, namespace)) },
  { id: 'conditionals.if-statement', category: 'conditionals', name: 'if statement', basis: 'ast', ast: (node) => node.type === 'IfStatement' },
  { id: 'conditionals.else-if', category: 'conditionals', name: 'else-if chain', basis: 'ast', ast: (node) => node.type === 'IfStatement' && node.alternate?.type === 'IfStatement' },
  { id: 'conditionals.if-expression', category: 'conditionals', name: 'if expression initializer/RHS', basis: 'source', source: (_source, stripped) => matches(/=\s*if\s+[^\n\r]+/g, stripped) + matches(/:=\s*if\s+[^\n\r]+/g, stripped) },
  { id: 'conditionals.switch-discriminant', category: 'conditionals', name: 'switch with discriminant', basis: 'ast', ast: (node) => node.type === 'SwitchExpression' && Boolean(node.discriminant) },
  { id: 'conditionals.switch-condition-form', category: 'conditionals', name: 'switch without discriminant', basis: 'ast', ast: (node) => node.type === 'SwitchExpression' && !node.discriminant },
  { id: 'conditionals.once', category: 'conditionals', name: 'once block', basis: 'ast', ast: (node) => node.type === 'OnceStatement' },
  { id: 'loops.for-to', category: 'loops', name: 'numeric for loop', basis: 'ast', ast: (node) => node.type === 'ForStatement' && node.kind === 'numeric' && !node.step },
  { id: 'loops.for-to-by', category: 'loops', name: 'numeric for loop with by step', basis: 'ast', ast: (node) => node.type === 'ForStatement' && node.kind === 'numeric' && Boolean(node.step) },
  { id: 'loops.for-in-value', category: 'loops', name: 'for...in value loop', basis: 'ast', ast: (node) => node.type === 'ForStatement' && node.kind === 'collection' && !node.indexCounter },
  { id: 'loops.for-in-index-value', category: 'loops', name: 'for...in index/value loop', basis: 'ast', ast: (node) => node.type === 'ForStatement' && node.kind === 'collection' && Boolean(node.indexCounter) },
  { id: 'loops.while', category: 'loops', name: 'while loop', basis: 'ast', ast: (node) => node.type === 'WhileStatement' },
  { id: 'loops.break', category: 'loops', name: 'break statement', basis: 'ast', ast: (node) => node.type === 'BreakStatement' },
  { id: 'loops.continue', category: 'loops', name: 'continue statement', basis: 'ast', ast: (node) => node.type === 'ContinueStatement' },
  { id: 'functions.expression-body', category: 'functions-methods', name: 'function with expression body', basis: 'ast', ast: (node) => node.type === 'FunctionDeclaration' && !hasStatementBody(node) },
  { id: 'functions.block-body', category: 'functions-methods', name: 'function with block body', basis: 'ast', ast: (node) => node.type === 'FunctionDeclaration' && hasStatementBody(node) },
  { id: 'functions.exported', category: 'functions-methods', name: 'exported function/method', basis: 'ast', ast: (node) => node.type === 'FunctionDeclaration' && Boolean(node.exported) },
  { id: 'functions.default-parameter', category: 'functions-methods', name: 'function parameter default', basis: 'ast', ast: (node) => node.type === 'FunctionDeclaration' && node.params?.some((param: any) => Boolean(param.defaultValue)) },
  { id: 'functions.recursive-call', category: 'functions-methods', name: 'direct recursive UDF call', basis: 'ast' },
  { id: 'methods.declaration', category: 'functions-methods', name: 'method declaration', basis: 'ast', ast: (node) => node.type === 'FunctionDeclaration' && Boolean(node.isMethod) && !node.overloaded },
  { id: 'methods.overload', category: 'functions-methods', name: 'overload method/function declaration', basis: 'ast', ast: (node) => node.type === 'FunctionDeclaration' && Boolean(node.overloaded) },
  { id: 'objects.udt-declaration', category: 'types', name: 'UDT declaration', basis: 'ast', ast: (node) => node.type === 'TypeDeclaration' },
  { id: 'objects.field-default', category: 'types', name: 'UDT field default', basis: 'ast', ast: (node) => node.type === 'TypeFieldDeclaration' && Boolean(node.defaultValue) },
  { id: 'objects.field-assignment', category: 'types', name: 'UDT field assignment', basis: 'ast', ast: (node) => node.type === 'AssignmentStatement' && node.left?.type === 'MemberExpression' },
  { id: 'objects.exported-udt', category: 'types', name: 'exported UDT declaration', basis: 'ast', ast: (node) => node.type === 'TypeDeclaration' && Boolean(node.exported) },
  { id: 'enums.declaration', category: 'enums', name: 'enum declaration', basis: 'ast', ast: (node) => node.type === 'EnumDeclaration' },
  { id: 'enums.title', category: 'enums', name: 'enum value title', basis: 'ast', ast: (node) => node.type === 'EnumFieldDeclaration' && Boolean(node.title) },
  { id: 'enums.exported', category: 'enums', name: 'exported enum declaration', basis: 'ast', ast: (node) => node.type === 'EnumDeclaration' && Boolean(node.exported) },
  { id: 'tuples.declaration', category: 'tuples', name: 'tuple declaration', basis: 'ast', ast: (node) => node.type === 'VariableDeclaration' && node.names?.type === 'TupleDeclarator' },
  { id: 'tuples.discard-underscore', category: 'tuples', name: 'tuple underscore discard', basis: 'ast', ast: (node) => (node.names?.names ?? node.names ?? []).some?.((identifier: any) => identifier.name === '_') },
  { id: 'tuples.reassignment', category: 'tuples', name: 'tuple reassignment', basis: 'ast', ast: (node) => node.type === 'TupleAssignment' },
  { id: 'arrays.array-literal', category: 'arrays-matrices-maps', name: 'array literal expression', basis: 'ast', ast: (node) => node.type === 'ArrayExpression' },
  { id: 'arrays.generic-new-call', category: 'arrays-matrices-maps', name: 'generic collection constructor call', basis: 'source', source: (_source, stripped) => matches(/\b(?:array|matrix|map)\s*\.\s*new\s*<[^>\n\r]+>\s*\(/g, stripped) },
  { id: 'formatting.call-continuation', category: 'formatting', name: 'multi-line call continuation', basis: 'source', source: (_source, stripped) => matches(/\b[A-Za-z_][A-Za-z0-9_.]*\s*\(\s*[\r\n]/g, stripped) },
  { id: 'formatting.expression-continuation', category: 'formatting', name: 'multi-line expression continuation', basis: 'source', source: (_source, stripped) => matches(/[+\-*\/%]\s*[\r\n]\s+[A-Za-z_(0-9]/g, stripped) },
  { id: 'formatting.method-chain-continuation', category: 'formatting', name: 'multi-line method-chain continuation', basis: 'source', source: (_source, stripped) => matches(/[\r\n]\s*\.\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/g, stripped) },
  { id: 'formatting.inline-comment', category: 'formatting', name: 'line comment', basis: 'source', source: (source) => matches(/\/\/[^\n\r]*/g, source) },
  { id: 'formatting.doc-annotations', category: 'formatting', name: 'Pine doc annotation comments', basis: 'source', source: (source) => matches(/^\s*\/\/@(description|function|param|returns|type|field|enum|variable|strategy_alert_message)\b/gm, source) },
  { id: 'formatting.triple-quoted-string', category: 'formatting', name: 'triple-quoted string literal', basis: 'source', source: (source) => matches(/"""[\s\S]*?"""/g, source) },
];

function emptyStats(spec: ConstructSpec): ConstructStats {
  return {
    id: spec.id,
    category: spec.category,
    name: spec.name,
    basis: spec.basis,
    corpusScripts: new Set(),
    corpusHits: 0,
    sampleCorpusHits: [],
    grammarSnippetIds: new Set(),
    grammarHits: 0,
  };
}

function recordCorpusHit(stats: ConstructStats, scriptKey: string, hit: CorpusHit, count: number): void {
  if (count <= 0) return;
  stats.corpusScripts.add(scriptKey);
  stats.corpusHits += count;
  if (stats.sampleCorpusHits.length < 5) stats.sampleCorpusHits.push(hit);
}

function detectConstructs(source: string, ast: any | null): Map<string, number> {
  const counts = new Map<string, number>();
  const stripped = stripPineLiteralsAndComments(source);
  for (const spec of specs) {
    const sourceHits = spec.source ? spec.source(source, stripped) : 0;
    if (sourceHits > 0) counts.set(spec.id, sourceHits);
  }

  if (ast) {
    const context = contextForProgram(ast);
    const astSpecs = specs.filter((spec) => spec.ast);
    visit(ast, (node) => {
      for (const spec of astSpecs) {
        if (spec.ast!(node, context)) counts.set(spec.id, (counts.get(spec.id) ?? 0) + 1);
      }
    });
    const recursiveCalls = countDirectRecursiveCalls(ast);
    if (recursiveCalls > 0) counts.set('functions.recursive-call', recursiveCalls);
  }

  return counts;
}

async function scanCorpus(
  corpus: string,
  corpusRoot: string,
  scripts: readonly ManifestScript[],
  stats: Map<string, ConstructStats>,
): Promise<{ corpus: string; scripts: number; parsed: number; parseFailed: number }> {
  const expected = expectedCorpusScripts[corpus];
  if (scripts.length !== expected) {
    throw new Error(`${corpus} expected ${expected} manifest rows, got ${scripts.length}`);
  }
  let parsed = 0;
  let parseFailed = 0;
  for (const script of scripts) {
    const source = await readFile(join(corpusRoot, script.localPath), 'utf8');
    const scriptKey = `${corpus}:${script.localPath}`;
    const hit = {
      corpus,
      localPath: script.localPath,
      sourceRepoUrl: script.sourceRepoUrl,
      sourceFilePath: script.sourceFilePath,
      commitSha: script.commitSha,
    };

    let ast: any | null = null;
    try {
      ast = parse(source);
      parsed += 1;
    } catch {
      parseFailed += 1;
    }

    for (const [id, count] of detectConstructs(source, ast)) {
      recordCorpusHit(stats.get(id)!, scriptKey, hit, count);
    }
  }
  return { corpus, scripts: scripts.length, parsed, parseFailed };
}

function scanGrammarSnippets(stats: Map<string, ConstructStats>): void {
  for (const construct of PINE_V6_GRAMMAR_CONSTRUCTS) {
    let ast: any | null = null;
    try {
      ast = parse(construct.snippet);
    } catch {
      ast = null;
    }
    for (const [id, hits] of detectConstructs(construct.snippet, ast)) {
      if (hits <= 0) continue;
      const row = stats.get(id)!;
      row.grammarSnippetIds.add(construct.id);
      row.grammarHits += hits;
    }
  }
}

function countBy<T>(values: readonly T[], key: (value: T) => string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function table(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

async function main(): Promise<void> {
  const stats = new Map(specs.map((spec) => [spec.id, emptyStats(spec)]));
  scanGrammarSnippets(stats);

  const corpusStats = [
    await scanCorpus('v5', v5Corpus, (v5Manifest as any).scripts, stats),
    await scanCorpus('v6', v6Corpus, (v6Manifest as any).scripts, stats),
    await scanCorpus('v7', v7Corpus, (v7Manifest as any).scripts, stats),
    await scanCorpus('v7-size-recovery', recoveryCorpus, (recoveryManifest as any).scripts, stats),
  ];

  const rows = [...stats.values()].map((row) => {
    const corpusScriptCount = row.corpusScripts.size;
    const grammarSnippetCount = row.grammarSnippetIds.size;
    const thinGrammar = corpusScriptCount > 0 && grammarSnippetCount <= 1;
    const highUseThinGrammar = corpusScriptCount >= 100 && grammarSnippetCount <= 1;
    const depthGapScore = Number((corpusScriptCount / Math.max(1, grammarSnippetCount) + row.corpusHits / Math.max(1, row.grammarHits || grammarSnippetCount)).toFixed(2));
    return {
      id: row.id,
      category: row.category,
      name: row.name,
      basis: row.basis,
      corpusScriptCount,
      corpusHitCount: row.corpusHits,
      grammarSnippetCount,
      grammarHitCount: row.grammarHits,
      thinGrammar,
      highUseThinGrammar,
      depthGapScore,
      sampleGrammarSnippets: [...row.grammarSnippetIds].sort().slice(0, 8),
      sampleCorpusHits: row.sampleCorpusHits,
    };
  }).sort((left, right) =>
    Number(right.highUseThinGrammar) - Number(left.highUseThinGrammar)
    || right.depthGapScore - left.depthGapScore
    || right.corpusScriptCount - left.corpusScriptCount
    || left.id.localeCompare(right.id),
  );

  const exposedRows = rows.filter((row) => row.corpusScriptCount > 0);
  const highUseRows = exposedRows.filter((row) => row.corpusScriptCount >= 100);
  const highUseThinRows = rows.filter((row) => row.highUseThinGrammar);
  const unbackedRows = exposedRows.filter((row) => row.grammarSnippetCount === 0);
  const unreachedRows = rows.filter((row) => row.corpusScriptCount === 0);

  const json = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommit: currentCommit(),
    basis: {
      grammarInventory: 'PINE_V6_GRAMMAR_CONSTRUCTS from src/compat/pineV6GrammarReference.ts',
      committedGrammarSnippets: PINE_V6_GRAMMAR_CONSTRUCTS.length,
      corpusScripts: corpusStats.reduce((sum, row) => sum + row.scripts, 0),
      parsedScripts: corpusStats.reduce((sum, row) => sum + row.parsed, 0),
      parseFailedScripts: corpusStats.reduce((sum, row) => sum + row.parseFailed, 0),
      method: 'Each construct row is detected against all v5, v6, v7, and v7 size-recovered pinned sources. AST-backed rows are counted only when the local parser produces an AST; source-backed formatting/import rows also count in parse-failed files. Grammar depth is the number of committed grammar coverage snippets that trigger the same detector.',
      caveats: [
        'This measures language-form exposure, not semantic/value correctness.',
        'The taxonomy includes manual-inventory rows plus authoring-pattern refinements that the manual snippets collapse together, such as collection receiver calls versus namespace calls.',
        'Recursive-call detection is syntactic and direct only: it counts a UDF body calling the same name, not mutual recursion or runtime recursion depth.',
        'Formatting rows are source-pattern detections and can include benign false positives; they are kept separate with basis=source.',
      ],
    },
    headline: {
      constructRows: rows.length,
      corpusExercisedConstructRows: exposedRows.length,
      highUseConstructRowsAt100Scripts: highUseRows.length,
      highUseThinGrammarRowsAt100Scripts: highUseThinRows.length,
      corpusExercisedButNoGrammarSnippetRows: unbackedRows.length,
      corpusUnreachedRows: unreachedRows.length,
      conclusion: highUseThinRows.length > 0
        ? 'Construct coverage has the same shape as member coverage: broad manual-snippet coverage, but several high-use authoring constructs are backed by only one grammar snippet or none in this detector taxonomy.'
        : 'The heavily used corpus constructs are also backed by multiple grammar snippets; construct depth is healthier than member depth.',
    },
    byCategory: {
      exercised: countBy(exposedRows, (row) => row.category),
      highUseThin: countBy(highUseThinRows, (row) => row.category),
      unbacked: countBy(unbackedRows, (row) => row.category),
    },
    corpusStats,
    rows,
    highUseThinRows,
    unbackedRows,
    unreachedRows,
  };

  const topRows = rows.slice(0, 80).map((row) => [
    row.id,
    row.category,
    String(row.corpusScriptCount),
    String(row.corpusHitCount),
    String(row.grammarSnippetCount),
    String(row.grammarHitCount),
    String(row.depthGapScore),
    row.sampleGrammarSnippets.slice(0, 4).join('<br>'),
  ]);
  const highUseThinTable = highUseThinRows.map((row) => [
    row.id,
    row.name,
    row.category,
    String(row.corpusScriptCount),
    String(row.corpusHitCount),
    String(row.grammarSnippetCount),
    row.basis,
    row.sampleCorpusHits.slice(0, 3).map((hit) => `${hit.corpus}:${hit.localPath}`).join('<br>'),
  ]);

  const md = [
    '# Pine Corpus Construct Depth V1',
    '',
    `Generated at ${json.generatedAt}. Measured at commit \`${json.measuredCommit}\`.`,
    '',
    '## Headline',
    '',
    `Across ${json.basis.corpusScripts} pinned corpus scripts, ${json.headline.corpusExercisedConstructRows}/${json.headline.constructRows} construct rows are exercised by at least one script.`,
    '',
    `${json.headline.highUseThinGrammarRowsAt100Scripts} construct rows are high-use (>=100 corpus scripts) while being backed by one committed grammar snippet or none in this detector taxonomy.`,
    '',
    `${json.headline.corpusExercisedButNoGrammarSnippetRows} exercised construct rows have no committed grammar snippet match here; these are mostly authoring-pattern refinements outside the 63-snippet manual inventory, not necessarily missing parser tests.`,
    '',
    json.headline.conclusion,
    '',
    '## Basis',
    '',
    `- Grammar inventory: \`${json.basis.grammarInventory}\` (${json.basis.committedGrammarSnippets} committed snippets).`,
    `- Corpus scripts scanned: ${json.basis.corpusScripts}; parsed for AST-backed construct depth: ${json.basis.parsedScripts}; parse failures: ${json.basis.parseFailedScripts}.`,
    `- Method: ${json.basis.method}`,
    ...json.basis.caveats.map((caveat) => `- Caveat: ${caveat}`),
    '',
    '## High-Use Thin Construct Rows',
    '',
    table(['Construct', 'Name', 'Category', 'Corpus scripts', 'Corpus hits', 'Grammar snippets', 'Basis', 'Samples'], highUseThinTable),
    '',
    '## Ranked Construct Depth Gaps',
    '',
    table(['Construct', 'Category', 'Corpus scripts', 'Corpus hits', 'Grammar snippets', 'Grammar hits', 'Gap score', 'Grammar samples'], topRows),
    '',
    '## Category Summary',
    '',
    table(
      ['Category', 'Exercised', 'High-use thin', 'Unbacked'],
      [...new Set([...Object.keys(json.byCategory.exercised), ...Object.keys(json.byCategory.highUseThin), ...Object.keys(json.byCategory.unbacked)])]
        .sort()
        .map((category) => [
          category,
          String(json.byCategory.exercised[category] ?? 0),
          String(json.byCategory.highUseThin[category] ?? 0),
          String(json.byCategory.unbacked[category] ?? 0),
        ]),
    ),
    '',
    '## Unreached Construct Rows',
    '',
    unreachedRows.length === 0
      ? 'Every construct row in this detector taxonomy appears in at least one corpus script.'
      : table(['Construct', 'Name', 'Category', 'Grammar snippets'], unreachedRows.map((row) => [row.id, row.name, row.category, String(row.grammarSnippetCount)])),
    '',
  ].join('\n');

  await writeFile(outJson, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  await writeFile(outMd, md, 'utf8');
  process.stdout.write(`${JSON.stringify(json.headline, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
