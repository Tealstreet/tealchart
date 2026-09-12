import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { CASES } from './run-pine-value-vectors.ts';
import { buildPineValueVectorAssertionQualityReport } from './report-pine-value-vector-assertion-quality.ts';

type OracleProvenance = 'independent-local-oracle' | 'engine-derived-snapshot';

interface ProvenanceRow {
  member: string;
  provenance: OracleProvenance;
  cases: string[];
  reason: string;
}

interface AssertionQualityJson {
  valueChecked: Array<{
    member: string;
    valueCases: string[];
  }>;
}

const ENGINE_DERIVED_PATTERN = /\b(executeScript|executeCompiled|tryCompile|runCase|runValueVectors|compiledResult|publicResult|compiledOutputs|publicPathOutputs)\b/;

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function markdownList(values: readonly string[]): string {
  if (values.length === 0) return '- none';
  return values.map((value) => `- ${value}`).join('\n');
}

function reportVersionFromOutputBase(outputBase: string): number {
  const match = /-v(\d+)$/.exec(outputBase);
  return match ? Number(match[1]) : 1;
}

function caseById(): Map<string, (typeof CASES)[number]> {
  return new Map(CASES.map((testCase) => [testCase.id, testCase]));
}

function functionSourcesForCase(testCase: (typeof CASES)[number]): string {
  return [
    testCase.expected,
    testCase.expectedOutputs,
    testCase.expectedPlots,
    testCase.expectedDrawings,
    testCase.expectedAlerts,
    testCase.expectedLogs,
  ]
    .filter(Boolean)
    .map((fn) => String(fn))
    .join('\n');
}

function classifyMember(member: string, cases: string[], casesById: ReadonlyMap<string, (typeof CASES)[number]>): ProvenanceRow {
  const source = cases
    .map((id) => casesById.get(id))
    .filter((testCase): testCase is (typeof CASES)[number] => Boolean(testCase))
    .map(functionSourcesForCase)
    .join('\n');

  if (ENGINE_DERIVED_PATTERN.test(source)) {
    return {
      member,
      provenance: 'engine-derived-snapshot',
      cases,
      reason: 'at least one value expectation references the TealScript execution path',
    };
  }

  return {
    member,
    provenance: 'independent-local-oracle',
    cases,
    reason: 'value expectation is produced by harness-local formulas, constants, or expected payload objects; it does not call the TealScript execution path',
  };
}

export function buildPineValueVectorOracleProvenanceReport(version = 1): { json: unknown; markdown: string } {
  const qualityReport = buildPineValueVectorAssertionQualityReport().json as AssertionQualityJson;
  const casesById = caseById();
  const rows = qualityReport.valueChecked
    .map((row) => classifyMember(row.member, row.valueCases, casesById))
    .sort((left, right) => left.member.localeCompare(right.member));
  const independent = rows.filter((row) => row.provenance === 'independent-local-oracle');
  const engineDerived = rows.filter((row) => row.provenance === 'engine-derived-snapshot');

  const json = {
    schemaVersion: 1,
    basis: {
      valueCheckedMembers: rows.length,
      rule: 'Only members classified as value-checked in pine-value-vector-assertion-quality-v1 are included. The report inspects each target case expectation and classifies it as engine-derived only if it invokes the TealScript execution path. Independently authored oracles can still be wrong, but they are not frozen outputs from the engine under test.',
      engineDerivedPattern: ENGINE_DERIVED_PATTERN.source,
    },
    summary: {
      independentLocalOracle: independent.length,
      independentLocalOraclePercent: percent(independent.length, rows.length),
      engineDerivedSnapshot: engineDerived.length,
      engineDerivedSnapshotPercent: percent(engineDerived.length, rows.length),
    },
    engineDerived,
    independent,
  };

  const markdown = [
    `# Pine Value Vector Oracle Provenance V${version}`,
    '',
    '## Basis',
    '',
    '- Source: `packages/tealscript/scripts/run-pine-value-vectors.ts` at current HEAD.',
    `- Input set: the ${rows.length} value-checked members from \`pine-value-vector-assertion-quality-v${version}\`.`,
    '- Rule: engine-derived means a value expectation calls the TealScript execution path (`executeScript`, `executeCompiled`, `tryCompile`, `runCase`, or vector run output).',
    '- Rule: independent-local-oracle means the expectation is a harness-local formula, constant, or expected payload object that does not execute TealScript to obtain the expected value.',
    '- Limit: independent-local-oracle does not mean infallible. It means the expectation is not a frozen snapshot of the engine under test.',
    '',
    '## Headline',
    '',
    `- Value-checked members classified: ${rows.length}.`,
    `- Independently derived/local oracle: ${independent.length}/${rows.length} (${percent(independent.length, rows.length)}).`,
    `- Engine-derived frozen snapshot: ${engineDerived.length}/${rows.length} (${percent(engineDerived.length, rows.length)}).`,
    '',
    '## Engine-Derived Snapshot Members',
    '',
    markdownList(engineDerived.map((row) => `\`${row.member}\` - ${row.reason}; cases: ${row.cases.map((id) => `\`${id}\``).join(', ')}`)),
    '',
  ].join('\n');

  return { json, markdown };
}

async function main(): Promise<void> {
  const outputBase = process.argv[2] ?? 'packages/tealscript/reports/pine-value-vector-oracle-provenance-v1';
  const { json, markdown } = buildPineValueVectorOracleProvenanceReport(reportVersionFromOutputBase(outputBase));
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
