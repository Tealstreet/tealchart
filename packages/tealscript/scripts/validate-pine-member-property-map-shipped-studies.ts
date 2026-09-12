import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BARS } from './run-pine-value-vectors.ts';
import { buildPineMemberPropertyMapReport } from './report-pine-member-property-map.ts';
import type { Program } from '../src/parser/ast.ts';
import { parse } from '../src/parser/parser.ts';
import { checkProgram } from '../src/semantic/checker.ts';
import { executeCompiled, tryCompile } from '../src/runtime/codegen/execute.ts';
import { pineV6ReferenceManualBuiltinNames } from '../src/compat/pineV6ReferenceManualAudit.ts';

type PropertyKind =
  | 'boolean-domain'
  | 'color-domain'
  | 'collection-shape'
  | 'enum-constant'
  | 'handle-shape'
  | 'integer-domain'
  | 'nonnegative'
  | 'numeric-domain'
  | 'numeric-range'
  | 'string-domain'
  | 'tuple-coherence'
  | 'void-side-effect';

interface MemberProperty {
  member: string;
  kind: PropertyKind;
  assertion: string;
}

interface ShippedPineSource {
  id: string;
  surface: string;
  localPath: string;
  declaredVersion: string;
  code: string;
}

interface PropertyViolation {
  sourceId: string;
  member: string;
  kind: PropertyKind;
  assertion: string;
  output: string;
  index: number | null;
  value: unknown;
  classification: 'over-strict-rule' | 'real-defect';
  reason: string;
}

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO_ROOT = dirname(dirname(PACKAGE_ROOT));
const PROPERTY_MAP_REPORT_VERSION = 3;
const VECTOR_VALIDATION_PATH = join(PACKAGE_ROOT, 'reports/pine-member-property-map-validation-v14.json');
const DEFAULT_OUTPUT_BASE = join(PACKAGE_ROOT, 'reports/pine-member-property-map-shipped-validation-v3');

const SOURCE_FILES = [
  {
    surface: 'tealchart_builtin_indicator',
    localPath: 'packages/tealchart/src/indicators/builtinIndicators.ts',
    extract: extractBuiltinIndicatorSources,
  },
  {
    surface: 'web_custom_study_page_default',
    localPath: 'apps/web/src/custom-chart-study-page-components/defaultChartStudy.ts',
    extract: (text: string, localPath: string, surface: string) =>
      extractNamedTemplateSource(text, localPath, surface, 'defaultChartStudyCode'),
  },
  {
    surface: 'web_in_chart_editor_default',
    localPath: 'apps/web/src/atoms/tealscriptEditor.atoms.ts',
    extract: (text: string, localPath: string, surface: string) =>
      extractNamedTemplateSource(text, localPath, surface, 'DEFAULT_TEALSCRIPT_EDITOR_CODE'),
  },
];

const RANGE_BY_MEMBER: Record<string, { min: number; max: number; integerSet?: readonly number[] }> = {
  'color.b': { min: 0, max: 255 },
  'color.g': { min: 0, max: 255 },
  'color.r': { min: 0, max: 255 },
  'color.t': { min: 0, max: 100 },
  'dayofmonth': { min: 1, max: 31 },
  'dayofweek': { min: 1, max: 7 },
  'hour': { min: 0, max: 23 },
  'math.acos': { min: 0, max: Math.PI },
  'math.asin': { min: -Math.PI / 2, max: Math.PI / 2 },
  'math.atan': { min: -Math.PI / 2, max: Math.PI / 2 },
  'math.cos': { min: -1, max: 1 },
  'math.random': { min: 0, max: 1 },
  'math.sign': { min: -1, max: 1, integerSet: [-1, 0, 1] },
  'math.sin': { min: -1, max: 1 },
  'math.tanh': { min: -1, max: 1 },
  'minute': { min: 0, max: 59 },
  'month': { min: 1, max: 12 },
  'second': { min: 0, max: 59 },
  'ta.cmo': { min: -100, max: 100 },
  'ta.dmi': { min: 0, max: 100 },
  'ta.mfi': { min: 0, max: 100 },
  'ta.rci': { min: -100, max: 100 },
  'ta.rsi': { min: 0, max: 100 },
  'ta.stoch': { min: 0, max: 100 },
  'ta.tsi': { min: -100, max: 100 },
  'ta.wpr': { min: -100, max: 0 },
  'timeframe.in_seconds': { min: 0, max: Number.POSITIVE_INFINITY },
  'weekofyear': { min: 1, max: 53 },
  'array.indexof': { min: -1, max: Number.POSITIVE_INFINITY },
  'array.lastindexof': { min: -1, max: Number.POSITIVE_INFINITY },
  'array.percentrank': { min: 0, max: 100 },
  'str.pos': { min: -1, max: Number.POSITIVE_INFINITY },
};

function extractTemplateAfter(text: string, markerIndex: number): string | null {
  const start = text.indexOf('`', markerIndex);
  if (start === -1) return null;
  let output = '';
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index];
    if (char === '\\') {
      output += char;
      index += 1;
      if (index < text.length) output += text[index];
      continue;
    }
    if (char === '`') return output;
    output += char;
  }
  return null;
}

function extractBuiltinIndicatorSources(text: string, localPath: string, surface: string): ShippedPineSource[] {
  const sources: ShippedPineSource[] = [];
  const entryPattern = /code:\s*`/g;
  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(text))) {
    const id = nearestPrecedingIndicatorId(text, match.index);
    const code = extractTemplateAfter(text, match.index);
    if (!code || !looksLikePineSource(code)) continue;
    sources.push({ id, surface, localPath, declaredVersion: declaredVersionFor(code), code });
  }
  return sources;
}

function nearestPrecedingIndicatorId(text: string, index: number): string {
  const prefix = text.slice(Math.max(0, index - 1200), index);
  const matches = [...prefix.matchAll(/id:\s*'([^']+)'/g)];
  return matches.at(-1)?.[1] ?? `code@${index}`;
}

function extractNamedTemplateSource(text: string, localPath: string, surface: string, id: string): ShippedPineSource[] {
  const markerIndex = text.indexOf(id);
  if (markerIndex === -1) return [];
  const code = extractTemplateAfter(text, markerIndex);
  if (!code || !looksLikePineSource(code)) return [];
  return [{ id, surface, localPath, declaredVersion: declaredVersionFor(code), code }];
}

function looksLikePineSource(code: string): boolean {
  return /(?:^|\n)\s*(?:\/\/@version=\d+\s*)?(?:indicator|strategy|study)\s*\(/.test(code);
}

function declaredVersionFor(code: string): string {
  return code.match(/\/\/@version\s*=\s*(\d+)/)?.[1] ?? 'unspecified';
}

function stripPineLiteralsAndComments(source: string): string {
  return source
    .replace(/\/\/[^\n\r]*/g, '')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

function memberPattern(member: string): RegExp {
  const escaped = member
    .split('.')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s*\\.\\s*');
  return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`, 'g');
}

function referencedMembers(source: string, officialMembers: readonly string[]): string[] {
  const stripped = stripPineLiteralsAndComments(source);
  return officialMembers
    .filter((member) => !['false', 'na', 'true'].includes(member))
    .filter((member) => memberPattern(member).test(stripped));
}

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function numberSeriesFromPlots(result: { plots: unknown[] }): Map<string, number[]> {
  const series = new Map<string, number[]>();
  for (const plot of result.plots as Array<Record<string, unknown>>) {
    const title = typeof plot.title === 'string' ? plot.title : `plot-${series.size + 1}`;
    const values = Array.isArray(plot.values) ? plot.values : [];
    const numeric = values.map((value) => typeof value === 'number' ? value : Number.NaN);
    series.set(title, numeric);
  }
  return series;
}

function scalarValues(series: Map<string, number[]>): Array<{ output: string; index: number; value: number }> {
  const values: Array<{ output: string; index: number; value: number }> = [];
  for (const [output, outputSeries] of series) {
    outputSeries.forEach((value, index) => values.push({ output, index, value }));
  }
  return values;
}

function finiteValues(series: Map<string, number[]>): Array<{ output: string; index: number; value: number }> {
  return scalarValues(series).filter(({ value }) => Number.isFinite(value));
}

function isBooleanPlotValue(value: number): boolean {
  return Number.isNaN(value) || value === 0 || value === 1;
}

function validateProperty(source: ShippedPineSource, property: MemberProperty, series: Map<string, number[]>): PropertyViolation[] {
  const violations: PropertyViolation[] = [];
  if (!series.size) return violations;

  if (property.kind === 'numeric-domain') {
    for (const { output, index, value } of scalarValues(series)) {
      if (typeof value !== 'number') {
        violations.push({ sourceId: source.id, member: property.member, kind: property.kind, assertion: property.assertion, output, index, value, classification: 'over-strict-rule', reason: 'shipped study output was non-numeric where this rule expected numeric-or-na' });
      }
    }
  }

  if (property.kind === 'boolean-domain') {
    for (const { output, index, value } of scalarValues(series)) {
      if (!isBooleanPlotValue(value)) {
        violations.push({ sourceId: source.id, member: property.member, kind: property.kind, assertion: property.assertion, output, index, value, classification: 'over-strict-rule', reason: 'shipped study output was outside the boolean plot domain' });
      }
    }
  }

  if (property.kind === 'integer-domain') {
    for (const { output, index, value } of finiteValues(series)) {
      if (!Number.isInteger(value)) {
        violations.push({ sourceId: source.id, member: property.member, kind: property.kind, assertion: property.assertion, output, index, value, classification: 'over-strict-rule', reason: 'shipped study output was finite non-integer where this rule expected integer output' });
      }
    }
  }

  if (property.kind === 'nonnegative') {
    for (const { output, index, value } of finiteValues(series)) {
      if (value < 0) {
        violations.push({ sourceId: source.id, member: property.member, kind: property.kind, assertion: property.assertion, output, index, value, classification: 'over-strict-rule', reason: 'shipped study output was negative where this rule expected nonnegative output' });
      }
    }
  }

  if (property.kind === 'numeric-range') {
    const range = RANGE_BY_MEMBER[property.member];
    if (!range) return violations;
    for (const { output, index, value } of finiteValues(series)) {
      const inRange = value >= range.min && value <= range.max;
      const inSet = !range.integerSet || range.integerSet.includes(value);
      if (!inRange || !inSet) {
        violations.push({ sourceId: source.id, member: property.member, kind: property.kind, assertion: property.assertion, output, index, value, classification: 'over-strict-rule', reason: 'shipped study output was outside the documented property range' });
      }
    }
  }

  return violations;
}

function semanticDiagnostics(ast: Program): string[] {
  return checkProgram(ast).diagnostics
    .filter((diagnostic) => diagnostic.severity === 'error')
    .map((diagnostic) => `${diagnostic.line ?? '?'}:${diagnostic.column ?? '?'}: ${diagnostic.code}: ${diagnostic.message}`);
}

function markdownList(values: readonly string[]): string {
  if (!values.length) return '- none';
  return values.map((value) => `- ${value}`).join('\n');
}

async function collectSources(): Promise<ShippedPineSource[]> {
  const sources: ShippedPineSource[] = [];
  for (const sourceFile of SOURCE_FILES) {
    const text = await readFile(join(REPO_ROOT, sourceFile.localPath), 'utf8');
    sources.push(...sourceFile.extract(text, sourceFile.localPath, sourceFile.surface));
  }
  return sources;
}

async function buildReport(outputBase: string): Promise<void> {
  const officialMembers = pineV6ReferenceManualBuiltinNames();
  const propertyReport = buildPineMemberPropertyMapReport(PROPERTY_MAP_REPORT_VERSION).json as { properties: MemberProperty[]; summary: { propertyRules: number } };
  const vectorValidation = JSON.parse(await readFile(VECTOR_VALIDATION_PATH, 'utf8')) as {
    applications: Array<{ member: string; kind: PropertyKind }>;
    summary: { evaluatedApplications: number; ruleFiresOnKnownGoodOutput: number };
  };
  const vectorValidatedRules = new Set(vectorValidation.applications.map((row) => `${row.member}:${row.kind}`));
  const propertyByMember = new Map<string, MemberProperty[]>();
  for (const property of propertyReport.properties) {
    const bucket = propertyByMember.get(property.member) ?? [];
    bucket.push(property);
    propertyByMember.set(property.member, bucket);
  }

  const sources = await collectSources();
  const executions: Array<{ sourceId: string; status: 'passed' | 'failed'; diagnostics: string[]; members: string[]; outputs: string[] }> = [];
  const applications: Array<{ sourceId: string; member: string; kind: PropertyKind }> = [];
  const violations: PropertyViolation[] = [];

  for (const source of sources) {
    const members = referencedMembers(source.code, officialMembers);
    let ast: Program;
    try {
      ast = parse(source.code, { grammarSource: source.localPath });
    } catch (error) {
      executions.push({ sourceId: source.id, status: 'failed', diagnostics: [`parse: ${error instanceof Error ? error.message : String(error)}`], members, outputs: [] });
      continue;
    }
    const diagnostics = semanticDiagnostics(ast);
    if (diagnostics.length) {
      executions.push({ sourceId: source.id, status: 'failed', diagnostics, members, outputs: [] });
      continue;
    }
    const compiled = tryCompile(ast);
    if (!compiled.success) {
      executions.push({ sourceId: source.id, status: 'failed', diagnostics: compiled.unsupported, members, outputs: [] });
      continue;
    }
    try {
      const result = executeCompiled(compiled, BARS);
      if (!result) {
        executions.push({ sourceId: source.id, status: 'failed', diagnostics: ['execute: no result'], members, outputs: [] });
        continue;
      }
      const error = result.errors[0];
      if (error) {
        executions.push({ sourceId: source.id, status: 'failed', diagnostics: [error.message], members, outputs: [] });
        continue;
      }
      const series = numberSeriesFromPlots(result);
      executions.push({ sourceId: source.id, status: 'passed', diagnostics: [], members, outputs: [...series.keys()] });
      for (const member of members) {
        for (const property of propertyByMember.get(member) ?? []) {
          if (!['integer-domain', 'nonnegative', 'numeric-domain', 'numeric-range'].includes(property.kind)) continue;
          applications.push({ sourceId: source.id, member, kind: property.kind });
          violations.push(...validateProperty(source, property, series));
        }
      }
    } catch (error) {
      executions.push({ sourceId: source.id, status: 'failed', diagnostics: [`execute: ${error instanceof Error ? error.message : String(error)}`], members, outputs: [] });
    }
  }

  const shippedValidatedRules = new Set(applications.map((row) => `${row.member}:${row.kind}`));
  const combinedValidatedRules = new Set([...vectorValidatedRules, ...shippedValidatedRules]);
  const firedApplications = new Set(violations.map((row) => `${row.sourceId}:${row.member}:${row.kind}`));
  const realDefects = violations.filter((violation) => violation.classification === 'real-defect');
  const overStrictRules = violations.filter((violation) => violation.classification === 'over-strict-rule');

  const json = {
    schemaVersion: 1,
    basis: {
      propertyMap: `pine-member-property-map-v${PROPERTY_MAP_REPORT_VERSION}`,
      propertyRules: propertyReport.summary.propertyRules,
      shippedSources: sources.length,
      bars: BARS.length,
      sourceFiles: SOURCE_FILES.map(({ localPath, surface }) => ({ localPath, surface })),
      rule: 'Applies executable scalar property kinds to shipped Pine plot outputs. A fire is a lead: either a live defect or an over-strict rule requiring adjudication.',
    },
    summary: {
      shippedSources: sources.length,
      executedSources: executions.filter((row) => row.status === 'passed').length,
      failedSources: executions.filter((row) => row.status === 'failed').length,
      evaluatedApplications: applications.length,
      uniqueAppliedRules: shippedValidatedRules.size,
      combinedKnownGoodRuleCoverage: combinedValidatedRules.size,
      combinedKnownGoodRuleCoveragePercentOfAllRules: percent(combinedValidatedRules.size, propertyReport.summary.propertyRules),
      vectorKnownGoodApplications: vectorValidation.summary.evaluatedApplications,
      vectorKnownGoodRules: vectorValidatedRules.size,
      ruleFiresOnShippedOutput: firedApplications.size,
      violationPoints: violations.length,
      realDefects: realDefects.length,
      overStrictRules: overStrictRules.length,
    },
    executions,
    applications,
    violations,
  };

  const markdown = [
    '# Pine Member Property Map Shipped-Study Validation V1',
    '',
    '## Basis',
    '',
    `- Property map: \`pine-member-property-map-v${PROPERTY_MAP_REPORT_VERSION}\`.`,
    '- Dataset: checked-in Pine sources from Tealchart built-ins and apps/web defaults.',
    `- Bars: ${BARS.length} deterministic value-vector bars.`,
    '- Rule: a property fire on shipped output is either a live defect or an over-strict rule; this report does not silently adjudicate either.',
    '- Limit: this validates executable scalar property kinds against plot outputs. Payload-only rules remain corpus-audit checks.',
    '',
    '## Headline',
    '',
    `- Shipped Pine sources: ${sources.length}.`,
    `- Executed sources: ${json.summary.executedSources}/${sources.length}.`,
    `- Shipped-study rule applications: ${applications.length}.`,
    `- Unique shipped-study rules exercised: ${shippedValidatedRules.size}.`,
    `- Combined known-good rule coverage: ${combinedValidatedRules.size}/${propertyReport.summary.propertyRules} (${percent(combinedValidatedRules.size, propertyReport.summary.propertyRules)}).`,
    `- Rules that fire on shipped output: ${firedApplications.size}.`,
    `- Violation points: ${violations.length}.`,
    `- Real defects found here: ${realDefects.length}.`,
    `- Over-strict rules found here: ${overStrictRules.length}.`,
    '',
    '## Violations',
    '',
    markdownList(violations.map((violation) => `\`${violation.sourceId}\` / \`${violation.member}\` / \`${violation.kind}\` at ${violation.output}[${violation.index ?? 'n/a'}]: ${JSON.stringify(violation.value)} - ${violation.reason}`)),
    '',
    '## Failed Source Executions',
    '',
    markdownList(executions.filter((row) => row.status === 'failed').map((row) => `\`${row.sourceId}\` - ${row.diagnostics.join('; ')}`)),
    '',
  ].join('\n');

  await mkdir(dirname(outputBase), { recursive: true });
  await writeFile(`${outputBase}.json`, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  await writeFile(`${outputBase}.md`, `${markdown}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(json.summary, null, 2)}\n`);
}

const outputBase = process.argv[2] ?? DEFAULT_OUTPUT_BASE;
buildReport(outputBase).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
