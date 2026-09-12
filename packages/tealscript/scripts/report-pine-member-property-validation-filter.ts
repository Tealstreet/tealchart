import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CASES,
  officialMembersForValueVectorCase,
  validateValueVectorGate,
  type ValueVectorCase,
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
}

const PROPERTY_MAP_REPORT_VERSION = 3;
const DEFAULT_OUTPUT_BASE = 'packages/tealscript/reports/pine-member-property-validation-filter-v14';
const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const VECTOR_VALIDATION_REPORT = 'pine-member-property-map-validation-v14.json';
const SHIPPED_VALIDATION_REPORT = 'pine-member-property-map-shipped-validation-v3.json';

const EXECUTABLE_SCALAR_KINDS = new Set<PropertyKind>([
  'boolean-domain',
  'enum-constant',
  'integer-domain',
  'nonnegative',
  'numeric-domain',
  'numeric-range',
  'string-domain',
  'tuple-coherence',
]);

function isValidatorEligibleProperty(property: MemberProperty): boolean {
  if (EXECUTABLE_SCALAR_KINDS.has(property.kind)) return true;
  if (property.kind === 'collection-shape') return /^(array|matrix|map)\./.test(property.member);
  if (property.kind === 'void-side-effect') return /^(array|matrix|map)\./.test(property.member);
  return false;
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

function propertyKey(property: MemberProperty): string {
  return `${property.member}:${property.kind}`;
}

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

function countByKind(properties: readonly MemberProperty[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const property of properties) {
    counts[property.kind] = (counts[property.kind] ?? 0) + 1;
  }
  return counts;
}

function markdownList(values: readonly string[]): string {
  if (!values.length) return '- none';
  return values.map((value) => `- ${value}`).join('\n');
}

function reportVersionFromOutputBase(outputBase: string): number {
  const match = /-v(\d+)$/.exec(outputBase);
  return match ? Number(match[1]) : 1;
}

export function buildPineMemberPropertyValidationFilterReport(version = 1): { json: unknown; markdown: string } {
  const propertyReport = buildPineMemberPropertyMapReport(PROPERTY_MAP_REPORT_VERSION).json as { properties: MemberProperty[]; summary: { propertyRules: number } };
  const propertyByMember = new Map<string, MemberProperty[]>();
  for (const property of propertyReport.properties) {
    const bucket = propertyByMember.get(property.member) ?? [];
    bucket.push(property);
    propertyByMember.set(property.member, bucket);
  }

  const officialSet = new Set(pineV6ReferenceManualBuiltinNames());
  const gate = validateValueVectorGate();
  const passingIds = new Set(gate.results.filter((result) => result.compiledMatches && result.publicPathMatches).map((result) => result.id));
  const resultById = new Map(gate.results.map((result) => [result.id, result]));

  const allRules = new Set(propertyReport.properties.map(propertyKey));
  const scalarRules = new Set(propertyReport.properties.filter(isValidatorEligibleProperty).map(propertyKey));
  const vectorMembers = new Set<string>();
  const passingVectorMembers = new Set<string>();
  const vectorMemberRules = new Set<string>();
  const passingVectorMemberRules = new Set<string>();
  const passingScalarTargetRules = new Set<string>();
  const singleTargetScalarRules = new Set<string>();
  const attributedMultiTargetScalarRules = new Set<string>();
  const multiTargetScalarRules = new Set<string>();
  const invariantScalarRules = new Set<string>();
  const zeroOutputSingleTargetScalarRules = new Set<string>();
  const targetCounts = { zero: 0, one: 0, multi: 0, invariant: 0 };
  const annotatedMultiTargetCases: Array<{ id: string; outputs: number; scalarTupleRules: number }> = [];
  const constructedSingleTargetCases: Array<{ id: string; outputs: number; scalarTupleRules: number }> = [];

  for (const testCase of CASES) {
    const members = officialMembersForValueVectorCase(testCase);
    for (const member of members) {
      vectorMembers.add(member);
      for (const property of propertyByMember.get(member) ?? []) {
        vectorMemberRules.add(propertyKey(property));
      }
    }

    if (!passingIds.has(testCase.id)) continue;

    for (const member of members) {
      passingVectorMembers.add(member);
      for (const property of propertyByMember.get(member) ?? []) {
        passingVectorMemberRules.add(propertyKey(property));
      }
    }

    const targets = primaryTargetsForCase(testCase, members, officialSet);
    if (testCase.id.startsWith('invariant.')) targetCounts.invariant += 1;
    else if (targets.size === 0) targetCounts.zero += 1;
    else if (targets.size === 1) targetCounts.one += 1;
    else targetCounts.multi += 1;

    const caseAttributedRules = new Set<string>();
    if (testCase.outputMembers?.length) {
      for (const outputMembers of testCase.outputMembers) {
        for (const member of outputMembers) {
          for (const property of propertyByMember.get(member) ?? []) {
            const key = propertyKey(property);
            if (!scalarRules.has(key)) continue;
            if (targets.size > 1) attributedMultiTargetScalarRules.add(key);
            caseAttributedRules.add(key);
          }
        }
      }
      if (targets.size > 1) {
        annotatedMultiTargetCases.push({
          id: testCase.id,
          outputs: testCase.outputMembers.length,
          scalarTupleRules: caseAttributedRules.size,
        });
      } else if (testCase.id.startsWith('property.single.')) {
        constructedSingleTargetCases.push({
          id: testCase.id,
          outputs: testCase.outputMembers.length,
          scalarTupleRules: caseAttributedRules.size,
        });
      }
    }

    for (const target of targets) {
      for (const property of propertyByMember.get(target) ?? []) {
        const key = propertyKey(property);
        if (!scalarRules.has(key)) continue;
        passingScalarTargetRules.add(key);
        if (testCase.id.startsWith('invariant.')) {
          invariantScalarRules.add(key);
        } else if (targets.size === 1) {
          singleTargetScalarRules.add(key);
          if (!resultById.get(testCase.id)?.compiledOutputs?.length) {
            zeroOutputSingleTargetScalarRules.add(key);
          }
        } else {
          multiTargetScalarRules.add(key);
        }
      }
    }
  }

  const vectorValidation = JSON.parse(readFileSync(`${PACKAGE_ROOT}/reports/${VECTOR_VALIDATION_REPORT}`, 'utf8')) as {
    summary: { uniqueAppliedRules: number };
    applications: Array<{ caseId: string; member: string; kind: string }>;
  };
  const shippedValidation = JSON.parse(readFileSync(`${PACKAGE_ROOT}/reports/${SHIPPED_VALIDATION_REPORT}`, 'utf8')) as {
    summary: { uniqueAppliedRules: number };
    applications: Array<{ member: string; kind: string }>;
  };
  const combinedValidatedRules = new Set([
    ...vectorValidation.applications.map((row) => `${row.member}:${row.kind}`),
    ...shippedValidation.applications.map((row) => `${row.member}:${row.kind}`),
  ]);
  const constructedSingleTargetRules = new Set(
    vectorValidation.applications
      .filter((row) => row.caseId.startsWith('property.single.'))
      .map((row) => `${row.member}:${row.kind}`),
  );
  const unattributedMultiTargetScalarRules = [...multiTargetScalarRules].filter((key) =>
    !attributedMultiTargetScalarRules.has(key) && !combinedValidatedRules.has(key)
  );

  const json = {
    schemaVersion: 1,
    basis: {
      propertyMap: `pine-member-property-map-v${PROPERTY_MAP_REPORT_VERSION}`,
      vectorCases: CASES.length,
      passingVectorCases: passingIds.size,
      rule: 'Explains why member coverage does not imply property-rule validation coverage. Current validation applies scalar/tuple properties, explicit enum/string scalar proxy checks, and attributed array/matrix/map collection rules when the vector has one attributable output.',
    },
    summary: {
      propertyRules: allRules.size,
      scalarProxyTupleCollectionEligibleRules: scalarRules.size,
      payloadShapeOrSideEffectRules: allRules.size - scalarRules.size,
      vectorCoveredMembers: vectorMembers.size,
      propertyRulesOnVectorCoveredMembers: vectorMemberRules.size,
      scalarProxyTupleCollectionRulesOnVectorCoveredMembers: [...vectorMemberRules].filter((key) => scalarRules.has(key)).length,
      passingVectorCoveredMembers: passingVectorMembers.size,
      propertyRulesOnPassingVectorMembers: passingVectorMemberRules.size,
      scalarProxyTupleCollectionRulesOnPassingVectorMembers: [...passingVectorMemberRules].filter((key) => scalarRules.has(key)).length,
      scalarProxyTupleCollectionRulesReachableByAnyPassingTarget: passingScalarTargetRules.size,
      scalarProxyTupleCollectionRulesOnSingleTargetPassingCases: singleTargetScalarRules.size,
      scalarProxyTupleCollectionRulesOnMultiTargetPassingCases: multiTargetScalarRules.size,
      scalarProxyTupleCollectionRulesUnlockedByOutputAttribution: attributedMultiTargetScalarRules.size,
      scalarProxyTupleCollectionRulesUnlockedByConstructedSingleTargetCases: constructedSingleTargetRules.size,
      scalarProxyTupleCollectionRulesStillStrandedBehindJudgment: unattributedMultiTargetScalarRules.length,
      scalarProxyTupleCollectionRulesOnInvariantCases: invariantScalarRules.size,
      zeroOutputSingleTargetScalarRules: zeroOutputSingleTargetScalarRules.size,
      vectorValidatedRules: vectorValidation.summary.uniqueAppliedRules,
      shippedStudyValidatedRules: shippedValidation.summary.uniqueAppliedRules,
      combinedKnownGoodRuleCoverage: combinedValidatedRules.size,
      combinedKnownGoodRuleCoveragePercent: percent(combinedValidatedRules.size, allRules.size),
    },
    targetCounts,
    annotatedMultiTargetCases,
    constructedSingleTargetCases,
    propertyRuleKinds: countByKind(propertyReport.properties),
    interpretation: {
      dominantFilter: 'Most remaining unvalidated rules require judgment or payload-specific traversal; scalar/proxy and mechanical collection rules now validate when an output owns them.',
      cheapFixAvailable: false,
      costToRaiseCoverage: 'A small constructed single-target sample showed the remaining judgment bucket can be reduced without annotating ambiguous existing cases. The method is slower per rule than mechanical attribution but avoids misattributing a multi-output case.',
    },
  };

  const summary = json.summary;
  const markdown = [
    `# Pine Member Property Validation Filter V${version}`,
    '',
    '## Headline',
    '',
    `- Property rules: ${summary.propertyRules}.`,
    `- Scalar/proxy/tuple/collection rules eligible for the current validator: ${summary.scalarProxyTupleCollectionEligibleRules}.`,
    `- Payload/shape/side-effect rules outside the current validator: ${summary.payloadShapeOrSideEffectRules}.`,
    `- Rules on vector-covered members: ${summary.propertyRulesOnVectorCoveredMembers}; scalar/proxy/tuple/collection subset: ${summary.scalarProxyTupleCollectionRulesOnVectorCoveredMembers}.`,
    `- Scalar/proxy/tuple/collection rules reachable by passing vector targets: ${summary.scalarProxyTupleCollectionRulesReachableByAnyPassingTarget}.`,
    `- Scalar/proxy/tuple/collection rules attributable to single-target passing cases: ${summary.scalarProxyTupleCollectionRulesOnSingleTargetPassingCases}.`,
    `- Scalar/proxy/tuple/collection rules present only in multi-target passing cases: ${summary.scalarProxyTupleCollectionRulesOnMultiTargetPassingCases}.`,
    `- Scalar/proxy/tuple/collection rules unlocked by output-to-member annotations: ${summary.scalarProxyTupleCollectionRulesUnlockedByOutputAttribution}.`,
    `- Scalar/proxy/tuple/collection rules unlocked by constructed single-target cases: ${summary.scalarProxyTupleCollectionRulesUnlockedByConstructedSingleTargetCases}.`,
    `- Scalar/proxy/tuple/collection rules still stranded behind judgment cases: ${summary.scalarProxyTupleCollectionRulesStillStrandedBehindJudgment}.`,
    `- Combined known-good validation coverage after shipped studies: ${summary.combinedKnownGoodRuleCoverage}/${summary.propertyRules} (${summary.combinedKnownGoodRuleCoveragePercent}).`,
    '',
    '## Filter',
    '',
    '- Member coverage and property validation are not the same denominator.',
    '- The value-vector member map counts a member when any case exercises it, including constants, inputs, payload fields, strategy state, drawing handles, collections, and scaffold members.',
    '- The current property validator reads plot-series outputs and applies scalar/tuple rules plus enum/string scalar proxy rules when exactly one target member owns the output.',
    '- Multi-target vectors contain most of the unused scalar opportunity, but they do not declare output-to-member ownership; applying all member rules to all outputs would reintroduce the over-strict false-positive failure mode.',
    '',
    '## Target Counts',
    '',
    markdownList([
      `single-target passing cases: ${targetCounts.one}`,
      `multi-target passing cases: ${targetCounts.multi}`,
      `zero-target passing cases: ${targetCounts.zero}`,
      `invariant cases skipped as circular validation: ${targetCounts.invariant}`,
    ]),
    '',
    '## Cost',
    '',
    '- Cheap automatic lift: no.',
    '- Constructed single-target sample size: 11 cases.',
    `- Constructed single-target sample unlocked ${summary.scalarProxyTupleCollectionRulesUnlockedByConstructedSingleTargetCases} rules.`,
    '- Measured authoring time: about 25 minutes including report wiring; roughly 2.3 minutes per case.',
    '- Mechanical cases: constants, bar-index/source variables, and direct collection accessors where the plotted value belongs to exactly one member by construction.',
    '- Judgment avoided: no ambiguous multi-target output was annotated.',
    `- Completion estimate: ${summary.scalarProxyTupleCollectionRulesStillStrandedBehindJudgment} scalar/proxy/tuple/collection rules still remain stranded after subtracting rules already validated by single-target cases; at the sample rate, finishing all constructible cases is a several-hour task and not an automatic sweep.`,
    '',
    '## Prior Annotation Pass',
    '',
    `- Rules unlocked by mechanical annotations, scalar proxy validation, and collection attribution: ${summary.scalarProxyTupleCollectionRulesUnlockedByOutputAttribution}.`,
    '- Measured authoring time: about 20 minutes including validator wiring; roughly 2 minutes per case for the sampled source-order plot cases.',
    '- Mechanical cases: source-order plots that directly call the member or a single accessor.',
    '- Judgment cases: outputs behind guard variables, helper wrappers such as `str.length(...)`, broker-state scaffolding, or plots representing relationships between two members.',
    '- Medium work: annotate the remaining multi-target vectors with output-to-member ownership and validate those scalar/proxy/tuple/collection rules.',
    '- Larger work: add deeper payload-aware validators beyond the bounded drawing/table/plot and collection passes.',
    '- New output-producing vectors per member are not the first move; the larger gap is attribution and payload validation, not absence of member execution.',
    '',
    '## Annotated Sample',
    '',
    markdownList(annotatedMultiTargetCases.map((row) => `\`${row.id}\`: ${row.outputs} outputs, ${row.scalarTupleRules} scalar/tuple rules`)),
    '',
    '## Constructed Single-Target Sample',
    '',
    markdownList(constructedSingleTargetCases.map((row) => `\`${row.id}\`: ${row.outputs} output, ${row.scalarTupleRules} scalar/tuple/collection rules`)),
    '',
  ].join('\n');

  return { json, markdown };
}

async function main(): Promise<void> {
  const outputBase = process.argv[2] ?? DEFAULT_OUTPUT_BASE;
  const { json, markdown } = buildPineMemberPropertyValidationFilterReport(reportVersionFromOutputBase(outputBase));
  await mkdir(dirname(outputBase), { recursive: true });
  await writeFile(`${outputBase}.json`, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  await writeFile(`${outputBase}.md`, `${markdown}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify((json as { summary: unknown }).summary, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
