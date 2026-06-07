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

export const compatibilityStageStatuses = ['not_run', 'passed', 'failed', 'skipped'] as const;

export type CompatibilityStageStatus = typeof compatibilityStageStatuses[number];

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

export type PineCompatibilityCorpusStages = CompatibilityStageOutcome[] | (() => CompatibilityStageOutcome[]);

export interface PineCompatibilityCorpusCase {
  ledgerEntry: PineScriptLedgerEntry;
  stages: PineCompatibilityCorpusStages;
}

type ResolvedPineCompatibilityCorpusCase = {
  ledgerEntry: PineScriptLedgerEntry;
  stages: CompatibilityStageOutcome[];
};

export interface PineCompatibilityCorpusSummary {
  total: number;
  passed: number;
  failed: number;
  plannedUnsupported: number;
  actionableFailed: number;
  byFirstFailureStage: Partial<Record<CompatibilityStage, number>>;
  byFirstFailureClass: Partial<Record<CompatibilityFailureClass, number>>;
  byFeatureTag: Record<string, { total: number; passed: number; failed: number }>;
  validationErrors: Record<string, string[]>;
}

export interface PineCompatibilityCoverageIndex {
  schemaVersion: typeof PINE_COMPATIBILITY_SCHEMA_VERSION;
  total: number;
  byCategory: Record<string, number>;
  bySourceKind: Record<string, number>;
  byPineVersion: Record<string, number>;
  byStoragePolicy: Record<string, number>;
  byFeatureTag: Record<string, number>;
}

export interface PineScriptLedger {
  schemaVersion: typeof PINE_COMPATIBILITY_SCHEMA_VERSION;
  entries: PineScriptLedgerEntry[];
}

export type PineCompatibilityStageProvider = (
  entry: PineScriptLedgerEntry,
  index: number,
) => CompatibilityStageOutcome[];

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

export function createPineScriptLedger(entries: PineScriptLedgerEntry[]): PineScriptLedger {
  return {
    schemaVersion: PINE_COMPATIBILITY_SCHEMA_VERSION,
    entries: entries.map(clonePineScriptLedgerEntry),
  };
}

export function normalizeCompatibilityStageOutcomes(stages: CompatibilityStageOutcome[]): CompatibilityStageOutcome[] {
  const byStage = new Map<CompatibilityStage, CompatibilityStageOutcome>();

  for (const stage of stages) {
    if (!compatibilityStages.includes(stage.stage) || byStage.has(stage.stage)) continue;
    byStage.set(stage.stage, cloneCompatibilityStageOutcome(stage));
  }

  return compatibilityStages.map((stage) => byStage.get(stage) ?? { stage, status: 'not_run' });
}

export function summarizeCompatibilityOutcome(stages: CompatibilityStageOutcome[]): CompatibilityRunSummary {
  const firstFailure = normalizeCompatibilityStageOutcomes(stages).find((stage) => (
    stage.status !== 'passed' && stage.status !== 'skipped'
  ));
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
  const stages = normalizeCompatibilityStageOutcomes(input.stages);
  return {
    schemaVersion: PINE_COMPATIBILITY_SCHEMA_VERSION,
    scriptId: input.scriptId,
    pineVersion: input.pineVersion ?? 'unknown',
    stages,
    summary: summarizeCompatibilityOutcome(stages),
  };
}

export function validateCompatibilityStageOutcome(stage: CompatibilityStageOutcome): string[] {
  const errors: string[] = [];
  const failureClass = stage.failureClass ?? inferCompatibilityFailureClass(stage);
  if (!compatibilityStages.includes(stage.stage)) {
    errors.push(`unknown compatibility stage: ${stage.stage}`);
  }
  if (!compatibilityStageStatuses.includes(stage.status)) {
    errors.push(`unknown compatibility stage status: ${stage.status}`);
  }
  if (stage.status === 'failed' && failureClass === undefined) {
    errors.push(`failed stage ${stage.stage} must include a failureClass`);
  }
  if (stage.status !== 'failed' && stage.failureClass !== undefined) {
    errors.push(`stage ${stage.stage} must not include failureClass unless status is failed`);
  }
  if (failureClass !== undefined && !compatibilityFailureClasses.includes(failureClass)) {
    errors.push(`unknown compatibility failure class: ${failureClass}`);
  }
  return errors;
}

export function validateCompatibilityStageSequence(stages: CompatibilityStageOutcome[]): string[] {
  const errors = stages.flatMap(validateCompatibilityStageOutcome);
  const seen = new Set<CompatibilityStage>();

  for (const stage of stages) {
    if (!compatibilityStages.includes(stage.stage)) continue;
    if (seen.has(stage.stage)) {
      errors.push(`duplicate compatibility stage: ${stage.stage}`);
      continue;
    }
    seen.add(stage.stage);
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

export function validatePineScriptLedger(ledger: PineScriptLedger): Record<string, string[]> {
  const validationErrors: Record<string, string[]> = {};
  if (ledger.schemaVersion !== PINE_COMPATIBILITY_SCHEMA_VERSION) {
    validationErrors['<ledger>'] = [
      `unsupported Pine compatibility ledger schema version: ${ledger.schemaVersion}`,
    ];
  }

  const seenIds = new Set<string>();
  for (let index = 0; index < ledger.entries.length; index += 1) {
    const entry = ledger.entries[index];
    const entryId = entry.id.trim();
    const key = entryId || `<entry-${index + 1}>`;
    appendValidationErrors(validationErrors, key, validatePineScriptLedgerEntry(entry));
    if (entryId === '') continue;
    if (seenIds.has(entryId)) {
      appendValidationErrors(validationErrors, '<ledger>', [`duplicate ledger entry id: ${entryId}`]);
      continue;
    }
    seenIds.add(entryId);
  }

  return validationErrors;
}

export function runPineCompatibilityCorpus(cases: PineCompatibilityCorpusCase[]): PineCompatibilityCorpusRun {
  const resolvedCases = cases.map(resolvePineCompatibilityCorpusCase);
  const outcomes = resolvedCases.map(({ ledgerEntry, stages }) => createCompatibilityRunOutcome({
    scriptId: ledgerEntry.id,
    pineVersion: ledgerEntry.pineVersion,
    stages,
  }));

  return {
    schemaVersion: PINE_COMPATIBILITY_SCHEMA_VERSION,
    outcomes,
    summary: summarizePineCompatibilityCorpus(resolvedCases, outcomes),
  };
}

export function runPineCompatibilityLedger(
  ledger: PineScriptLedger,
  getStages: PineCompatibilityStageProvider,
): PineCompatibilityCorpusRun {
  return runPineCompatibilityCorpus(ledger.entries.map((ledgerEntry, index) => ({
    ledgerEntry,
    stages: getStages(ledgerEntry, index),
  })));
}

export function createPineCompatibilityCoverageIndex(ledger: PineScriptLedger): PineCompatibilityCoverageIndex {
  const byCategory: Record<string, number> = {};
  const bySourceKind: Record<string, number> = {};
  const byPineVersion: Record<string, number> = {};
  const byStoragePolicy: Record<string, number> = {};
  const byFeatureTag: Record<string, number> = {};

  for (const entry of ledger.entries) {
    incrementCount(byCategory, entry.category);
    incrementCount(bySourceKind, entry.source.kind);
    incrementCount(byPineVersion, entry.pineVersion);
    incrementCount(byStoragePolicy, entry.storagePolicy);
    for (const featureTag of entry.featureTags) {
      incrementCount(byFeatureTag, featureTag);
    }
  }

  return {
    schemaVersion: PINE_COMPATIBILITY_SCHEMA_VERSION,
    total: ledger.entries.length,
    byCategory,
    bySourceKind,
    byPineVersion,
    byStoragePolicy,
    byFeatureTag,
  };
}

export function summarizePineCompatibilityCorpus(
  cases: Array<{ ledgerEntry: PineScriptLedgerEntry; stages: CompatibilityStageOutcome[] }>,
  outcomes: CompatibilityRunOutcome[],
): PineCompatibilityCorpusSummary {
  const validationErrors: Record<string, string[]> = {
    ...validatePineScriptLedger(createPineScriptLedger(cases.map((corpusCase) => corpusCase.ledgerEntry))),
  };
  const byFirstFailureStage: Partial<Record<CompatibilityStage, number>> = {};
  const byFirstFailureClass: Partial<Record<CompatibilityFailureClass, number>> = {};
  const byFeatureTag: Record<string, { total: number; passed: number; failed: number }> = {};
  let passed = 0;
  let plannedUnsupported = 0;

  for (let index = 0; index < outcomes.length; index += 1) {
    const outcome = outcomes[index];
    const corpusCase = cases[index];
    const ledgerEntry = corpusCase?.ledgerEntry;
    if (ledgerEntry) {
      appendValidationErrors(
        validationErrors,
        ledgerEntry.id || `<entry-${index + 1}>`,
        validateCompatibilityStageSequence(corpusCase.stages),
      );
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
      if (outcome.summary.firstFailureClass === 'unsupported_planned') {
        plannedUnsupported += 1;
      }
    }
  }

  const failed = outcomes.length - passed;

  return {
    total: outcomes.length,
    passed,
    failed,
    plannedUnsupported,
    actionableFailed: failed - plannedUnsupported,
    byFirstFailureStage,
    byFirstFailureClass,
    byFeatureTag,
    validationErrors,
  };
}

function resolvePineCompatibilityCorpusCase(corpusCase: PineCompatibilityCorpusCase): ResolvedPineCompatibilityCorpusCase {
  return {
    ledgerEntry: corpusCase.ledgerEntry,
    stages: typeof corpusCase.stages === 'function' ? corpusCase.stages() : corpusCase.stages,
  };
}

export function formatPineCompatibilityCorpusJson(run: PineCompatibilityCorpusRun): string {
  return `${JSON.stringify(run, null, 2)}\n`;
}

export function formatPineCompatibilityCoverageJson(index: PineCompatibilityCoverageIndex): string {
  return `${JSON.stringify(index, null, 2)}\n`;
}

export function formatPineCompatibilityCoverageMarkdown(index: PineCompatibilityCoverageIndex): string {
  return `${[
    '# Pine Compatibility Coverage',
    '',
    `Schema version: ${index.schemaVersion}`,
    `Total checkpoints: ${index.total}`,
    '',
    '## Categories',
    ...formatCountTable(index.byCategory),
    '',
    '## Source Kinds',
    ...formatCountTable(index.bySourceKind),
    '',
    '## Pine Versions',
    ...formatCountTable(index.byPineVersion),
    '',
    '## Storage Policies',
    ...formatCountTable(index.byStoragePolicy),
    '',
    '## Feature Tags',
    ...formatCountTable(index.byFeatureTag),
  ].join('\n')}\n`;
}

function cloneCompatibilityStageOutcome(stage: CompatibilityStageOutcome): CompatibilityStageOutcome {
  const failureClass = stage.failureClass ?? inferCompatibilityFailureClass(stage);

  return {
    ...stage,
    ...(failureClass ? { failureClass } : {}),
    diagnostics: stage.diagnostics?.map((diagnostic) => ({ ...diagnostic })),
  };
}

function inferCompatibilityFailureClass(stage: CompatibilityStageOutcome): CompatibilityFailureClass | undefined {
  if (stage.status !== 'failed') return undefined;
  if (stage.diagnostics?.some((diagnostic) => diagnostic.code === 'unsupported-feature')) {
    return 'unsupported_planned';
  }
  return undefined;
}

function clonePineScriptLedgerEntry(entry: PineScriptLedgerEntry): PineScriptLedgerEntry {
  return {
    ...entry,
    source: { ...entry.source },
    featureTags: [...entry.featureTags],
  };
}

function appendValidationErrors(
  validationErrors: Record<string, string[]>,
  key: string,
  errors: string[],
): void {
  if (errors.length === 0) return;
  validationErrors[key] = [...(validationErrors[key] ?? []), ...errors];
}

function incrementCount(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

export function formatPineCompatibilityCorpusMarkdown(run: PineCompatibilityCorpusRun): string {
  const passRate = run.summary.total === 0 ? '0.0' : ((run.summary.passed / run.summary.total) * 100).toFixed(1);
  const actionableTotal = run.summary.total - run.summary.plannedUnsupported;
  const actionablePassRate = actionableTotal <= 0 ? '0.0' : ((run.summary.passed / actionableTotal) * 100).toFixed(1);
  const lines = [
    '# Pine Compatibility Corpus',
    '',
    `Schema version: ${run.schemaVersion}`,
    `Total: ${run.summary.total}`,
    `Passed: ${run.summary.passed}`,
    `Failed: ${run.summary.failed}`,
    `Planned unsupported: ${run.summary.plannedUnsupported}`,
    `Actionable failed: ${run.summary.actionableFailed}`,
    `Pass rate: ${passRate}%`,
    `Actionable pass rate: ${actionablePassRate}%`,
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
