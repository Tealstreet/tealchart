#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { Program } from '../src/parser/ast.ts';
import { parse } from '../src/parser/parser.ts';
import type { Bar, PlotOutput } from '../src/runtime/context.ts';
import type { ExecutionResult } from '../src/runtime/types.ts';
import { executeScript } from '../src/runtime/compiledOnly.ts';
import { getOfficialTradingViewLibrary } from '../src/officialTradingViewLibraries.ts';
import { checkProgram } from '../src/semantic/checker.ts';
import {
  createStandardCorpusBars,
  SyntheticExternalCorpusRequestDatafeed,
  visiblePlotsForCorpus,
  type ExternalCorpusReport,
  type ExternalCorpusReportRow,
} from './run-external-pine-corpus.ts';

type CorpusName = 'v5' | 'v6' | 'v7';
type PropertyKind = 'numeric-domain' | 'boolean-domain' | 'integer-domain' | 'nonnegative' | 'numeric-range';
type ValidationStatus = 'validated-finding' | 'unvalidated-lead';
type AuditStatus = 'audited' | 'rerun-failed';

interface SourceReportSpec {
  corpus: CorpusName;
  path: string;
  expectedProduced: number;
}

interface PropertyRule {
  member: string;
  kind: string;
  strength: string;
  assertion: string;
  citation: string;
  appliesWhen: string;
}

interface PropertyMapReport {
  summary: {
    propertyMappedMembers: number;
    propertyRules: number;
  };
  properties: PropertyRule[];
}

interface ValidationReport {
  applications?: Array<{ member: string; kind: string }>;
}

interface PlotCall {
  callIndex: number;
  argument: string;
  title?: string;
}

interface PlotBinding {
  plotIndex: number;
  plotTitle: string;
  expression: string;
  member: string;
  via: 'direct-plot-expression' | 'simple-variable-binding';
}

interface RuleFire {
  corpus: CorpusName;
  localPath: string;
  sourceRepoUrl?: string;
  sourceFilePath?: string;
  commitSha?: string;
  declaredVersion?: number;
  declarationKind?: string;
  member: string;
  kind: PropertyKind;
  validationStatus: ValidationStatus;
  validationKey: string;
  ruleAssertion: string;
  citation: string;
  appliesWhen: string;
  plotIndex: number;
  plotTitle: string;
  expression: string;
  binding: PlotBinding['via'];
  finiteValues: number;
  totalValues: number;
  violationPoints: number;
  firstViolationIndex?: number;
  firstViolationValue?: number;
  min?: number;
  max?: number;
  detail: string;
}

interface AuditRow {
  corpus: CorpusName;
  localPath: string;
  status: AuditStatus;
  diagnostic?: string;
  visiblePlots?: number;
  directBindings: number;
  appliedRules: number;
  unsupportedDirectBindings: number;
  fires: RuleFire[];
}

interface AuditReport {
  schemaVersion: 1;
  generatedAt: string;
  commitSha: string;
  propertyMap: {
    path: string;
    mappedMembers: number;
    rules: number;
    evaluatedKinds: PropertyKind[];
  };
  validationBasis: {
    vectorReport: string;
    shippedReport: string;
    validatedRules: number;
  };
  sourceReports: SourceReportSpec[];
  denominators: {
    producedOutputRows: number;
    expectedProducedOutputRows: number;
    byCorpus: Record<string, number>;
  };
  summary: {
    rowsAudited: number;
    rerunFailures: number;
    rowsWithDirectBindings: number;
    rowsWithFires: number;
    directBindings: number;
    appliedRules: number;
    unsupportedDirectBindings: number;
    fires: number;
    validatedFindings: number;
    unvalidatedLeads: number;
    byKind: Record<string, number>;
    byValidationStatus: Record<string, number>;
    byCorpus: Record<string, number>;
  };
  fires: RuleFire[];
  rows: AuditRow[];
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');
const DEFAULT_OUTPUT_BASE = resolve(PACKAGE_ROOT, 'reports/external-pine-corpus-output-member-properties-v2');
const PROPERTY_MAP_PATH = resolve(PACKAGE_ROOT, 'reports/pine-member-property-map-v3.json');
const VECTOR_VALIDATION_PATH = resolve(PACKAGE_ROOT, 'reports/pine-member-property-map-validation-v14.json');
const SHIPPED_VALIDATION_PATH = resolve(PACKAGE_ROOT, 'reports/pine-member-property-map-shipped-validation-v3.json');
const PROPERTY_MAP_REPORT_PATH = 'reports/pine-member-property-map-v3.json';
const VECTOR_VALIDATION_REPORT_PATH = 'reports/pine-member-property-map-validation-v14.json';
const SHIPPED_VALIDATION_REPORT_PATH = 'reports/pine-member-property-map-shipped-validation-v3.json';
const SUPPORTED_KINDS: PropertyKind[] = [
  'numeric-domain',
  'boolean-domain',
  'integer-domain',
  'nonnegative',
  'numeric-range',
];
const EPSILON = 1e-10;

const SOURCE_REPORTS: SourceReportSpec[] = [
  {
    corpus: 'v5',
    path: 'reports/external-pine-corpus-v5.daily-rerun-7c08371da1.json',
    expectedProduced: 855,
  },
  {
    corpus: 'v6',
    path: 'reports/external-pine-corpus-v6.daily-rerun-7c08371da1.json',
    expectedProduced: 777,
  },
  {
    corpus: 'v7',
    path: 'reports/external-pine-corpus-v7.daily-rerun-7c08371da1.json',
    expectedProduced: 304,
  },
];

function currentCommit(): string {
  return execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function reportPath(spec: SourceReportSpec): string {
  return resolve(PACKAGE_ROOT, spec.path);
}

function buildHostLibraryRegistry(ast: Program): Map<string, Program> {
  const libraries = new Map<string, Program>();
  for (const statement of ast.body) {
    if (statement.type !== 'ImportDeclaration') continue;
    const library = getOfficialTradingViewLibrary(statement.path);
    if (library?.program) libraries.set(statement.path, library.program);
  }
  return libraries;
}

function firstSemanticError(ast: Program, libraries: Map<string, Program>): string | undefined {
  const semantic = checkProgram(ast, { libraries });
  const diagnostic = semantic.diagnostics.find((item) => item.severity === 'error');
  if (!diagnostic) return undefined;
  const location =
    diagnostic.line !== undefined && diagnostic.column !== undefined
      ? `${diagnostic.line}:${diagnostic.column}: `
      : '';
  return `${location}${diagnostic.code ? `${diagnostic.code}: ` : ''}${diagnostic.message}`;
}

async function auditRow(
  corpus: CorpusName,
  sourceReportRow: ExternalCorpusReportRow,
  inputDir: string,
  bars: Bar[],
  rulesByMember: Map<string, PropertyRule[]>,
  validatedRules: Set<string>,
): Promise<AuditRow> {
  const source = await readFile(resolve(inputDir, sourceReportRow.localPath), 'utf8');
  let ast: Program;
  try {
    ast = parse(source, { grammarSource: sourceReportRow.localPath });
  } catch (error) {
    return rerunFailure(corpus, sourceReportRow, `parse: ${errorMessage(error)}`);
  }

  const libraries = buildHostLibraryRegistry(ast);
  const semanticError = firstSemanticError(ast, libraries);
  if (semanticError) return rerunFailure(corpus, sourceReportRow, `semantic: ${semanticError}`);

  let result: ExecutionResult;
  try {
    result = executeScript(ast, bars, undefined, {
      requestDatafeed: new SyntheticExternalCorpusRequestDatafeed(bars),
      libraries,
    });
  } catch (error) {
    return rerunFailure(corpus, sourceReportRow, `execute: ${errorMessage(error)}`);
  }

  const plots = visiblePlotsForCorpus(result.plots).filter((plot) => plot.type === 'plot');
  const bindings = bindPlotsToMembers(source, plots).filter((binding) => rulesByMember.has(binding.member));
  const fires: RuleFire[] = [];
  let appliedRules = 0;
  let unsupportedDirectBindings = 0;

  for (const binding of bindings) {
    const rules = rulesByMember.get(binding.member) ?? [];
    const supportedRules = rules.filter((rule): rule is PropertyRule & { kind: PropertyKind } =>
      isSupportedKind(rule.kind),
    );
    if (rules.length > 0 && supportedRules.length === 0) unsupportedDirectBindings += 1;

    const values = plots[binding.plotIndex]?.values ?? [];
    for (const rule of supportedRules) {
      appliedRules += 1;
      const fire = validateRule(corpus, sourceReportRow, binding, rule, values, validatedRules);
      if (fire) fires.push(fire);
    }
  }

  return {
    corpus,
    localPath: sourceReportRow.localPath,
    status: 'audited',
    visiblePlots: plots.length,
    directBindings: bindings.length,
    appliedRules,
    unsupportedDirectBindings,
    fires,
  };
}

function rerunFailure(corpus: CorpusName, row: ExternalCorpusReportRow, diagnostic: string): AuditRow {
  return {
    corpus,
    localPath: row.localPath,
    status: 'rerun-failed',
    diagnostic,
    directBindings: 0,
    appliedRules: 0,
    unsupportedDirectBindings: 0,
    fires: [],
  };
}

function validateRule(
  corpus: CorpusName,
  row: ExternalCorpusReportRow,
  binding: PlotBinding,
  rule: PropertyRule & { kind: PropertyKind },
  values: (number | null)[],
  validatedRules: Set<string>,
): RuleFire | undefined {
  const finite = values
    .map((value, index) => ({ value, index }))
    .filter((item): item is { value: number; index: number } => typeof item.value === 'number' && Number.isFinite(item.value));
  const violations: Array<{ value: number; index: number }> = [];

  for (const item of finite) {
    if (ruleViolates(rule, item.value)) violations.push(item);
  }

  if (violations.length === 0) return undefined;
  const validationKey = ruleKey(rule.member, rule.kind);
  const finiteValues = finite.map((item) => item.value);
  const first = violations[0]!;
  return {
    corpus,
    localPath: row.localPath,
    sourceRepoUrl: row.sourceRepoUrl,
    sourceFilePath: row.sourceFilePath,
    commitSha: row.commitSha,
    declaredVersion: typeof row.declaredVersion === 'number' ? row.declaredVersion : undefined,
    declarationKind: row.declarationKind,
    member: rule.member,
    kind: rule.kind,
    validationStatus: validatedRules.has(validationKey) ? 'validated-finding' : 'unvalidated-lead',
    validationKey,
    ruleAssertion: rule.assertion,
    citation: rule.citation,
    appliesWhen: rule.appliesWhen,
    plotIndex: binding.plotIndex,
    plotTitle: binding.plotTitle,
    expression: binding.expression,
    binding: binding.via,
    finiteValues: finite.length,
    totalValues: values.length,
    violationPoints: violations.length,
    firstViolationIndex: first.index,
    firstViolationValue: first.value,
    min: finiteValues.length > 0 ? Math.min(...finiteValues) : undefined,
    max: finiteValues.length > 0 ? Math.max(...finiteValues) : undefined,
    detail: `${rule.member} ${rule.kind} rule fired on ${violations.length}/${finite.length} finite values; first violation at bar ${first.index} is ${formatNumber(first.value)}.`,
  };
}

function ruleViolates(rule: PropertyRule & { kind: PropertyKind }, value: number): boolean {
  switch (rule.kind) {
    case 'numeric-domain':
      return false;
    case 'boolean-domain':
      return !(Math.abs(value) <= EPSILON || Math.abs(value - 1) <= EPSILON);
    case 'integer-domain':
      return Math.abs(value - Math.round(value)) > EPSILON;
    case 'nonnegative':
      return value < -EPSILON;
    case 'numeric-range': {
      const range = numericRange(rule.assertion);
      if (range) return value < range.min - EPSILON || value > range.max + EPSILON;
      if (rule.assertion.includes('-1 or a nonnegative')) return value < -1 - EPSILON;
      return false;
    }
  }
}

function numericRange(assertion: string): { min: number; max: number } | undefined {
  const match = assertion.match(/\[([+-]?(?:\d+\.?\d*|\d*\.\d+)(?:e[+-]?\d+)?),\s*([+-]?(?:\d+\.?\d*|\d*\.\d+)(?:e[+-]?\d+)?)\]/i);
  if (!match) return undefined;
  return { min: Number(match[1]), max: Number(match[2]) };
}

function bindPlotsToMembers(source: string, plots: PlotOutput[]): PlotBinding[] {
  const plotCalls = extractPlotCalls(source);
  const variables = extractSimpleBindings(source);
  const bindings: PlotBinding[] = [];
  let visiblePlotIndex = 0;

  for (const call of plotCalls) {
    if (visiblePlotIndex >= plots.length) break;
    const plot = plots[visiblePlotIndex]!;
    visiblePlotIndex += 1;
    const resolved = resolveExpression(call.argument, variables);
    if (!resolved) continue;
    bindings.push({
      plotIndex: visiblePlotIndex - 1,
      plotTitle: plot.title,
      expression: resolved.expression,
      member: resolved.member,
      via: resolved.via,
    });
  }

  return bindings;
}

function extractPlotCalls(source: string): PlotCall[] {
  const calls: PlotCall[] = [];
  for (let index = 0; index < source.length; index += 1) {
    if (!source.startsWith('plot', index)) continue;
    if (isIdent(source[index - 1] ?? '') || source[index - 1] === '.') continue;
    if (isIdent(source[index + 4] ?? '')) continue;
    let cursor = index + 4;
    while (/\s/.test(source[cursor] ?? '')) cursor += 1;
    if (source[cursor] !== '(') continue;
    const body = balancedBody(source, cursor);
    if (!body) continue;
    const args = splitTopLevel(body);
    if (args.length === 0) continue;
    calls.push({
      callIndex: calls.length,
      argument: stripNamedPrefix(args[0]!).trim(),
      title: extractPlotTitle(args),
    });
    index = cursor + body.length + 1;
  }
  return calls;
}

function extractSimpleBindings(source: string): Map<string, string> {
  const bindings = new Map<string, string>();
  const normalized = source.replace(/\r\n/g, '\n');
  for (const rawLine of normalized.split('\n')) {
    const line = removeLineComment(rawLine).trim();
    if (!line || line.includes('=>') || line.startsWith('//')) continue;
    const match = line.match(/^(?:(?:varip|var)\s+)?(?:(?:series|simple|input|const)\s+)?(?:(?:float|int|bool|color|string)\s+)?([A-Za-z_]\w*)\s*(?::=|=)\s*(.+)$/);
    if (!match) continue;
    const [, name, rhs] = match;
    if (!name || !rhs || name === 'plot') continue;
    bindings.set(name, rhs.trim());
  }
  return bindings;
}

function resolveExpression(
  expression: string,
  variables: Map<string, string>,
  seen = new Set<string>(),
): { member: string; expression: string; via: PlotBinding['via'] } | undefined {
  const normalized = stripHistory(expression.trim().replace(/^\((.*)\)$/, '$1').trim());
  const direct = directMember(normalized);
  if (direct) return { member: direct, expression: normalized, via: 'direct-plot-expression' };
  const variable = normalized.match(/^([A-Za-z_]\w*)$/)?.[1];
  if (!variable || seen.has(variable)) return undefined;
  const rhs = variables.get(variable);
  if (!rhs) return undefined;
  seen.add(variable);
  const resolved = resolveExpression(rhs, variables, seen);
  if (!resolved) return undefined;
  return { ...resolved, expression: `${variable} = ${resolved.expression}`, via: 'simple-variable-binding' };
}

function directMember(expression: string): string | undefined {
  const call = expression.match(/^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s*\(/)?.[1];
  if (call) {
    const openParen = expression.indexOf('(');
    const body = balancedBody(expression, openParen);
    if (body && expression.slice(openParen + body.length + 2).trim() === '') return call;
    return undefined;
  }
  return expression.match(/^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)$/)?.[1];
}

function stripHistory(expression: string): string {
  return expression.replace(/\s*\[\s*\d+\s*\]\s*$/, '').trim();
}

function balancedBody(source: string, openParen: number): string | undefined {
  let depth = 0;
  let quote: string | undefined;
  for (let index = openParen; index < source.length; index += 1) {
    const char = source[index]!;
    const next = source[index + 1];
    if (quote) {
      if (char === '\\') {
        index += 1;
      } else if (char === quote) {
        quote = undefined;
      }
      continue;
    }
    if ((char === '/' && next === '/') || (char === '/' && next === '*')) {
      index = skipComment(source, index);
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(openParen + 1, index);
    }
  }
  return undefined;
}

function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | undefined;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index]!;
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(' || char === '[' || char === '{') depth += 1;
    else if (char === ')' || char === ']' || char === '}') depth -= 1;
    else if (char === ',' && depth === 0) {
      parts.push(body.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(body.slice(start).trim());
  return parts;
}

function extractPlotTitle(args: string[]): string | undefined {
  for (const arg of args.slice(1)) {
    const named = arg.match(/^title\s*=\s*(["'])(.*?)\1/s);
    if (named) return named[2];
  }
  const positional = args[1]?.match(/^(["'])(.*?)\1/s);
  return positional?.[2];
}

function stripNamedPrefix(arg: string): string {
  return arg.replace(/^series\s*=\s*/, '');
}

function removeLineComment(line: string): string {
  let quote: string | undefined;
  for (let index = 0; index < line.length - 1; index += 1) {
    const char = line[index]!;
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '/' && line[index + 1] === '/') return line.slice(0, index);
  }
  return line;
}

function skipComment(source: string, index: number): number {
  if (source[index + 1] === '/') {
    const newline = source.indexOf('\n', index + 2);
    return newline === -1 ? source.length : newline;
  }
  const close = source.indexOf('*/', index + 2);
  return close === -1 ? source.length : close + 1;
}

function isIdent(char: string): boolean {
  return /[A-Za-z0-9_]/.test(char);
}

function isSupportedKind(kind: string): kind is PropertyKind {
  return SUPPORTED_KINDS.includes(kind as PropertyKind);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function ruleKey(member: string, kind: string): string {
  return `${member}|${kind}`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toPrecision(12);
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function markdownTable(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

function buildRulesByMember(propertyMap: PropertyMapReport): Map<string, PropertyRule[]> {
  const byMember = new Map<string, PropertyRule[]>();
  for (const rule of propertyMap.properties) {
    const rules = byMember.get(rule.member) ?? [];
    rules.push(rule);
    byMember.set(rule.member, rules);
  }
  return byMember;
}

async function validatedRuleSet(): Promise<Set<string>> {
  const rules = new Set<string>();
  for (const filePath of [VECTOR_VALIDATION_PATH, SHIPPED_VALIDATION_PATH]) {
    const report = await readJson<ValidationReport>(filePath);
    for (const application of report.applications ?? []) rules.add(ruleKey(application.member, application.kind));
  }
  return rules;
}

function buildMarkdown(report: AuditReport, jsonPath: string): string {
  const lines: string[] = [];
  lines.push('# External Pine Corpus Output Member Property Audit v2');
  lines.push('');
  lines.push('Date: 2026-09-11');
  lines.push(`Measurement commit: \`${report.commitSha}\``);
  lines.push(`Machine-readable companion: \`${jsonPath}\``);
  lines.push('');
  lines.push(
    'This is the rule-driven companion to the reference-free output audit. It uses `pine-member-property-map-v3.json` only, and tags every fire by whether that exact `member|kind` rule has already been exercised on known-good vector or shipped-study output.',
  );
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(
    `Conservative direct-binding pass audited ${report.summary.rowsAudited}/${report.denominators.producedOutputRows} produced-output rows. It applied ${report.summary.appliedRules} property rules to ${report.summary.directBindings} plot/member bindings and produced ${report.summary.validatedFindings} validated findings plus ${report.summary.unvalidatedLeads} unvalidated leads.`,
  );
  lines.push('');
  lines.push(
    'Validated findings are still output-property findings, not TradingView-trace defects. Unvalidated leads are first outings for their rule and must be source-read before promotion.',
  );
  lines.push('');
  lines.push('## Denominator');
  lines.push('');
  lines.push(
    markdownTable(
      ['Corpus', 'Produced-output rows'],
      Object.entries(report.denominators.byCorpus).map(([corpus, count]) => [corpus, String(count)]),
    ),
  );
  lines.push('');
  lines.push('## Rule Lens');
  lines.push('');
  lines.push(
    markdownTable(
      ['Map', 'Mapped members', 'Rules', 'Evaluated kinds', 'Known-good validated rules'],
      [
        [
          report.propertyMap.path,
          String(report.propertyMap.mappedMembers),
          String(report.propertyMap.rules),
          report.propertyMap.evaluatedKinds.join(', '),
          String(report.validationBasis.validatedRules),
        ],
      ],
    ),
  );
  lines.push('');
  lines.push('## Fire Counts');
  lines.push('');
  lines.push(
    markdownTable(
      ['Group', 'Count'],
      [
        ['direct plot/member bindings', String(report.summary.directBindings)],
        ['applied rules', String(report.summary.appliedRules)],
        ['unsupported direct bindings', String(report.summary.unsupportedDirectBindings)],
        ['fires', String(report.summary.fires)],
        ['validated findings', String(report.summary.validatedFindings)],
        ['unvalidated leads', String(report.summary.unvalidatedLeads)],
      ],
    ),
  );
  lines.push('');
  lines.push('## Fires By Kind');
  lines.push('');
  lines.push(
    Object.keys(report.summary.byKind).length === 0
      ? 'No member-property rule fires.'
      : markdownTable(
          ['Kind', 'Fires'],
          Object.entries(report.summary.byKind).map(([kind, count]) => [kind, String(count)]),
        ),
  );
  lines.push('');
  lines.push('## Fires');
  lines.push('');
  lines.push(
    report.fires.length === 0
      ? 'No member-property rule fires.'
      : markdownTable(
          ['Status', 'Corpus', 'Row', 'Member', 'Kind', 'Plot', 'Expression', 'Violations', 'Range', 'Detail'],
          report.fires.map((fire) => [
            fire.validationStatus,
            fire.corpus,
            fire.localPath,
            fire.member,
            fire.kind,
            `${fire.plotIndex}: ${fire.plotTitle}`,
            fire.expression,
            `${fire.violationPoints}/${fire.finiteValues}`,
            fire.min === undefined || fire.max === undefined
              ? ''
              : `${formatNumber(fire.min)} .. ${formatNumber(fire.max)}`,
            fire.detail,
          ]),
        ),
  );
  lines.push('');
  lines.push('## Rerun Failures');
  lines.push('');
  const failures = report.rows.filter((row) => row.status === 'rerun-failed');
  lines.push(
    failures.length === 0
      ? 'None.'
      : markdownTable(
          ['Corpus', 'Row', 'Diagnostic'],
          failures.map((row) => [row.corpus, row.localPath, row.diagnostic ?? '']),
        ),
  );
  lines.push('');
  lines.push('## Method');
  lines.push('');
  lines.push(
    '- Source reports are the current daily produced-output denominators at `7c08371da1`: v5 855, v6 777, v7 304.',
  );
  lines.push(
    '- Re-execution uses the same 1600-bar daily synthetic profile as the reference-free pass.',
  );
  lines.push(
    '- Only visible `plot()` numeric value payloads are evaluated in this first rule-driven pass.',
  );
  lines.push(
    '- A rule is applied only when the plot expression is a direct member call/name or a simple variable assigned from a direct member call/name.',
  );
  lines.push(
    '- `numeric-domain` is counted as an application but cannot fire on numeric plot payloads; it is retained so the denominator reflects which direct bindings were reached by the v2 lens.',
  );
  lines.push(
    '- String, collection, handle, enum, color payload, side-effect, and tuple rules remain unevaluated here unless a later corpus instrument can bind them to raw outputs without guessing.',
  );
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const outputBase = resolve(process.argv[2] ?? DEFAULT_OUTPUT_BASE);
  const bars = createStandardCorpusBars();
  const propertyMap = await readJson<PropertyMapReport>(PROPERTY_MAP_PATH);
  const rulesByMember = buildRulesByMember(propertyMap);
  const validatedRules = await validatedRuleSet();
  const rows: AuditRow[] = [];
  const denominatorsByCorpus: Record<string, number> = {};
  const expectedTotal = SOURCE_REPORTS.reduce((sum, item) => sum + item.expectedProduced, 0);

  for (const spec of SOURCE_REPORTS) {
    const sourceReport = await readJson<ExternalCorpusReport>(reportPath(spec));
    const produced = sourceReport.rows.filter((row) => row.outcome === 'produced-output-compiled');
    denominatorsByCorpus[spec.corpus] = produced.length;
    if (produced.length !== spec.expectedProduced) {
      throw new Error(`${spec.corpus} expected ${spec.expectedProduced} produced-output rows, got ${produced.length}`);
    }
    for (const row of produced) {
      if ((rows.length + 1) % 100 === 0) process.stderr.write(`Audited ${rows.length + 1}/${expectedTotal}\n`);
      rows.push(await auditRow(spec.corpus, row, sourceReport.inputDir, bars, rulesByMember, validatedRules));
    }
  }

  const fires = rows.flatMap((row) => row.fires);
  const directBindings = rows.reduce((sum, row) => sum + row.directBindings, 0);
  const report: AuditReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    commitSha: currentCommit(),
    propertyMap: {
      path: PROPERTY_MAP_REPORT_PATH,
      mappedMembers: propertyMap.summary.propertyMappedMembers,
      rules: propertyMap.summary.propertyRules,
      evaluatedKinds: SUPPORTED_KINDS,
    },
    validationBasis: {
      vectorReport: VECTOR_VALIDATION_REPORT_PATH,
      shippedReport: SHIPPED_VALIDATION_REPORT_PATH,
      validatedRules: validatedRules.size,
    },
    sourceReports: SOURCE_REPORTS,
    denominators: {
      producedOutputRows: Object.values(denominatorsByCorpus).reduce((sum, count) => sum + count, 0),
      expectedProducedOutputRows: expectedTotal,
      byCorpus: denominatorsByCorpus,
    },
    summary: {
      rowsAudited: rows.filter((row) => row.status === 'audited').length,
      rerunFailures: rows.filter((row) => row.status === 'rerun-failed').length,
      rowsWithDirectBindings: rows.filter((row) => row.appliedRules + row.unsupportedDirectBindings > 0).length,
      rowsWithFires: rows.filter((row) => row.fires.length > 0).length,
      directBindings,
      appliedRules: rows.reduce((sum, row) => sum + row.appliedRules, 0),
      unsupportedDirectBindings: rows.reduce((sum, row) => sum + row.unsupportedDirectBindings, 0),
      fires: fires.length,
      validatedFindings: fires.filter((fire) => fire.validationStatus === 'validated-finding').length,
      unvalidatedLeads: fires.filter((fire) => fire.validationStatus === 'unvalidated-lead').length,
      byKind: countBy(fires, (fire) => fire.kind),
      byValidationStatus: countBy(fires, (fire) => fire.validationStatus),
      byCorpus: countBy(fires, (fire) => fire.corpus),
    },
    fires,
    rows,
  };

  await mkdir(dirname(outputBase), { recursive: true });
  await writeFile(`${outputBase}.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(
    `${outputBase}.md`,
    buildMarkdown(report, `${outputBase.replace(`${PACKAGE_ROOT}/`, '')}.json`),
    'utf8',
  );
  process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
