export const PINE_COMPATIBILITY_SCHEMA_VERSION = 1;

export const compatibilityStages = [
  'parse',
  'semantic',
  'runtime',
  'datafeed',
  'output',
  'render',
] as const;

export type CompatibilityStage = typeof compatibilityStages[number];

export const compatibilityFailureClasses = [
  'parse_gap',
  'semantic_gap',
  'unsupported_planned',
  'runtime_gap',
  'data_gap',
  'output_gap',
  'render_gap',
  'oracle_gap',
  'licensing_blocked',
] as const;

export type CompatibilityFailureClass = typeof compatibilityFailureClasses[number];

export type CompatibilityStageStatus = 'not_run' | 'passed' | 'failed' | 'skipped';

export interface CompatibilityDiagnostic {
  code: string;
  message: string;
  line?: number;
  column?: number;
}

export interface CompatibilityStageOutcome {
  stage: CompatibilityStage;
  status: CompatibilityStageStatus;
  failureClass?: CompatibilityFailureClass;
  message?: string;
  diagnostics?: CompatibilityDiagnostic[];
}

export interface CompatibilityRunSummary {
  passed: boolean;
  firstFailureStage?: CompatibilityStage;
  firstFailureClass?: CompatibilityFailureClass;
}

export interface CompatibilityRunOutcome {
  schemaVersion: typeof PINE_COMPATIBILITY_SCHEMA_VERSION;
  scriptId: string;
  pineVersion: PineVersion;
  stages: CompatibilityStageOutcome[];
  summary: CompatibilityRunSummary;
}

export interface PineCompatibilityCorpusCase {
  ledgerEntry: PineScriptLedgerEntry;
  stages: CompatibilityStageOutcome[];
}

export interface PineCompatibilityCorpusSummary {
  total: number;
  passed: number;
  failed: number;
  byFirstFailureStage: Partial<Record<CompatibilityStage, number>>;
  byFirstFailureClass: Partial<Record<CompatibilityFailureClass, number>>;
  byFeatureTag: Record<string, { total: number; passed: number; failed: number }>;
  validationErrors: Record<string, string[]>;
}

export interface PineCompatibilityCorpusRun {
  schemaVersion: typeof PINE_COMPATIBILITY_SCHEMA_VERSION;
  outcomes: CompatibilityRunOutcome[];
  summary: PineCompatibilityCorpusSummary;
}

export type PineVersion = 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'unknown';

export type PineScriptCategory =
  | 'indicator'
  | 'strategy'
  | 'library'
  | 'screener'
  | 'unknown';

export type PineScriptSourceKind = 'official_docs' | 'public_script' | 'manual_fixture';

export type PineScriptLicenseStatus =
  | 'redistributable'
  | 'unknown'
  | 'not_redistributable'
  | 'internal_fixture';

export type PineScriptStoragePolicy = 'metadata_only' | 'reduced_fixture_only' | 'raw_allowed';

export interface PineScriptLedgerSource {
  kind: PineScriptSourceKind;
  url?: string;
  searchContext?: string;
  retrievedAt?: string;
  licenseStatus: PineScriptLicenseStatus;
}

export interface PineScriptLedgerEntry {
  id: string;
  title: string;
  pineVersion: PineVersion;
  category: PineScriptCategory;
  source: PineScriptLedgerSource;
  featureTags: string[];
  storagePolicy: PineScriptStoragePolicy;
  notes?: string;
}

export function summarizeCompatibilityOutcome(stages: CompatibilityStageOutcome[]): CompatibilityRunSummary {
  const firstFailure = stages.find((stage) => stage.status === 'failed');
  if (!firstFailure) {
    return { passed: true };
  }

  return {
    passed: false,
    firstFailureStage: firstFailure.stage,
    firstFailureClass: firstFailure.failureClass,
  };
}

export function createCompatibilityRunOutcome(input: {
  scriptId: string;
  pineVersion?: PineVersion;
  stages: CompatibilityStageOutcome[];
}): CompatibilityRunOutcome {
  return {
    schemaVersion: PINE_COMPATIBILITY_SCHEMA_VERSION,
    scriptId: input.scriptId,
    pineVersion: input.pineVersion ?? 'unknown',
    stages: input.stages.map((stage) => ({ ...stage, diagnostics: stage.diagnostics?.map((diagnostic) => ({ ...diagnostic })) })),
    summary: summarizeCompatibilityOutcome(input.stages),
  };
}

export function validateCompatibilityStageOutcome(stage: CompatibilityStageOutcome): string[] {
  const errors: string[] = [];
  if (!compatibilityStages.includes(stage.stage)) {
    errors.push(`unknown compatibility stage: ${stage.stage}`);
  }
  if (stage.status === 'failed' && stage.failureClass === undefined) {
    errors.push(`failed stage ${stage.stage} must include a failureClass`);
  }
  if (stage.failureClass !== undefined && !compatibilityFailureClasses.includes(stage.failureClass)) {
    errors.push(`unknown compatibility failure class: ${stage.failureClass}`);
  }
  return errors;
}

export function validatePineScriptLedgerEntry(entry: PineScriptLedgerEntry): string[] {
  const errors: string[] = [];
  if (entry.id.trim() === '') errors.push('ledger entry id must not be empty');
  if (entry.title.trim() === '') errors.push(`ledger entry ${entry.id || '<missing>'} title must not be empty`);
  if (entry.featureTags.length === 0) errors.push(`ledger entry ${entry.id || '<missing>'} must include at least one feature tag`);
  if (entry.source.kind !== 'manual_fixture' && !entry.source.url && !entry.source.searchContext) {
    errors.push(`ledger entry ${entry.id || '<missing>'} source must include a url or searchContext`);
  }
  if (entry.source.licenseStatus === 'not_redistributable' && entry.storagePolicy === 'raw_allowed') {
    errors.push(`ledger entry ${entry.id || '<missing>'} cannot store raw source when licenseStatus is not_redistributable`);
  }
  if (entry.source.licenseStatus === 'unknown' && entry.storagePolicy === 'raw_allowed') {
    errors.push(`ledger entry ${entry.id || '<missing>'} cannot store raw source when licenseStatus is unknown`);
  }
  return errors;
}

export function runPineCompatibilityCorpus(cases: PineCompatibilityCorpusCase[]): PineCompatibilityCorpusRun {
  const outcomes = cases.map(({ ledgerEntry, stages }) => createCompatibilityRunOutcome({
    scriptId: ledgerEntry.id,
    pineVersion: ledgerEntry.pineVersion,
    stages,
  }));

  return {
    schemaVersion: PINE_COMPATIBILITY_SCHEMA_VERSION,
    outcomes,
    summary: summarizePineCompatibilityCorpus(cases, outcomes),
  };
}

export function summarizePineCompatibilityCorpus(
  cases: PineCompatibilityCorpusCase[],
  outcomes: CompatibilityRunOutcome[],
): PineCompatibilityCorpusSummary {
  const validationErrors: Record<string, string[]> = {};
  const byFirstFailureStage: Partial<Record<CompatibilityStage, number>> = {};
  const byFirstFailureClass: Partial<Record<CompatibilityFailureClass, number>> = {};
  const byFeatureTag: Record<string, { total: number; passed: number; failed: number }> = {};
  let passed = 0;

  for (let index = 0; index < outcomes.length; index += 1) {
    const outcome = outcomes[index];
    const corpusCase = cases[index];
    const ledgerEntry = corpusCase?.ledgerEntry;
    if (ledgerEntry) {
      const errors = [
        ...validatePineScriptLedgerEntry(ledgerEntry),
        ...corpusCase.stages.flatMap(validateCompatibilityStageOutcome),
      ];
      if (errors.length > 0) {
        validationErrors[ledgerEntry.id || `<case-${index + 1}>`] = errors;
      }
      for (const featureTag of ledgerEntry.featureTags) {
        byFeatureTag[featureTag] ??= { total: 0, passed: 0, failed: 0 };
        byFeatureTag[featureTag].total += 1;
        if (outcome.summary.passed) {
          byFeatureTag[featureTag].passed += 1;
        } else {
          byFeatureTag[featureTag].failed += 1;
        }
      }
    }

    if (outcome.summary.passed) {
      passed += 1;
      continue;
    }

    if (outcome.summary.firstFailureStage) {
      byFirstFailureStage[outcome.summary.firstFailureStage] = (byFirstFailureStage[outcome.summary.firstFailureStage] ?? 0) + 1;
    }
    if (outcome.summary.firstFailureClass) {
      byFirstFailureClass[outcome.summary.firstFailureClass] = (byFirstFailureClass[outcome.summary.firstFailureClass] ?? 0) + 1;
    }
  }

  return {
    total: outcomes.length,
    passed,
    failed: outcomes.length - passed,
    byFirstFailureStage,
    byFirstFailureClass,
    byFeatureTag,
    validationErrors,
  };
}

export function formatPineCompatibilityCorpusMarkdown(run: PineCompatibilityCorpusRun): string {
  const passRate = run.summary.total === 0 ? '0.0' : ((run.summary.passed / run.summary.total) * 100).toFixed(1);
  const lines = [
    '# Pine Compatibility Corpus',
    '',
    `Schema version: ${run.schemaVersion}`,
    `Total: ${run.summary.total}`,
    `Passed: ${run.summary.passed}`,
    `Failed: ${run.summary.failed}`,
    `Pass rate: ${passRate}%`,
    '',
    '## First Failure Stages',
    ...formatCountTable(run.summary.byFirstFailureStage),
    '',
    '## First Failure Classes',
    ...formatCountTable(run.summary.byFirstFailureClass),
    '',
    '## Feature Tags',
    ...formatFeatureTagTable(run.summary.byFeatureTag),
  ];

  if (Object.keys(run.summary.validationErrors).length > 0) {
    lines.push('', '## Validation Errors');
    for (const [scriptId, errors] of Object.entries(run.summary.validationErrors).sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`- ${scriptId}: ${errors.join('; ')}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function formatCountTable(counts: Partial<Record<string, number>>): string[] {
  const rows = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  if (rows.length === 0) return ['- None'];
  return ['| Name | Count |', '| --- | ---: |', ...rows.map(([name, count]) => `| ${name} | ${count} |`)];
}

function formatFeatureTagTable(counts: Record<string, { total: number; passed: number; failed: number }>): string[] {
  const rows = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  if (rows.length === 0) return ['- None'];
  return [
    '| Feature | Total | Passed | Failed |',
    '| --- | ---: | ---: | ---: |',
    ...rows.map(([feature, count]) => `| ${feature} | ${count.total} | ${count.passed} | ${count.failed} |`),
  ];
}
