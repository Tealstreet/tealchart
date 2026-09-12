import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  CASES,
  officialMembersForValueVectorCase,
  validateValueVectorGate,
  type ValueVectorCase,
  type ValueVectorResult,
} from './run-pine-value-vectors.ts';
import { buildPineMemberPropertyMapReport } from './report-pine-member-property-map.ts';
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

interface PropertyViolation {
  caseId: string;
  member: string;
  kind: PropertyKind;
  assertion: string;
  outputIndex: number | null;
  barIndex: number | null;
  value: unknown;
  classification: 'over-strict-rule' | 'real-defect';
  reason: string;
}

interface PropertyApplication {
  caseId: string;
  member: string;
  kind: PropertyKind;
}

const BROAD_VALUE_CASE_PREFIXES = [
  'array.',
  'matrix.',
  'map.',
  'visual.',
  'runtime.',
  'output.',
  'drawing.',
  'strategy.',
  'request.',
];

const BROAD_VALUE_NAMESPACES = new Set([
  'alert',
  'box',
  'chart.point',
  'label',
  'line',
  'linefill',
  'log',
  'polyline',
  'table',
  'ticker',
]);

const PROPERTY_MAP_REPORT_VERSION = 2;
const SERIES_PROPERTY_KINDS = new Set<PropertyKind>([
  'boolean-domain',
  'integer-domain',
  'nonnegative',
  'numeric-domain',
  'numeric-range',
  'tuple-coherence',
]);
const ATTRIBUTED_PROXY_PROPERTY_KINDS = new Set<PropertyKind>([
  ...SERIES_PROPERTY_KINDS,
  'collection-shape',
  'color-domain',
  'enum-constant',
  'handle-shape',
  'string-domain',
  'void-side-effect',
]);
const PAYLOAD_PROPERTY_KINDS = new Set<PropertyKind>([
  'color-domain',
  'enum-constant',
  'handle-shape',
  'void-side-effect',
]);
const DRAWING_MEMBER_PREFIXES = ['box.', 'label.', 'line.', 'linefill.', 'polyline.', 'table.'];
const VISUAL_PAYLOAD_MEMBERS = new Set([
  'barcolor',
  'bgcolor',
  'fill',
  'hline',
  'plot',
  'plotarrow',
  'plotbar',
  'plotcandle',
  'plotchar',
  'plotshape',
]);

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

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function primaryTargetsForCase(testCase: ValueVectorCase, officialMembers: readonly string[], officialSet: ReadonlySet<string>): Set<string> {
  const targets = new Set<string>();
  if (testCase.id.startsWith('invariant.')) {
    for (const member of officialMembers) {
      if (member.startsWith('ta.')) targets.add(member);
    }
    return targets;
  }

  if (BROAD_VALUE_CASE_PREFIXES.some((prefix) => testCase.id.startsWith(prefix)) || BROAD_VALUE_NAMESPACES.has(testCase.namespace)) {
    for (const member of officialMembers) {
      if (member !== 'indicator') targets.add(member);
    }
    return targets;
  }

  if (testCase.id.startsWith('hostile.')) {
    const [, name] = testCase.id.split('.');
    const target = `ta.${name}`;
    if (officialSet.has(target)) targets.add(target);
    return targets;
  }

  const [namespace, name] = testCase.id.split('.');
  if (namespace && name) {
    const target = `${namespace}.${name}`;
    if (officialSet.has(target)) targets.add(target);
  }
  if (testCase.id === 'language.strategy-declaration-value-inputs') {
    targets.add('strategy.equity');
    targets.add('strategy.initial_capital');
  }
  if (testCase.id === 'language.udt-collection-copy-identity') {
    targets.add('array.new');
  }
  return targets;
}

function finiteValues(outputs: readonly unknown[][] | null | undefined): Array<{ outputIndex: number; barIndex: number; value: number }> {
  const values: Array<{ outputIndex: number; barIndex: number; value: number }> = [];
  outputs?.forEach((series, outputIndex) => {
    series.forEach((value, barIndex) => {
      if (typeof value === 'number' && Number.isFinite(value)) values.push({ outputIndex, barIndex, value });
    });
  });
  return values;
}

function scalarValues(outputs: readonly unknown[][] | null | undefined): Array<{ outputIndex: number; barIndex: number; value: unknown }> {
  const values: Array<{ outputIndex: number; barIndex: number; value: unknown }> = [];
  outputs?.forEach((series, outputIndex) => {
    series.forEach((value, barIndex) => values.push({ outputIndex, barIndex, value }));
  });
  return values;
}

function isNumericOrNull(value: unknown): boolean {
  return value === null || typeof value === 'number';
}

function isBooleanPlotValue(value: unknown): boolean {
  return value === null || value === 0 || value === 1 || value === true || value === false;
}

function isBooleanProxyOutput(result: ValueVectorResult, outputIndex: number): boolean {
  const series = result.compiledOutputs?.[outputIndex];
  return !!series?.length && series.every(isBooleanPlotValue);
}

function isTrueProxyPlotValue(value: unknown): boolean {
  return value === null || value === 1 || value === true;
}

function valuesForMember(member: string, result: ValueVectorResult, outputIndex?: number): readonly unknown[][] | null | undefined {
  if (outputIndex !== undefined) {
    const series = result.compiledOutputs?.[outputIndex];
    return series ? [series] : null;
  }
  if (member.startsWith('ta.dmi') && result.compiledOutputs && result.compiledOutputs.length >= 3) return result.compiledOutputs.slice(0, 3);
  return result.compiledOutputs;
}

function drawingTypeForMember(member: string): string | null {
  if (!member.includes('.')) return null;
  const namespace = member.split('.')[0];
  if (namespace === 'box' || namespace === 'label' || namespace === 'line' || namespace === 'linefill' || namespace === 'polyline' || namespace === 'table') return namespace;
  return null;
}

function isDrawingPayloadMember(member: string): boolean {
  return DRAWING_MEMBER_PREFIXES.some((prefix) => member.startsWith(prefix)) || member === 'box' || member === 'label' || member === 'line' || member === 'linefill' || member === 'polyline' || member === 'table';
}

function isVisualPayloadMember(member: string): boolean {
  return VISUAL_PAYLOAD_MEMBERS.has(member) || member.startsWith('plot.') || member.startsWith('hline.');
}

function hasPayloadForProperty(property: MemberProperty, result: ValueVectorResult): boolean {
  if (property.kind === 'color-domain') return !!result.expectedDrawings?.length || !!result.expectedPlots?.length;
  if (property.kind === 'handle-shape') return isDrawingPayloadMember(property.member) && !!result.expectedDrawings?.length;
  if (property.kind === 'void-side-effect') {
    if (isDrawingPayloadMember(property.member)) return !!result.expectedDrawings?.length;
    if (isVisualPayloadMember(property.member)) return !!result.expectedPlots?.length;
  }
  if (property.kind === 'enum-constant') {
    if (isDrawingPayloadMember(property.member)) return !!result.expectedDrawings?.length;
    if (isVisualPayloadMember(property.member)) return !!result.expectedPlots?.length;
  }
  return false;
}

function collectColorStrings(value: unknown, colors: string[]): void {
  if (typeof value === 'string') {
    if (value.startsWith('#')) colors.push(value);
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const entry of value) collectColorStrings(entry, colors);
    return;
  }
  for (const entry of Object.values(value)) collectColorStrings(entry, colors);
}

function validatePayloadProperty(property: MemberProperty, result: ValueVectorResult): PropertyViolation[] {
  const violations: PropertyViolation[] = [];
  if (property.kind === 'handle-shape') {
    const type = drawingTypeForMember(property.member);
    if (!type) return violations;
    const hasDrawing = result.compiledDrawings?.some((drawing) => !!drawing && typeof drawing === 'object' && (drawing as { type?: unknown }).type === type);
    if (!hasDrawing) {
      violations.push({ caseId: result.id, member: property.member, kind: property.kind, assertion: property.assertion, outputIndex: null, barIndex: null, value: result.compiledDrawings, classification: 'over-strict-rule', reason: 'known-good vector did not expose the drawing handle type this rule expected' });
    }
  }
  if (property.kind === 'color-domain') {
    const colors: string[] = [];
    collectColorStrings(result.compiledDrawings, colors);
    collectColorStrings(result.compiledPlots, colors);
    for (const color of colors) {
      if (!/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(color)) {
        violations.push({ caseId: result.id, member: property.member, kind: property.kind, assertion: property.assertion, outputIndex: null, barIndex: null, value: color, classification: 'over-strict-rule', reason: 'known-good payload emitted a color outside the normalized #RRGGBB/#RRGGBBAA domain' });
      }
    }
  }
  return violations;
}

function validateProperty(property: MemberProperty, result: ValueVectorResult, outputIndex?: number): PropertyViolation[] {
  const outputs = valuesForMember(property.member, result, outputIndex);
  const violations: PropertyViolation[] = [];
  if (!outputs?.length) return violations;

  if (property.kind === 'numeric-domain') {
    for (const { outputIndex, barIndex, value } of scalarValues(outputs)) {
      if (!isNumericOrNull(value)) {
        violations.push({ caseId: result.id, member: property.member, kind: property.kind, assertion: property.assertion, outputIndex, barIndex, value, classification: 'over-strict-rule', reason: 'known-good vector emitted a non-numeric scalar where this rule expected numeric-or-na' });
      }
    }
  }

  if (property.kind === 'boolean-domain') {
    for (const { outputIndex, barIndex, value } of scalarValues(outputs)) {
      if (!isBooleanPlotValue(value)) {
        violations.push({ caseId: result.id, member: property.member, kind: property.kind, assertion: property.assertion, outputIndex, barIndex, value, classification: 'over-strict-rule', reason: 'known-good vector emitted a value outside the boolean plot domain' });
      }
    }
  }

  if (property.kind === 'color-domain' || property.kind === 'enum-constant' || property.kind === 'handle-shape' || property.kind === 'string-domain') {
    for (const { outputIndex, barIndex, value } of scalarValues(outputs)) {
      if (!isTrueProxyPlotValue(value)) {
        violations.push({ caseId: result.id, member: property.member, kind: property.kind, assertion: property.assertion, outputIndex, barIndex, value, classification: 'over-strict-rule', reason: 'known-good vector emitted a false scalar proxy for the documented constant or string property' });
      }
    }
  }

  if (property.kind === 'integer-domain') {
    for (const { outputIndex, barIndex, value } of finiteValues(outputs)) {
      if (!Number.isInteger(value)) {
        violations.push({ caseId: result.id, member: property.member, kind: property.kind, assertion: property.assertion, outputIndex, barIndex, value, classification: 'over-strict-rule', reason: 'known-good vector emitted a finite non-integer value where this rule expected an integer' });
      }
    }
  }

  if (property.kind === 'nonnegative') {
    for (const { outputIndex, barIndex, value } of finiteValues(outputs)) {
      if (value < 0) {
        violations.push({ caseId: result.id, member: property.member, kind: property.kind, assertion: property.assertion, outputIndex, barIndex, value, classification: 'over-strict-rule', reason: 'known-good vector emitted a negative finite value where this rule expected nonnegative output' });
      }
    }
  }

  if (property.kind === 'numeric-range') {
    const range = RANGE_BY_MEMBER[property.member];
    if (!range) return violations;
    for (const { outputIndex, barIndex, value } of finiteValues(outputs)) {
      const inRange = value >= range.min && value <= range.max;
      const inSet = !range.integerSet || range.integerSet.includes(value);
      if (!inRange || !inSet) {
        violations.push({ caseId: result.id, member: property.member, kind: property.kind, assertion: property.assertion, outputIndex, barIndex, value, classification: 'over-strict-rule', reason: 'known-good vector emitted a finite value outside the documented property range' });
      }
    }
  }

  if (property.kind === 'tuple-coherence' && result.compiledOutputs && result.compiledOutputs.length >= 3) {
    const [first, second, third] = result.compiledOutputs;
    for (let barIndex = 0; barIndex < Math.min(first.length, second.length, third.length); barIndex += 1) {
      const a = first[barIndex];
      const b = second[barIndex];
      const c = third[barIndex];
      if (typeof a !== 'number' || typeof b !== 'number' || typeof c !== 'number' || !Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) continue;
      let ok = true;
      if (property.member === 'ta.bb' || property.member === 'ta.kc') ok = b >= a && a >= c;
      if (property.member === 'ta.macd') ok = Math.abs((a - b) - c) <= 1e-8;
      if (!ok) {
        violations.push({ caseId: result.id, member: property.member, kind: property.kind, assertion: property.assertion, outputIndex: null, barIndex, value: [a, b, c], classification: 'over-strict-rule', reason: 'known-good tuple output violated the derived tuple coherence property' });
      }
    }
  }

  return violations;
}

function markdownList(values: readonly string[]): string {
  if (!values.length) return '- none';
  return values.map((value) => `- ${value}`).join('\n');
}

function reportVersionFromOutputBase(outputBase: string): number {
  const match = /-v(\d+)$/.exec(outputBase);
  return match ? Number(match[1]) : 1;
}

export function buildPineMemberPropertyValidationReport(version = 1): { json: unknown; markdown: string } {
  const propertyReport = buildPineMemberPropertyMapReport(PROPERTY_MAP_REPORT_VERSION).json as { properties: MemberProperty[]; summary: { propertyRules: number } };
  const propertiesByMember = new Map<string, MemberProperty[]>();
  for (const property of propertyReport.properties) {
    const bucket = propertiesByMember.get(property.member) ?? [];
    bucket.push(property);
    propertiesByMember.set(property.member, bucket);
  }

  const officialSet = new Set(pineV6ReferenceManualBuiltinNames());
  const gate = validateValueVectorGate();
  const caseById = new Map(CASES.map((testCase) => [testCase.id, testCase]));
  const passingResults = gate.results.filter((result) => result.compiledMatches && result.publicPathMatches);
  const applications: PropertyApplication[] = [];
  const violations: PropertyViolation[] = [];

  for (const result of passingResults) {
    const testCase = caseById.get(result.id);
    if (!testCase) continue;
    if (testCase.id.startsWith('invariant.')) continue;
    const members = officialMembersForValueVectorCase(testCase);
    const targets = primaryTargetsForCase(testCase, members, officialSet);
    if (testCase.outputMembers?.length) {
      testCase.outputMembers.forEach((members, outputIndex) => {
        const attributedMembers = members.filter((member) => propertiesByMember.has(member));
        for (const member of attributedMembers) {
          for (const property of propertiesByMember.get(member) ?? []) {
            if (!ATTRIBUTED_PROXY_PROPERTY_KINDS.has(property.kind)) continue;
            if ((property.kind === 'color-domain' || property.kind === 'enum-constant' || property.kind === 'handle-shape' || property.kind === 'string-domain') && !isBooleanProxyOutput(result, outputIndex)) continue;
            if (property.kind === 'void-side-effect' && !/^(array|matrix|map)\./.test(property.member)) continue;
            applications.push({ caseId: result.id, member, kind: property.kind });
            violations.push(...validateProperty(property, result, outputIndex));
          }
        }
      });
    } else if (targets.size === 1) {
      for (const member of targets) {
        for (const property of propertiesByMember.get(member) ?? []) {
          if (!SERIES_PROPERTY_KINDS.has(property.kind)) continue;
          applications.push({ caseId: result.id, member, kind: property.kind });
          violations.push(...validateProperty(property, result));
        }
      }
    }
    for (const member of members) {
      for (const property of propertiesByMember.get(member) ?? []) {
        if (!PAYLOAD_PROPERTY_KINDS.has(property.kind)) continue;
        if (!hasPayloadForProperty(property, result)) continue;
        applications.push({ caseId: result.id, member, kind: property.kind });
        violations.push(...validatePayloadProperty(property, result));
      }
    }
  }

  const uniqueAppliedRules = new Set(applications.map((row) => `${row.member}:${row.kind}`));
  const firedApplications = new Set(violations.map((row) => `${row.caseId}:${row.member}:${row.kind}`));
  const cleanApplications = applications.filter((row) => !firedApplications.has(`${row.caseId}:${row.member}:${row.kind}`));
  const realDefects = violations.filter((violation) => violation.classification === 'real-defect');
  const overStrictRules = violations.filter((violation) => violation.classification === 'over-strict-rule');
  const json = {
    schemaVersion: 1,
    basis: {
      propertyRules: propertyReport.summary.propertyRules,
      vectorCases: CASES.length,
      passingVectorCases: passingResults.length,
      expectedRedCases: Object.keys(gate.expectedFailures),
      rule: 'Executable scalar/tuple property kinds and explicit scalar proxy checks for enum/string constants are validated against passing value-vector outputs. Collection, handle, color, and side-effect rules remain corpus-payload checks unless a vector exposes that payload directly.',
    },
    summary: {
      evaluatedApplications: applications.length,
      uniqueAppliedRules: uniqueAppliedRules.size,
      ruleFiresOnKnownGoodOutput: firedApplications.size,
      violationPoints: violations.length,
      realDefects: realDefects.length,
      overStrictRules: overStrictRules.length,
      cleanApplications: cleanApplications.length,
      cleanApplicationPercent: percent(cleanApplications.length, applications.length),
    },
    applications,
    violations,
  };

  const markdown = [
    `# Pine Member Property Map Validation V${version}`,
    '',
    '## Basis',
    '',
    `- Property map: \`pine-member-property-map-v${PROPERTY_MAP_REPORT_VERSION}\`.`,
    '- Known-good data: passing cases from `run-pine-value-vectors.ts`.',
    '- Rule: a property violation on a passing vector is either a real missed defect or an over-strict property rule; every violation starts as over-strict until separately adjudicated.',
    '- Limit: validation applies executable scalar/tuple property kinds and explicit scalar proxy checks for enum/string constants to attributable vector outputs. Payload-only rules and multi-target scaffolding cases remain for corpus audit use.',
    '',
    '## Headline',
    '',
    `- Property rules in map: ${propertyReport.summary.propertyRules}.`,
    `- Passing vector cases checked: ${passingResults.length}/${CASES.length}.`,
    `- Evaluated rule applications: ${applications.length}.`,
    `- Unique applied member/kind rules: ${uniqueAppliedRules.size}.`,
    `- Rules that fire on known-good output: ${firedApplications.size}.`,
    `- Violation points: ${violations.length}.`,
    `- Real defects found here: ${realDefects.length}.`,
    `- Over-strict rules found here: ${overStrictRules.length}.`,
    '',
    '## Violations',
    '',
    markdownList(violations.map((violation) => `\`${violation.caseId}\` / \`${violation.member}\` / \`${violation.kind}\` at output ${violation.outputIndex ?? 'tuple'}, bar ${violation.barIndex ?? 'n/a'}: ${JSON.stringify(violation.value)} - ${violation.reason}`)),
    '',
  ].join('\n');

  return { json, markdown };
}

async function main(): Promise<void> {
  const outputBase = process.argv[2] ?? 'packages/tealscript/reports/pine-member-property-map-validation-v1';
  const { json, markdown } = buildPineMemberPropertyValidationReport(reportVersionFromOutputBase(outputBase));
  await mkdir(dirname(outputBase), { recursive: true });
  await writeFile(`${outputBase}.json`, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  await writeFile(`${outputBase}.md`, markdown, 'utf8');
  process.stdout.write(`${JSON.stringify((json as { summary: unknown }).summary, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
