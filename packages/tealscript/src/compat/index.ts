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
