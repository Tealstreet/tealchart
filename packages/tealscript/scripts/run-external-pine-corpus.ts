import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { checkProgram } from '../src/semantic/checker.ts';
import { parse, TealscriptParseError } from '../src/parser/parser.ts';
import type { CallExpression, Expression, Program, Statement } from '../src/parser/ast.ts';
import type { ExecutionError, ExecutionResult, RuntimeSwallowedErrorSummary, TealscriptExecutionOptions } from '../src/runtime/types.ts';
import { executeScript } from '../src/runtime/compiledOnly.ts';
import type { Bar, PlotOutput } from '../src/runtime/context.ts';
import type {
  RequestCorporateActionEvent,
  RequestCorporateActionQuery,
  RequestCurrencyRateQuery,
  RequestDataContext,
  RequestDatafeed,
  RequestDatafeedQuery,
  RequestDatafeedResult,
  RequestEconomicSeriesQuery,
  RequestFinancialMetricQuery,
  RequestFootprintData,
  RequestFootprintQuery,
  RequestQuandlSeriesQuery,
  RequestSeriesQuery,
  RequestSeriesResult,
} from '../src/runtime/requestDatafeed.ts';
import type { StrategyLedger } from '../src/runtime/strategy.ts';
import { executeCompiled, tryCompile } from '../src/runtime/codegen/execute.ts';
import type { CompiledScript } from '../src/runtime/codegen/compile.ts';
import { parseTradingViewImportPath } from '../src/officialTradingViewLibraries.ts';

export const EXTERNAL_PINE_CORPUS_REPORT_SCHEMA_VERSION = 14;

export type ExternalCorpusPipelineStage = 'parse' | 'semantic' | 'compile' | 'execute' | 'output';
export type ExternalCorpusStageStatus = 'passed' | 'failed' | 'fallback' | 'not-run';
export type ExternalCorpusExecutionMode = 'compiled' | 'not-run';
export type ExternalCorpusValidityBucket = 'supported' | 'tealscript-gap' | 'host-dependency-gap' | 'unsupported-by-design' | 'invalid-pine' | 'corpus-hygiene' | 'corpus-input-gap' | 'undecided';
export type ExternalCorpusOutputSilenceBucket = 'tealscript-gap' | 'correct-silence' | 'corpus-input-gap' | 'undecided';
export type ExternalCorpusOutputParityStatus = 'matched' | 'mismatched' | 'not-run';
export type ExternalCorpusOutcome =
  | 'produced-output-compiled'
  | 'no-output-compiled'
  | 'failed';

export interface ExternalCorpusManifestScript {
  localPath: string;
  sourceRepoUrl?: string;
  sourceFilePath?: string;
  commitSha?: string;
  sourceTransform?: ExternalCorpusSourceTransform;
}

export interface ExternalCorpusManifest {
  scripts: ExternalCorpusManifestScript[];
}

export interface ExternalCorpusSourceTransform {
  kind: 'tradingview-copy-code-body';
  startLine: number;
  removedTrailingExpandMarker: boolean;
  normalizedCopiedCodeSpaces: boolean;
  rawByteSize: number;
  transformedByteSize: number;
}

export interface ExternalCorpusStageResult {
  status: ExternalCorpusStageStatus;
  diagnostic?: string;
}

export interface ExternalCorpusReportRow {
  id: string;
  localPath: string;
  sourceRepoUrl?: string;
  sourceFilePath?: string;
  commitSha?: string;
  sourceTransform?: ExternalCorpusSourceTransform;
  declaredVersion: number | 'unknown';
  declarationKind: 'indicator' | 'strategy' | 'library' | 'study' | 'unknown';
  byteSize: number;
  validity: {
    bucket: ExternalCorpusValidityBucket;
    reason: string;
  };
  firstFailedStage: ExternalCorpusPipelineStage | null;
  outcome: ExternalCorpusOutcome;
  executionMode: ExternalCorpusExecutionMode;
  fallbackReasons: string[];
  compiledBarErrors?: {
    count: number;
    firstBarIndex: number;
    firstMessage: string;
  };
  swallowedErrors?: RuntimeSwallowedErrorSummary[];
  output: {
    produced: boolean;
    plots: number;
    drawings: number;
    alerts: number;
    logs: number;
  };
  outputParity: ExternalCorpusOutputParityAnalysis;
  strategyLedgerParity: ExternalCorpusStrategyLedgerParity;
  outputSilence?: ExternalCorpusOutputSilenceAnalysis;
  stages: Record<ExternalCorpusPipelineStage, ExternalCorpusStageResult>;
}

export interface ExternalCorpusOutputCallTrace {
  kind: string;
  line?: number;
  column?: number;
  scope: 'global' | 'local';
}

export interface ExternalCorpusOutputCounts {
  produced: boolean;
  plots: number;
  rawPlots?: number;
  suppressedPlots?: number;
  drawings: number;
  alerts: number;
  logs: number;
  errors: number;
  firstError?: string;
}

export interface ExternalCorpusStrategyActivity {
  openTrades: number;
  closedTrades: number;
  positionSize: number;
}

export interface ExternalCorpusStrategyLedgerCounts {
  active: boolean;
  orders: number;
  fills: number;
  openTrades: number;
  closedTrades: number;
  positionSize: number | string | null;
  equityCurve: number;
  equity: number | string | null;
}

export interface ExternalCorpusStrategyLedgerParityAnalysis {
  status: ExternalCorpusOutputParityStatus;
  diagnostic?: string;
  firstDifference?: {
    path: string;
    kind: string;
  };
  comparedStrategy?: {
    expected: ExternalCorpusStrategyLedgerCounts;
    actual: ExternalCorpusStrategyLedgerCounts;
  };
}

export interface ExternalCorpusStrategyLedgerParity {
  compiledLedger: ExternalCorpusStrategyLedgerParityAnalysis;
}

export interface ExternalCorpusOutputSilenceAnalysis {
  bucket: ExternalCorpusOutputSilenceBucket;
  cause: string;
  reason: string;
  sourceCalls: ExternalCorpusOutputCallTrace[];
  sameBarsProbeOutput: ExternalCorpusOutputCounts;
  probeBars: {
    count: number;
    firstTime: number;
    lastTime: number;
    compiledOutput: ExternalCorpusOutputCounts;
    probeOutput: ExternalCorpusOutputCounts;
    probeStrategy: ExternalCorpusStrategyActivity;
  };
}

export interface ExternalCorpusOutputParityAnalysis {
  status: ExternalCorpusOutputParityStatus;
  diagnostic?: string;
  firstDifference?: {
    path: string;
    kind: string;
  };
  comparedOutput?: {
    reference: ExternalCorpusOutputCounts;
    compiled: ExternalCorpusOutputCounts;
  };
}

export interface ExternalCorpusReportSummary {
  total: number;
  repositories: number;
  declarationKinds: Record<string, number>;
  versionMix: Record<string, number>;
  funnel: Record<ExternalCorpusPipelineStage, { count: number; percent: number }>;
  achievableCeiling: {
    denominator: number;
    excludedInvalidPine: number;
    excludedCorpusHygiene: number;
    excludedCorpusInputGap: number;
    excludedUnsupportedByDesign: number;
    funnel: Record<ExternalCorpusPipelineStage, { count: number; percent: number }>;
  };
  validity: Record<string, number>;
  outputSilence: Record<string, number>;
  outputParity: Record<string, number>;
  outputParityDifferenceKinds: Record<string, number>;
  strategyLedgerParity: {
    strategies: number;
    executableStrategies: number;
    activeStrategies: number;
    matched: number;
    compiledLedger: Record<string, number>;
    currentlyPassingRowsWithLedgerMismatch: number;
    differenceKinds: Record<string, number>;
  };
  compiledBarErrors: {
    scripts: number;
    totalErrors: number;
    firstCauses: Array<{
      message: string;
      count: number;
      representativeScript: string;
      firstBarIndex: number;
    }>;
  };
  swallowedErrors: {
    scripts: number;
    totalErrors: number;
    firstCauses: Array<{
      site: string;
      message: string;
      count: number;
      representativeScript: string;
      firstBarIndex: number;
    }>;
  };
  executionModes: Record<string, number>;
  outcomes: Record<string, number>;
  failureCauses: Array<{
    stage: ExternalCorpusPipelineStage;
    cause: string;
    count: number;
    representativeDiagnostic: string;
  }>;
}

export interface ExternalCorpusReport {
  schemaVersion: number;
  generatedAt: string;
  inputDir: string;
  bars: {
    count: number;
    firstTime: number;
    lastTime: number;
  };
  summary: ExternalCorpusReportSummary;
  rows: ExternalCorpusReportRow[];
}

export interface RunExternalPineCorpusOptions {
  inputDir: string;
  outputPath?: string;
  bars?: Bar[];
  localPaths?: Set<string>;
}

const SUPPORTED_EXTENSIONS = new Set(['.pine', '.txt', '.pinescript']);
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');

export async function runExternalPineCorpus(options: RunExternalPineCorpusOptions): Promise<ExternalCorpusReport> {
  const inputDir = resolve(options.inputDir);
  const bars = options.bars ?? createSyntheticBars(160);
  const manifest = await readManifest(inputDir);
  const discoveredScripts = manifest?.scripts ?? (await discoverScripts(inputDir));
  const scripts = options.localPaths
    ? discoveredScripts.filter((script) => options.localPaths!.has(script.localPath))
    : discoveredScripts;
  const requestDatafeed = new SyntheticExternalCorpusRequestDatafeed(bars);

  const rows: ExternalCorpusReportRow[] = [];
  for (const [index, entry] of scripts.entries()) {
    rows.push(await runExternalPineScript(inputDir, entry, index, bars, requestDatafeed));
  }

  const report: ExternalCorpusReport = {
    schemaVersion: EXTERNAL_PINE_CORPUS_REPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    inputDir,
    bars: {
      count: bars.length,
      firstTime: bars[0]?.time ?? 0,
      lastTime: bars.at(-1)?.time ?? 0,
    },
    summary: summarizeExternalPineCorpus(rows),
    rows,
  };

  if (options.outputPath) {
    const outputPath = resolveReportOutputPath(options.outputPath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  return report;
}

function resolveReportOutputPath(outputPath: string): string {
  const resolved = outputPath.startsWith('packages/')
    ? resolve(REPO_ROOT, outputPath)
    : resolve(outputPath);
  const nestedPackagePath = resolve(PACKAGE_ROOT, 'packages');
  if (resolved === nestedPackagePath || resolved.startsWith(`${nestedPackagePath}/`)) {
    throw new Error(
      `Refusing to write corpus report under ${relative(REPO_ROOT, nestedPackagePath)}; ` +
      'when using yarn workspace, pass reports/... or a repo-relative packages/tealscript/reports/... path.',
    );
  }
  return resolved;
}

export function summarizeExternalPineCorpus(rows: ExternalCorpusReportRow[]): ExternalCorpusReportSummary {
  const total = rows.length;
  const repositories = new Set(rows.map((row) => row.sourceRepoUrl).filter((url): url is string => Boolean(url))).size;
  const stageOrder: ExternalCorpusPipelineStage[] = ['parse', 'semantic', 'compile', 'execute', 'output'];
  const funnel = Object.fromEntries(
    stageOrder.map((stage) => {
      const count = rows.filter((row) => row.stages[stage].status === 'passed' || row.stages[stage].status === 'fallback').length;
      return [stage, { count, percent: percent(count, total) }];
    }),
  ) as ExternalCorpusReportSummary['funnel'];
  const achievableRows = rows.filter((row) => (
    row.validity.bucket !== 'invalid-pine'
    && row.validity.bucket !== 'corpus-hygiene'
    && row.validity.bucket !== 'corpus-input-gap'
    && row.validity.bucket !== 'unsupported-by-design'
  ));
  const achievableDenominator = achievableRows.length;
  const achievableFunnel = Object.fromEntries(
    stageOrder.map((stage) => {
      const count = achievableRows.filter((row) => row.stages[stage].status === 'passed' || row.stages[stage].status === 'fallback').length;
      return [stage, { count, percent: percent(count, achievableDenominator) }];
    }),
  ) as ExternalCorpusReportSummary['funnel'];

  const failureCauseMap = new Map<string, { stage: ExternalCorpusPipelineStage; cause: string; count: number; representativeDiagnostic: string }>();
  for (const row of rows) {
    if (!row.firstFailedStage) continue;
    const diagnostic = row.stages[row.firstFailedStage].diagnostic ?? 'unknown failure';
    const cause = normalizeFailureCause(row.firstFailedStage, diagnostic);
    const key = `${row.firstFailedStage}\u0000${cause}`;
    const existing = failureCauseMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      failureCauseMap.set(key, {
        stage: row.firstFailedStage,
        cause,
        count: 1,
        representativeDiagnostic: diagnostic,
      });
    }
  }

  return {
    total,
    repositories,
    declarationKinds: countBy(rows, (row) => row.declarationKind),
    versionMix: countBy(rows, (row) => String(row.declaredVersion)),
    funnel,
    achievableCeiling: {
      denominator: achievableDenominator,
      excludedInvalidPine: rows.filter((row) => row.validity.bucket === 'invalid-pine').length,
      excludedCorpusHygiene: rows.filter((row) => row.validity.bucket === 'corpus-hygiene').length,
      excludedCorpusInputGap: rows.filter((row) => row.validity.bucket === 'corpus-input-gap').length,
      excludedUnsupportedByDesign: rows.filter((row) => row.validity.bucket === 'unsupported-by-design').length,
      funnel: achievableFunnel,
    },
    validity: countBy(rows, (row) => row.validity.bucket),
    outputSilence: countBy(rows.filter((row) => row.outputSilence), (row) => row.outputSilence!.bucket),
    outputParity: countBy(rows, (row) => row.outputParity.status),
    outputParityDifferenceKinds: countBy(
      rows.filter((row) => row.outputParity.status === 'mismatched'),
      (row) => row.outputParity.firstDifference?.kind ?? 'unclassified',
    ),
    strategyLedgerParity: summarizeStrategyLedgerParity(rows),
    compiledBarErrors: summarizeCompiledBarErrors(rows),
    swallowedErrors: summarizeSwallowedErrors(rows),
    executionModes: countBy(rows, (row) => row.executionMode),
    outcomes: countBy(rows, (row) => row.outcome),
    failureCauses: [...failureCauseMap.values()].sort((left, right) => right.count - left.count || left.cause.localeCompare(right.cause)),
  };
}

function summarizeStrategyLedgerParity(rows: ExternalCorpusReportRow[]): ExternalCorpusReportSummary['strategyLedgerParity'] {
  const strategyRows = rows.filter((row) => row.declarationKind === 'strategy');
  const executableStrategies = strategyRows.filter(
    (row) => row.strategyLedgerParity.compiledLedger.status !== 'not-run',
  );
  const activeStrategies = executableStrategies.filter((row) => {
    const compared = row.strategyLedgerParity.compiledLedger.comparedStrategy;
    return compared?.expected.active || compared?.actual.active;
  });
  const matched = executableStrategies.filter((row) => row.strategyLedgerParity.compiledLedger.status === 'matched').length;
  const currentlyPassingRowsWithLedgerMismatch = strategyRows.filter((row) => (
    row.outcome === 'produced-output-compiled'
    && row.strategyLedgerParity.compiledLedger.status === 'mismatched'
  )).length;

  return {
    strategies: strategyRows.length,
    executableStrategies: executableStrategies.length,
    activeStrategies: activeStrategies.length,
    matched,
    compiledLedger: countBy(strategyRows, (row) => row.strategyLedgerParity.compiledLedger.status),
    currentlyPassingRowsWithLedgerMismatch,
    differenceKinds: countBy(
      strategyRows
        .map((row) => row.strategyLedgerParity.compiledLedger)
        .filter((analysis) => analysis.status === 'mismatched'),
      (analysis) => analysis.firstDifference?.kind ?? 'unclassified',
    ),
  };
}

function buildStrategyLedgerParity(
  _declarationKind: ExternalCorpusReportRow['declarationKind'],
  _compiled: ExecutionResult | null,
): ExternalCorpusStrategyLedgerParity {
  return strategyLedgerParityNotRun();
}

export function compareStrategyLedger(
  actual: ExecutionResult,
  expected: ExecutionResult,
  actualLabel: string,
  expectedLabel: string,
): ExternalCorpusStrategyLedgerParityAnalysis {
  const actualStrategy = normalizeStrategyLedgerForParity(actual.strategy);
  const expectedStrategy = normalizeStrategyLedgerForParity(expected.strategy);
  const firstDifference = findFirstParityDifference(expectedStrategy, actualStrategy);
  const comparedStrategy = {
    expected: strategyLedgerCounts(expected.strategy),
    actual: strategyLedgerCounts(actual.strategy),
  };
  if (!firstDifference) {
    return {
      status: 'matched',
      comparedStrategy,
    };
  }
  const actualJson = JSON.stringify(actualStrategy);
  const expectedJson = JSON.stringify(expectedStrategy);
  return {
    status: 'mismatched',
    firstDifference: {
      path: firstDifference,
      kind: classifyStrategyLedgerDifference(firstDifference),
    },
    comparedStrategy,
    diagnostic: `${actualLabel}/${expectedLabel} strategy ledger mismatch: ${summarizeOutputDiff(expectedJson, actualJson, expectedLabel, actualLabel)}`,
  };
}

function normalizeStrategyLedgerForParity(ledger: StrategyLedger): unknown {
  return stableValue({
    orders: ledger.orders,
    fills: ledger.fills,
    openTrades: ledger.openTrades,
    closedTrades: ledger.closedTrades,
    position: ledger.position,
    equityCurve: ledger.equityCurve,
    initialCapital: ledger.initialCapital,
    equity: ledger.equity,
    netProfit: ledger.netProfit,
    grossProfit: ledger.grossProfit,
    grossLoss: ledger.grossLoss,
    maxRunup: ledger.maxRunup,
    maxDrawdown: ledger.maxDrawdown,
    maxContractsHeldAll: ledger.maxContractsHeldAll,
    maxContractsHeldLong: ledger.maxContractsHeldLong,
    maxContractsHeldShort: ledger.maxContractsHeldShort,
  });
}

export function strategyLedgerCounts(ledger: StrategyLedger): ExternalCorpusStrategyLedgerCounts {
  const active = ledger.orders.length > 0
    || ledger.fills.length > 0
    || ledger.openTrades.length > 0
    || ledger.closedTrades.length > 0
    || ledger.position.size !== 0;
  return {
    active,
    orders: ledger.orders.length,
    fills: ledger.fills.length,
    openTrades: ledger.openTrades.length,
    closedTrades: ledger.closedTrades.length,
    positionSize: normalizeNumberForParity(ledger.position.size),
    equityCurve: ledger.equityCurve.length,
    equity: normalizeNumberForParity(ledger.equity),
  };
}

function classifyStrategyLedgerDifference(path: string): string {
  if (path === '$.orders.length' || path.includes('.orders[')) return 'orders';
  if (path === '$.fills.length' || path.includes('.fills[')) return 'fills';
  if (path === '$.openTrades.length' || path.includes('.openTrades[')) return 'open-trades';
  if (path === '$.closedTrades.length' || path.includes('.closedTrades[')) return 'closed-trades';
  if (path === '$.position' || path.includes('.position.')) return 'position';
  if (path === '$.equityCurve.length' || path.includes('.equityCurve[')) return 'equity-curve';
  if (
    path === '$.equity'
    || path === '$.netProfit'
    || path === '$.grossProfit'
    || path === '$.grossLoss'
    || path === '$.maxRunup'
    || path === '$.maxDrawdown'
  ) {
    return 'equity';
  }
  return 'other';
}

function summarizeCompiledBarErrors(rows: ExternalCorpusReportRow[]): ExternalCorpusReportSummary['compiledBarErrors'] {
  const affectedRows = rows.filter((row) => row.compiledBarErrors);
  const byMessage = new Map<string, {
    message: string;
    count: number;
    representativeScript: string;
    firstBarIndex: number;
  }>();

  for (const row of affectedRows) {
    const errors = row.compiledBarErrors;
    if (!errors) continue;
    const existing = byMessage.get(errors.firstMessage);
    if (existing) {
      existing.count += 1;
      existing.firstBarIndex = Math.min(existing.firstBarIndex, errors.firstBarIndex);
    } else {
      byMessage.set(errors.firstMessage, {
        message: errors.firstMessage,
        count: 1,
        representativeScript: row.localPath,
        firstBarIndex: errors.firstBarIndex,
      });
    }
  }

  return {
    scripts: affectedRows.length,
    totalErrors: affectedRows.reduce((sum, row) => sum + (row.compiledBarErrors?.count ?? 0), 0),
    firstCauses: [...byMessage.values()].sort((left, right) => right.count - left.count || left.message.localeCompare(right.message)),
  };
}

function summarizeSwallowedErrors(rows: ExternalCorpusReportRow[]): ExternalCorpusReportSummary['swallowedErrors'] {
  const affectedRows = rows.filter((row) => row.swallowedErrors && row.swallowedErrors.length > 0);
  const bySiteAndMessage = new Map<string, {
    site: string;
    message: string;
    count: number;
    representativeScript: string;
    firstBarIndex: number;
  }>();

  for (const row of affectedRows) {
    for (const error of row.swallowedErrors ?? []) {
      const key = `${error.site}\u0000${error.firstMessage}`;
      const existing = bySiteAndMessage.get(key);
      if (existing) {
        existing.count += 1;
        existing.firstBarIndex = Math.min(existing.firstBarIndex, error.firstBarIndex);
      } else {
        bySiteAndMessage.set(key, {
          site: error.site,
          message: error.firstMessage,
          count: 1,
          representativeScript: row.localPath,
          firstBarIndex: error.firstBarIndex,
        });
      }
    }
  }

  return {
    scripts: affectedRows.length,
    totalErrors: affectedRows.reduce(
      (sum, row) => sum + (row.swallowedErrors ?? []).reduce((innerSum, error) => innerSum + error.count, 0),
      0,
    ),
    firstCauses: [...bySiteAndMessage.values()].sort((left, right) => (
      right.count - left.count
      || left.site.localeCompare(right.site)
      || left.message.localeCompare(right.message)
    )),
  };
}

async function runExternalPineScript(
  inputDir: string,
  entry: ExternalCorpusManifestScript,
  index: number,
  bars: Bar[],
  requestDatafeed: RequestDatafeed,
): Promise<ExternalCorpusReportRow> {
  const absolutePath = resolve(inputDir, entry.localPath);
  const source = await readFile(absolutePath, 'utf8');
  const stages = initialStages();
  const base = {
    id: `${String(index + 1).padStart(4, '0')}:${entry.sourceRepoUrl ?? 'local'}:${entry.sourceFilePath ?? entry.localPath}`,
    localPath: entry.localPath,
    sourceRepoUrl: entry.sourceRepoUrl,
    sourceFilePath: entry.sourceFilePath,
    commitSha: entry.commitSha,
    sourceTransform: entry.sourceTransform,
    declaredVersion: detectPineVersion(source),
    declarationKind: detectDeclarationKind(source),
    byteSize: Buffer.byteLength(source, 'utf8'),
  };

  let ast: Program;
  try {
    ast = parse(source, { grammarSource: entry.sourceFilePath ?? entry.localPath });
    stages.parse = { status: 'passed' };
  } catch (error) {
    stages.parse = { status: 'failed', diagnostic: formatThrownDiagnostic(error) };
    return classifyRow(failedRow(base, stages, 'parse'));
  }

  const semantic = checkProgram(ast);
  const semanticError = semantic.diagnostics.find((diagnostic) => diagnostic.severity === 'error');
  if (semanticError) {
    stages.semantic = { status: 'failed', diagnostic: formatSemanticDiagnostic(semanticError) };
    return classifyRow(failedRow(base, stages, 'semantic'));
  }
  stages.semantic = { status: 'passed' };

  let compiled: CompiledScript | null = null;
  const fallbackReasons: string[] = [];
  try {
    compiled = tryCompile(ast);
    if (compiled.success) {
      stages.compile = { status: 'passed' };
    } else {
      fallbackReasons.push(...compiled.unsupported);
      stages.compile = { status: 'failed', diagnostic: compiled.unsupported.join('; ') || 'compiled backend did not support script' };
      return {
        ...classifyRow(failedRow(base, stages, 'compile')),
        executionMode: 'not-run',
        fallbackReasons,
      };
    }
  } catch (error) {
    stages.compile = { status: 'failed', diagnostic: formatThrownDiagnostic(error) };
    return classifyRow(failedRow(base, stages, 'compile'));
  }

  const engineOptions: TealscriptExecutionOptions = { requestDatafeed };
  let result: ExecutionResult | null = null;
  let compiledResultForParity: ExecutionResult | null = null;
  let executionMode: ExternalCorpusExecutionMode = 'not-run';
  try {
    const compiledResult = executeCompiled(compiled, bars, undefined, { requestDatafeed });
    if (!compiledResult) {
      stages.execute = { status: 'failed', diagnostic: 'Compiled execution returned no result' };
      return {
        ...classifyRow(failedRow(base, stages, 'execute')),
        executionMode,
        fallbackReasons,
      };
    }
    result = compiledResult;
    compiledResultForParity = compiledResult;
    executionMode = 'compiled';
  } catch (error) {
    stages.execute = { status: 'failed', diagnostic: formatThrownDiagnostic(error) };
    return {
      ...classifyRow(failedRow(base, stages, 'execute')),
      executionMode,
      fallbackReasons,
    };
  }
  if (!result) {
    stages.execute = { status: 'failed', diagnostic: 'Compiled execution did not produce a result' };
    return {
      ...classifyRow(failedRow(base, stages, 'execute')),
      executionMode,
      fallbackReasons,
    };
  }

  const compiledBarErrors = executionMode === 'compiled' ? result.profile.compiledBarErrors : undefined;
  const swallowedErrors = result.profile.swallowedErrors;
  const executionError = result.errors[0];
  if (executionError) {
    stages.execute = { status: 'failed', diagnostic: formatExecutionError(executionError) };
    return {
      ...classifyRow(failedRow(base, stages, 'execute')),
      executionMode,
      fallbackReasons,
      compiledBarErrors,
      swallowedErrors,
    };
  }
  stages.execute = { status: 'passed' };

  const strategyLedgerParity = buildStrategyLedgerParity(
    base.declarationKind,
    compiledResultForParity,
  );

  const outputParity = { status: 'not-run' as const };
  const output = outputCountsForReport(result);
  if (!output.produced) {
    const outputSilence = analyzeOutputSilence(ast, bars, requestDatafeed, compiled?.success ? compiled : null, entry.localPath);
    stages.output = { status: 'failed', diagnostic: formatOutputSilenceDiagnostic(outputSilence) };
    return classifyRow({
      ...base,
      firstFailedStage: 'output',
      outcome: 'no-output-compiled',
      executionMode,
      fallbackReasons,
      compiledBarErrors,
      swallowedErrors,
      output,
      outputParity,
      strategyLedgerParity,
      outputSilence,
      stages,
    });
  }

  stages.output = { status: 'passed' };
  return classifyRow({
    ...base,
    firstFailedStage: null,
    outcome: 'produced-output-compiled',
    executionMode,
    fallbackReasons,
    compiledBarErrors,
    swallowedErrors,
    output,
    outputParity,
    strategyLedgerParity,
    outputSilence: undefined,
    stages,
  });
}

function initialStages(): Record<ExternalCorpusPipelineStage, ExternalCorpusStageResult> {
  return {
    parse: { status: 'not-run' },
    semantic: { status: 'not-run' },
    compile: { status: 'not-run' },
    execute: { status: 'not-run' },
    output: { status: 'not-run' },
  };
}

function failedRow(
  base: Omit<ExternalCorpusReportRow, 'validity' | 'firstFailedStage' | 'outcome' | 'executionMode' | 'fallbackReasons' | 'output' | 'outputParity' | 'strategyLedgerParity' | 'stages'>,
  stages: Record<ExternalCorpusPipelineStage, ExternalCorpusStageResult>,
  firstFailedStage: ExternalCorpusPipelineStage,
): Omit<ExternalCorpusReportRow, 'validity'> {
  return {
    ...base,
    firstFailedStage,
    outcome: 'failed',
    executionMode: 'not-run',
    fallbackReasons: [],
    output: {
      produced: false,
      plots: 0,
      drawings: 0,
      alerts: 0,
      logs: 0,
    },
    outputParity: { status: 'not-run' },
    strategyLedgerParity: strategyLedgerParityNotRun(),
    outputSilence: undefined,
    stages,
  };
}

function strategyLedgerParityNotRun(): ExternalCorpusStrategyLedgerParity {
  return {
    compiledLedger: { status: 'not-run' },
  };
}

function classifyRow(row: Omit<ExternalCorpusReportRow, 'validity'>): ExternalCorpusReportRow {
  return {
    ...row,
    validity: classifyExternalCorpusValidity(row),
  };
}

const OUTPUT_CALL_NAMES = new Set([
  'plot',
  'plotshape',
  'plotchar',
  'plotarrow',
  'plotbar',
  'plotcandle',
  'hline',
  'fill',
  'bgcolor',
  'barcolor',
  'line.new',
  'label.new',
  'box.new',
  'table.new',
  'polyline.new',
  'alert',
  'alertcondition',
  'strategy.entry',
  'strategy.order',
  'strategy.exit',
  'strategy.close',
  'strategy.close_all',
]);

function analyzeOutputSilence(
  ast: Program,
  bars: Bar[],
  requestDatafeed: RequestDatafeed,
  compiled: CompiledScript | null,
  localPath?: string,
): ExternalCorpusOutputSilenceAnalysis {
  const sourceCalls = collectOutputCallTraces(ast);
  const sameBarsProbe = executeScript(ast, bars, undefined, { requestDatafeed });
  const probeBars = createOutputProbeBars();
  const probeRequestDatafeed = new SyntheticExternalCorpusRequestDatafeed(probeBars);
  const probeCompiled = compiled ? executeCompiled(compiled, probeBars, undefined, { requestDatafeed: probeRequestDatafeed }) : null;
  const probeResult = executeScript(ast, probeBars, undefined, { requestDatafeed: probeRequestDatafeed });
  const sameBarsProbeOutput = outputCounts(sameBarsProbe);
  const probeCompiledOutput = outputCounts(probeCompiled);
  const probeOutput = outputCounts(probeResult);
  const probeStrategy = strategyActivity(probeResult);
  const sourceCallKinds = new Set(sourceCalls.map((call) => call.kind));
  const onlyStrategyCalls = sourceCalls.length > 0 && sourceCalls.every((call) => call.kind.startsWith('strategy.'));
  const onlyNonFunnelVisualCalls = sourceCalls.length > 0 && sourceCalls.every((call) => (
    call.kind === 'table.new' || call.kind === 'bgcolor' || call.kind === 'barcolor'
  ));
  const hasStrategyActivity =
    probeStrategy.openTrades > 0
    || probeStrategy.closedTrades > 0
    || probeStrategy.positionSize !== 0;

  if (sameBarsProbeOutput.produced) {
    return {
      bucket: 'tealscript-gap',
      cause: 'compiled-empty-reference-output',
      reason: `Compiled output path produced nothing, but the reference produced ${formatOutputCounts(sameBarsProbeOutput)} on the same synthetic bars.`,
      sourceCalls,
      sameBarsProbeOutput,
      probeBars: {
        count: probeBars.length,
        firstTime: probeBars[0]?.time ?? 0,
        lastTime: probeBars.at(-1)?.time ?? 0,
        compiledOutput: probeCompiledOutput,
        probeOutput,
        probeStrategy,
      },
    };
  }

  if (probeOutput.produced && !probeCompiledOutput.produced) {
    return {
      bucket: 'tealscript-gap',
      cause: 'compiled-empty-extended-reference-output',
      reason: `Compiled output path stayed empty on the extended probe, but the reference produced ${formatOutputCounts(probeOutput)}.`,
      sourceCalls,
      sameBarsProbeOutput,
      probeBars: {
        count: probeBars.length,
        firstTime: probeBars[0]?.time ?? 0,
        lastTime: probeBars.at(-1)?.time ?? 0,
        compiledOutput: probeCompiledOutput,
        probeOutput,
        probeStrategy,
      },
    };
  }

  if (probeCompiledOutput.produced || probeOutput.produced) {
    return {
      bucket: 'correct-silence',
      cause: 'synthetic-window-did-not-trigger-output',
      reason: `The default 160-bar synthetic window did not trigger visible output, but the extended probe produced ${formatOutputCounts(probeCompiledOutput.produced ? probeCompiledOutput : probeOutput)}.`,
      sourceCalls,
      sameBarsProbeOutput,
      probeBars: {
        count: probeBars.length,
        firstTime: probeBars[0]?.time ?? 0,
        lastTime: probeBars.at(-1)?.time ?? 0,
        compiledOutput: probeCompiledOutput,
        probeOutput,
        probeStrategy,
      },
    };
  }

  if (sourceCalls.length === 0) {
    return {
      bucket: 'correct-silence',
      cause: 'source-declares-no-chart-output',
      reason: 'The source has no plot, drawing, alert, or strategy order calls; empty output is expected.',
      sourceCalls,
      sameBarsProbeOutput,
      probeBars: {
        count: probeBars.length,
        firstTime: probeBars[0]?.time ?? 0,
        lastTime: probeBars.at(-1)?.time ?? 0,
        compiledOutput: probeCompiledOutput,
        probeOutput,
        probeStrategy,
      },
    };
  }

  if (onlyStrategyCalls && hasStrategyActivity) {
    return {
      bucket: 'correct-silence',
      cause: 'strategy-only-ledger-output',
      reason: 'The source only submits strategy orders; the output funnel tracks chart plots, drawings, alerts, and logs, while the extended probe shows strategy ledger activity.',
      sourceCalls,
      sameBarsProbeOutput,
      probeBars: {
        count: probeBars.length,
        firstTime: probeBars[0]?.time ?? 0,
        lastTime: probeBars.at(-1)?.time ?? 0,
        compiledOutput: probeCompiledOutput,
        probeOutput,
        probeStrategy,
      },
    };
  }

  if (onlyNonFunnelVisualCalls) {
    return {
      bucket: 'undecided',
      cause: 'table-or-coloring-only-output',
      reason: 'The source only declares table or bar/background-color outputs, and the corpus visible-output funnel did not receive counted plot, drawing, alert, or log payloads.',
      sourceCalls,
      sameBarsProbeOutput,
      probeBars: {
        count: probeBars.length,
        firstTime: probeBars[0]?.time ?? 0,
        lastTime: probeBars.at(-1)?.time ?? 0,
        compiledOutput: probeCompiledOutput,
        probeOutput,
        probeStrategy,
      },
    };
  }

  const allOutputCallsAreLocal = sourceCalls.every((call) => call.scope === 'local');
  if (allOutputCallsAreLocal || sourceCallKinds.has('alert') || sourceCallKinds.has('line.new') || sourceCallKinds.has('label.new') || sourceCallKinds.has('box.new')) {
    const classifiedSilence = classifyDataGatedOutputSilence(localPath, sourceCalls, sameBarsProbeOutput, probeCompiledOutput, probeOutput, probeStrategy, probeBars);
    if (classifiedSilence) return classifiedSilence;
    return {
      bucket: 'undecided',
      cause: 'conditional-or-data-gated-output-not-triggered',
      reason: 'All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.',
      sourceCalls,
      sameBarsProbeOutput,
      probeBars: {
        count: probeBars.length,
        firstTime: probeBars[0]?.time ?? 0,
        lastTime: probeBars.at(-1)?.time ?? 0,
        compiledOutput: probeCompiledOutput,
        probeOutput,
        probeStrategy,
      },
    };
  }

  return {
    bucket: 'tealscript-gap',
    cause: 'global-output-declared-but-not-evaluated',
    reason: 'The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.',
    sourceCalls,
    sameBarsProbeOutput,
    probeBars: {
      count: probeBars.length,
      firstTime: probeBars[0]?.time ?? 0,
      lastTime: probeBars.at(-1)?.time ?? 0,
      compiledOutput: probeCompiledOutput,
      probeOutput,
      probeStrategy,
    },
  };
}

function classifyDataGatedOutputSilence(
  localPath: string | undefined,
  sourceCalls: ExternalCorpusOutputCallTrace[],
  sameBarsProbeOutput: ExternalCorpusOutputCounts,
  probeCompiledOutput: ExternalCorpusOutputCounts,
  probeOutput: ExternalCorpusOutputCounts,
  probeStrategy: ExternalCorpusStrategyActivity,
  probeBars: Bar[],
): ExternalCorpusOutputSilenceAnalysis | null {
  if (!localPath) return null;
  const common = {
    sourceCalls,
    sameBarsProbeOutput,
    probeBars: {
      count: probeBars.length,
      firstTime: probeBars[0]?.time ?? 0,
      lastTime: probeBars.at(-1)?.time ?? 0,
      compiledOutput: probeCompiledOutput,
      probeOutput,
      probeStrategy,
    },
  };
  const corpusInputGap = (reason: string): ExternalCorpusOutputSilenceAnalysis => ({
    bucket: 'corpus-input-gap',
    cause: 'corpus-bars-do-not-trigger-data-gated-output',
    reason,
    ...common,
  });
  const correctSilence = (reason: string): ExternalCorpusOutputSilenceAnalysis => ({
    bucket: 'correct-silence',
    cause: 'strategy-conditions-did-not-trigger-ledger-output',
    reason,
    ...common,
  });

  switch (localPath) {
    case 'sources/0026-henryoliver-pinescript-indicators-fibonacci.pine':
      return corpusInputGap('Fibonacci lines require two confirmed opposite pivots whose leg move clears the ATR-scaled deviation threshold; the smooth synthetic series never forms qualifying anchors.');
    case 'sources/0045-ictmentality-pinescript-indicators-other_FVG_Indicator.txt':
      return corpusInputGap('Fair-value-gap boxes require low[1] > high[3] or high[1] < low[3] inside the recent NY session window; the synthetic OHLC series is continuous and overlapping, so no gap forms.');
    case 'sources/0060-ictmentality-pinescript-indicators-other_QT_Indicator_QTIndicator.txt':
    case 'sources/0062-ictmentality-pinescript-indicators-other_QT_Indicator_Checkpoint.txt':
      return corpusInputGap('Quarterly Theory drawings are gated by chart timeframe/cycle settings: daily runs only on 15m/30m, m90 only on 5m, micro on 1m-3m or 30s-59s, nano on 5s-29s, and weekly is disabled by default. The corpus executes a single default 60m runtime with 1-minute synthetic timestamps, so no live cycle is enabled.');
    case 'sources/0070-ictmentality-pinescript-indicators-other_TTFM_TTFM_no_import_fixed_alert_and_shadowing.txt':
    case 'sources/0071-ictmentality-pinescript-indicators-other_TTFM_TTFM_no_import_fixed_shadowing.txt':
    case 'sources/0072-ictmentality-pinescript-indicators-other_TTFM_TTFM_no_import_no_warnings_v2.txt':
    case 'sources/0073-ictmentality-pinescript-indicators-other_TTFM_TTFM_no_import_no_warnings.txt':
    case 'sources/0074-ictmentality-pinescript-indicators-other_TTFM_TTFM_no_import.txt':
      return corpusInputGap('TTFM output is gated behind higher-timeframe candle creation, T-spot/sweep confirmation, or a last-1000-bars display window. With the corpus default 60m runtime but 1-minute synthetic timestamps, the 160-bar and extended probes do not span enough realistic higher-timeframe sessions to create the required HTF candle set.');
    case 'sources/0088-razorbladekisses-Tradingview-Indicators-indicators_Institutional_Supply_Demand_Zones':
      return corpusInputGap('Supply/demand boxes require a red/green reversal candle whose body is at least 1.8x the previous body and passes the enabled timeframe gate; the low-volatility synthetic sequence never creates the required impulse candle.');
    case 'sources/0089-razorbladekisses-Tradingview-Indicators-indicators_Reversal_Pivot_Points':
      return corpusInputGap('Pivot lines require request.security pivothigh/pivotlow values on the selected 15m timeframe with gaps_on; the smooth synthetic request series never emits a non-na pivot level to draw.');
    case 'sources/0145-Ahmed-GoCode-Quant-Edge-Indicators-Quant-Edge-Indicators_RSI_Momentum_Double_RSI_Strategy.pinescript':
      return correctSilence('The strategy has no visual outputs and only submits orders when higher/lower timeframe RSI crossover conditions fire; the synthetic request series never triggers an entry or exit, so empty chart output is correct for this data.');
    default:
      return null;
  }
}

export function outputCounts(result: ExecutionResult | null): ExternalCorpusOutputCounts {
  const rawPlots = result?.plots.length ?? 0;
  const plots = result ? visiblePlotsForCorpus(result.plots).length : 0;
  const drawings = result?.drawings.length ?? 0;
  const alerts = result?.alerts.length ?? 0;
  const logs = result?.logs.length ?? 0;
  return {
    produced: plots + drawings + alerts + logs > 0,
    plots,
    rawPlots,
    suppressedPlots: rawPlots - plots,
    drawings,
    alerts,
    logs,
    errors: result?.errors.length ?? 0,
    firstError: result?.errors[0] ? formatExecutionError(result.errors[0]) : undefined,
  };
}

function outputCountsForReport(result: ExecutionResult): ExternalCorpusReportRow['output'] {
  const plots = visiblePlotsForCorpus(result.plots).length;
  return {
    produced: plots + result.drawings.length + result.alerts.length + result.logs.length > 0,
    plots,
    drawings: result.drawings.length,
    alerts: result.alerts.length,
    logs: result.logs.length,
  };
}

function formatOutputSilenceDiagnostic(analysis: ExternalCorpusOutputSilenceAnalysis): string {
  return `output-silence:${analysis.cause}: ${analysis.reason}`;
}

export function visiblePlotsForCorpus(plots: readonly PlotOutput[]): PlotOutput[] {
  return plots.filter((plot) => {
    if (plot.display === 0) return false;
    if (plot.type !== 'fill') return true;
    const visibleColor = Array.isArray(plot.color)
      ? plot.color.some((color) => color !== null)
      : plot.color !== null;
    const visibleValue = plot.values.some((value) => value !== null);
    return visibleColor && visibleValue;
  });
}

export function compareExecutionOutput(
  actual: ExecutionResult,
  expected: ExecutionResult,
  actualLabel: string,
  expectedLabel: string,
): ExternalCorpusOutputParityAnalysis {
  const actualOutput = normalizeExecutionOutputForParity(actual);
  const expectedOutput = normalizeExecutionOutputForParity(expected);
  const firstDifference = findFirstParityDifference(expectedOutput, actualOutput);
  if (!firstDifference) return { status: 'matched' };
  const actualJson = JSON.stringify(actualOutput);
  const expectedJson = JSON.stringify(expectedOutput);
  return {
    status: 'mismatched',
    firstDifference: {
      path: firstDifference,
      kind: classifyOutputParityDifference(firstDifference),
    },
    comparedOutput: {
      reference: outputCounts(expected),
      compiled: outputCounts(actual),
    },
    diagnostic: `${actualLabel}/${expectedLabel} output mismatch: ${summarizeOutputDiff(expectedJson, actualJson, expectedLabel, actualLabel)}`,
  };
}

function normalizeExecutionOutputForParity(result: ExecutionResult): unknown {
  return stableValue({
    plots: visiblePlotsForCorpus(result.plots).map((plot) => ({
      title: plot.title,
      type: plot.type,
      values: plot.values.map(normalizeNumberForParity),
      openValues: plot.openValues?.map(normalizeNumberForParity),
      highValues: plot.highValues?.map(normalizeNumberForParity),
      lowValues: plot.lowValues?.map(normalizeNumberForParity),
      closeValues: plot.closeValues?.map(normalizeNumberForParity),
      textValues: plot.textValues,
      text: plot.text,
    })),
    drawings: normalizeDrawingsForParity(result.drawings),
    alerts: result.alerts.map((alert) => ({
      title: alert.title,
      type: alert.type,
      message: alert.message,
      values: alert.values,
      renderedMessages: alert.renderedMessages,
      frequency: alert.frequency,
      events: alert.events.map((event) => ({
        barIndex: event.barIndex,
        message: event.message,
        frequency: event.frequency,
      })),
    })),
    logs: result.logs.map((log) => ({
      level: log.level,
      barIndex: log.barIndex,
      message: log.message,
    })),
    errors: result.errors.map(formatExecutionError),
  });
}

function normalizeDrawingsForParity(drawings: ExecutionResult['drawings']): unknown {
  const idMap = new Map<string, string>();
  let nextId = 0;
  const canonicalizeDrawingId = (id: unknown): unknown => {
    if (typeof id !== 'string') return id;
    const existing = idMap.get(id);
    if (existing) return existing;
    const canonical = `drawing#${nextId}`;
    nextId += 1;
    idMap.set(id, canonical);
    return canonical;
  };

  return drawings.map((drawing) => ({
    ...drawing,
    id: canonicalizeDrawingId(drawing.id),
    persistent: undefined,
    ...(drawing.type === 'linefill'
      ? {
          line1: canonicalizeDrawingId(drawing.line1),
          line2: canonicalizeDrawingId(drawing.line2),
        }
      : {}),
  }));
}

function stableValue(value: unknown): unknown {
  if (typeof value === 'number') return normalizeNumberForParity(value);
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, stableValue(entryValue)]),
  );
}

function normalizeNumberForParity(value: number | null): number | null | string {
  if (value === null) return null;
  if (Number.isNaN(value)) return 'NaN';
  if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
  return value;
}

const PARITY_NUMERIC_TOLERANCE = 1e-8;

function findFirstParityDifference(expected: unknown, actual: unknown, path = '$'): string | null {
  if (Object.is(expected, actual)) return null;
  if (typeof expected === 'number' || typeof actual === 'number') {
    if (typeof expected !== 'number' || typeof actual !== 'number') return path;
    return Math.abs(expected - actual) <= PARITY_NUMERIC_TOLERANCE ? null : path;
  }

  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) return path;
    if (expected.length !== actual.length) return `${path}.length`;
    for (let index = 0; index < expected.length; index += 1) {
      const child = findFirstParityDifference(expected[index], actual[index], `${path}[${index}]`);
      if (child) return child;
    }
    return null;
  }

  if (isComparableObject(expected) || isComparableObject(actual)) {
    if (!isComparableObject(expected) || !isComparableObject(actual)) return path;
    const expectedKeys = Object.keys(expected).sort();
    const actualKeys = Object.keys(actual).sort();
    const keyListDifference = findFirstParityDifference(expectedKeys, actualKeys, `${path}.keys`);
    if (keyListDifference) return keyListDifference;
    for (const key of expectedKeys) {
      const child = findFirstParityDifference(expected[key], actual[key], `${path}.${key}`);
      if (child) return child;
    }
    return null;
  }

  return path;
}

function isComparableObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function classifyOutputParityDifference(path: string): string {
  if (path === '$.plots.length' || path.includes('.plots[') && (path.endsWith('.title') || path.endsWith('.type') || path.endsWith('.keys.length'))) {
    return 'plot-structure';
  }
  if (path.includes('.plots[')) return 'plot-values';
  if (path === '$.drawings.length' || path.includes('.drawings[')) return 'drawings';
  if (path === '$.alerts.length' || path.includes('.alerts[')) return 'alerts';
  if (path === '$.logs.length' || path.includes('.logs[')) return 'logs';
  if (path === '$.errors.length' || path.includes('.errors[')) return 'runtime-errors';
  return 'other';
}

function summarizeOutputDiff(expected: string, actual: string, expectedLabel = 'reference', actualLabel = 'compiled'): string {
  const limit = 500;
  let firstDiff = -1;
  const max = Math.max(expected.length, actual.length);
  for (let i = 0; i < max; i += 1) {
    if (expected[i] !== actual[i]) {
      firstDiff = i;
      break;
    }
  }
  if (firstDiff < 0) return `${expectedLabel}=${expected.slice(0, limit)} ${actualLabel}=${actual.slice(0, limit)}`;

  const start = Math.max(0, firstDiff - Math.floor(limit / 2));
  const end = firstDiff + Math.floor(limit / 2);
  return `firstDiff=${firstDiff} ${expectedLabel}=${expected.slice(start, end)} ${actualLabel}=${actual.slice(start, end)}`;
}

function strategyActivity(result: ExecutionResult): ExternalCorpusStrategyActivity {
  return {
    openTrades: result.strategy.openTrades.length,
    closedTrades: result.strategy.closedTrades.length,
    positionSize: result.strategy.position.size,
  };
}

function formatOutputCounts(counts: ExternalCorpusOutputCounts): string {
  return `${counts.plots} plots, ${counts.drawings} drawings, ${counts.alerts} alerts, ${counts.logs} logs`;
}

function collectOutputCallTraces(ast: Program): ExternalCorpusOutputCallTrace[] {
  const calls: ExternalCorpusOutputCallTrace[] = [];

  const visitStatement = (statement: Statement, scope: 'global' | 'local'): void => {
    switch (statement.type) {
      case 'VariableDeclaration':
        visitExpressionOrStatement(statement.init, scope);
        break;
      case 'AssignmentStatement':
      case 'TupleAssignment':
        visitExpressionOrStatement(statement.right, scope);
        break;
      case 'ExpressionStatement':
        visitExpression(statement.expression, scope);
        break;
      case 'MultiExpressionStatement':
        for (const expression of statement.expressions) visitExpression(expression, scope);
        break;
      case 'IfStatement':
        visitExpression(statement.test, scope);
        for (const child of statement.consequent) visitStatement(child, 'local');
        if (statement.alternate) {
          if (Array.isArray(statement.alternate)) {
            for (const child of statement.alternate) visitStatement(child, 'local');
          } else {
            visitStatement(statement.alternate, 'local');
          }
        }
        break;
      case 'OnceStatement':
        if (statement.test) visitExpression(statement.test, scope);
        for (const child of statement.body) visitStatement(child, 'local');
        break;
      case 'ForStatement':
        if (statement.kind === 'numeric') {
          visitExpression(statement.start, scope);
          visitExpression(statement.end, scope);
          if (statement.step) visitExpression(statement.step, scope);
        } else {
          visitExpression(statement.iterable, scope);
        }
        for (const child of statement.body) visitStatement(child, 'local');
        break;
      case 'WhileStatement':
        visitExpression(statement.test, scope);
        for (const child of statement.body) visitStatement(child, 'local');
        break;
      case 'FunctionDeclaration':
        if (Array.isArray(statement.body)) {
          for (const child of statement.body) visitStatement(child, 'local');
        } else {
          visitExpression(statement.body, 'local');
        }
        break;
      case 'MultiDeclaration':
        for (const declaration of statement.declarations) visitStatement(declaration, scope);
        break;
      case 'MultiAssignment':
        for (const assignment of statement.assignments) visitStatement(assignment, scope);
        break;
      case 'IndicatorDeclaration':
      case 'LibraryDeclaration':
      case 'ImportDeclaration':
      case 'TypeDeclaration':
      case 'EnumDeclaration':
      case 'BreakStatement':
      case 'ContinueStatement':
        break;
    }
  };

  const visitExpressionOrStatement = (node: Expression | Statement, scope: 'global' | 'local'): void => {
    if (node.type === 'IfStatement' || node.type === 'ForStatement' || node.type === 'WhileStatement') {
      visitStatement(node as Statement, 'local');
    } else {
      visitExpression(node as Expression, scope);
    }
  };

  const visitExpression = (expression: Expression, scope: 'global' | 'local'): void => {
    if (expression.type === 'CallExpression') {
      const name = callName(expression);
      if (name && OUTPUT_CALL_NAMES.has(name)) {
        calls.push({
          kind: name,
          line: expression.loc?.start.line,
          column: expression.loc?.start.column,
          scope,
        });
      }
      for (const arg of expression.arguments) visitExpression(arg.value, scope);
      visitExpression(expression.callee, scope);
      return;
    }

    if (expression.type === 'BinaryExpression') {
      visitExpression(expression.left, scope);
      visitExpression(expression.right, scope);
      return;
    }
    if (expression.type === 'UnaryExpression') {
      visitExpression(expression.argument, scope);
      return;
    }
    if (expression.type === 'ConditionalExpression') {
      visitExpression(expression.test, scope);
      visitExpression(expression.consequent, scope);
      visitExpression(expression.alternate, scope);
      return;
    }
    if (expression.type === 'SwitchExpression') {
      if (expression.discriminant) visitExpression(expression.discriminant, scope);
      for (const switchCase of expression.cases) {
        if (switchCase.test) visitExpression(switchCase.test, scope);
        if (Array.isArray(switchCase.consequent)) {
          for (const child of switchCase.consequent) visitStatement(child, 'local');
        } else {
          visitExpression(switchCase.consequent, scope);
        }
      }
      return;
    }
    if (expression.type === 'IndexExpression') {
      visitExpression(expression.object, scope);
      visitExpression(expression.index, scope);
      return;
    }
    if (expression.type === 'MemberExpression') {
      visitExpression(expression.object, scope);
      return;
    }
    if (expression.type === 'ArrayExpression') {
      for (const element of expression.elements) visitExpression(element, scope);
      return;
    }
    if (expression.type === 'LambdaExpression') {
      visitExpression(expression.body, 'local');
      return;
    }
    if (expression.type === 'ForStatement' || expression.type === 'WhileStatement') {
      visitStatement(expression, 'local');
    }
  };

  for (const statement of ast.body) visitStatement(statement, 'global');
  return calls;
}

function callName(expression: CallExpression): string | undefined {
  return memberChainName(expression.callee) ?? (expression.callee.type === 'Identifier' ? expression.callee.name : undefined);
}

function memberChainName(expression: Expression): string | undefined {
  if (expression.type === 'Identifier') return expression.name;
  if (expression.type !== 'MemberExpression') return undefined;
  const objectName = memberChainName(expression.object);
  return objectName ? `${objectName}.${expression.property.name}` : undefined;
}

async function readManifest(inputDir: string): Promise<ExternalCorpusManifest | null> {
  try {
    const manifest = JSON.parse(await readFile(join(inputDir, 'manifest.json'), 'utf8')) as ExternalCorpusManifest;
    if (!Array.isArray(manifest.scripts)) throw new Error('manifest.scripts must be an array');
    return manifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function discoverScripts(inputDir: string): Promise<ExternalCorpusManifestScript[]> {
  const files = await walkFiles(inputDir);
  return files
    .filter((path) => SUPPORTED_EXTENSIONS.has(extname(path).toLowerCase()))
    .map((path) => ({ localPath: relative(inputDir, path) }));
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      files.push(...await walkFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

function detectPineVersion(source: string): number | 'unknown' {
  const match = source.match(/\/\/\s*@version\s*=\s*(\d+)/i);
  return match ? Number(match[1]) : 'unknown';
}

function detectDeclarationKind(source: string): ExternalCorpusReportRow['declarationKind'] {
  const match = source.match(/^\s*(indicator|strategy|library|study)\s*\(/im);
  return (match?.[1]?.toLowerCase() as ExternalCorpusReportRow['declarationKind'] | undefined) ?? 'unknown';
}

function formatSemanticDiagnostic(diagnostic: { code: string; message: string; line?: number; column?: number }): string {
  const location = diagnostic.line === undefined ? '' : `${diagnostic.line}:${diagnostic.column ?? 1}: `;
  return `${location}${diagnostic.code}: ${diagnostic.message}`;
}

function formatExecutionError(error: ExecutionError): string {
  const location = error.line === undefined ? '' : `${error.line}:${error.column ?? 1}: `;
  return `${location}${error.code ? `${error.code}: ` : ''}${error.message}`;
}

function formatThrownDiagnostic(error: unknown): string {
  if (error instanceof TealscriptParseError) {
    return `${error.location.start.line}:${error.location.start.column}: ${error.message}`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

function classifyExternalCorpusValidity(row: Omit<ExternalCorpusReportRow, 'validity'>): ExternalCorpusReportRow['validity'] {
  if (!row.firstFailedStage) {
    return { bucket: 'supported', reason: 'Pipeline reached visible output.' };
  }

  const diagnostic = row.stages[row.firstFailedStage].diagnostic ?? '';
  const cause = normalizeFailureCause(row.firstFailedStage, diagnostic);

  if (row.firstFailedStage === 'output') {
    if (row.outputSilence?.bucket === 'corpus-input-gap') {
      return {
        bucket: 'corpus-input-gap',
        reason: row.outputSilence.reason,
      };
    }
    const dataGated = classifyDataGatedOutputRow(row);
    if (dataGated) return dataGated;
    if (row.outputSilence?.bucket === 'correct-silence') {
      return {
        bucket: 'supported',
        reason: row.outputSilence.reason,
      };
    }
    if (row.outputSilence?.bucket === 'undecided') {
      return {
        bucket: 'tealscript-gap',
        reason: row.outputSilence.reason,
      };
    }
    return {
      bucket: 'tealscript-gap',
      reason: row.outputSilence?.reason
        ?? 'Script executed without visible plots, drawings, alerts, or logs; draw-intent cohort is intentionally left for T79.',
    };
  }

  if (row.firstFailedStage === 'parse') {
    return classifyParseValidity(row, diagnostic);
  }

  if (row.firstFailedStage === 'semantic') {
    if (cause === 'duplicate-argument') {
      return {
        bucket: 'invalid-pine',
        reason: 'TradingView rejects calls where one formal parameter is bound twice by positional/named or duplicate named arguments.',
      };
    }
    if (cause === 'duplicate-symbol') {
      return {
        bucket: 'invalid-pine',
        reason: 'TradingView rejects duplicate declarations in the same scope.',
      };
    }
    if (row.localPath === 'sources/0317-kaigouthro_Pine-Script-VS-Code-themes_sytax-types.pine') {
      return {
        bucket: 'corpus-hygiene',
        reason: 'Syntax-highlighting sample embeds imaginary exported library declarations inside an indicator, not a standalone runnable Pine script.',
      };
    }
    if (row.localPath === 'sources/0175-hasnocool_tradingview-pine-scripts-DRM_Strategy.pine') {
      return {
        bucket: 'invalid-pine',
        reason: 'The source passes a series-derived dynamic length through rsiFun()/rmaFun() into ta.sma(); Pine requires a simple int length for this built-in path.',
      };
    }
    if (diagnostic.includes('plot linewidth must be a positive integer')) {
      return {
        bucket: 'invalid-pine',
        reason: 'plot() linewidth is constrained to positive integer values; zero and fractional values are invalid.',
      };
    }
    if (diagnostic.includes('condition must be a boolean') && Number(row.declaredVersion) >= 5) {
      return {
        bucket: 'invalid-pine',
        reason: 'Pine v5+ requires boolean conditions for TA condition parameters; numeric truthiness is legacy-only.',
      };
    }
    if (cause === 'implicit-numeric-bool' && Number(row.declaredVersion) >= 6) {
      return {
        bucket: 'invalid-pine',
        reason: 'Pine v6 no longer implicitly casts int or float expressions to bool; use bool(...) or an explicit comparison.',
      };
    }
    if (cause === 'unresolved-import') {
      const importPath = diagnostic.match(/Import '([^']+)'/)?.[1];
      const parsedImport = importPath ? parseTradingViewImportPath(importPath) : undefined;
      if (parsedImport && parsedImport.owner !== 'TradingView') {
        return {
          bucket: 'unsupported-by-design',
          reason: `Third-party TradingView import ${parsedImport.owner}/${parsedImport.library}/${parsedImport.version} is permanently unsupported: Pine library source is not network-resolvable outside TradingView closed runtime, so there is no fetcher or resolver for TealScript to build.`,
        };
      }
      return {
        bucket: diagnostic.includes('Official TradingView library') ? 'tealscript-gap' : 'host-dependency-gap',
        reason: diagnostic.includes('Official TradingView library')
          ? 'The source imports an official TradingView standard library version whose documented builtin surface is not implemented by TealScript yet.'
          : 'The source imports a host-provided Tealstreet library that was not available to the corpus host; valid Pine cannot run until the product supplies that Tealstreet library source.',
      };
    }
    if (cause === 'unsupported-feature' && diagnostic.includes('unsupported by design') && diagnostic.includes('TradingView library source is not network-resolvable')) {
      return {
        bucket: 'unsupported-by-design',
        reason: 'Third-party TradingView library imports are permanently unsupported: Pine library source is not network-resolvable outside TradingView closed runtime, so there is no fetcher or resolver for TealScript to build.',
      };
    }
    if (diagnostic.includes('input.int defval must be an integer')) {
      return {
        bucket: 'tealscript-gap',
        reason: 'A legacy generic input declares integer type with a float default; not proven invalid Pine, so this remains counted as a TealScript compatibility gap.',
      };
    }
    if (diagnostic.includes('Cannot assign float value to int variable')) {
      return {
        bucket: 'invalid-pine',
        reason: 'Pine does not implicitly cast float expressions to int variables; scripts must use int() or another explicit integer expression.',
      };
    }
    if (diagnostic.includes('Cannot assign int value to bool variable')) {
      return {
        bucket: 'invalid-pine',
        reason: 'Pine v6 bool variables accept bool values only; numeric-to-bool conversion must be explicit.',
      };
    }
    if (diagnostic.includes('input.bool defval must be a boolean')) {
      return {
        bucket: 'invalid-pine',
        reason: 'input.bool() default values must be boolean; use generic input() for legacy numeric inputs or true/false for bool inputs.',
      };
    }
    if (diagnostic.includes('strategy.exit trailing stop requires trail_offset')) {
      return {
        bucket: 'invalid-pine',
        reason: 'Pine trailing-stop exits require trail_offset together with trail_price or trail_points.',
      };
    }
    if (cause === 'invalid-na-comparison') {
      return {
        bucket: 'invalid-pine',
        reason: 'Pine scripts must test na values with na(value) rather than direct comparison to na.',
      };
    }
    if (diagnostic.includes("Unknown argument 'linewidth' for color.new()")) {
      return {
        bucket: 'invalid-pine',
        reason: 'color.new() accepts color and transp only; linewidth belongs to plot/drawing calls, not color construction.',
      };
    }
    if (diagnostic.includes("Unknown argument 'text_area' for input.string()")) {
      return {
        bucket: 'invalid-pine',
        reason: 'Pine text-area inputs use input.text_area(); input.string() has no text_area argument.',
      };
    }
    if (diagnostic.includes("Unknown argument 'options' for input.session()")) {
      return {
        bucket: 'invalid-pine',
        reason: 'input.session() accepts a session string and UI metadata; documented option lists belong to input.string/int/float/timeframe/enum inputs, not session inputs.',
      };
    }
    if (diagnostic.includes("Unknown argument 'textalign' for plotshape()")) {
      return {
        bucket: 'invalid-pine',
        reason: 'plotshape() supports static text but no textalign argument; text alignment is a label/table text property.',
      };
    }
    if (row.localPath === 'sources/0189-TradersPost_pinescript-agents-projects_market-structure-sd-strategy.pine') {
      return {
        bucket: 'invalid-pine',
        reason: 'The source uses longSignal/shortSignal in global plotshape() calls before declaring them; Pine does not hoist variable declarations.',
      };
    }
    if (row.localPath === 'sources/0252-f-cksociety_backtesting-trading-engine-pinecoders-signal-ext_fg-cycle-wip.pine') {
      return {
        bucket: 'invalid-pine',
        reason: 'The source assigns bare Fear/Greed identifiers; only matching string literals appear elsewhere in the script.',
      };
    }
    if (row.localPath === 'sources/0416-TraderOracle_TradingView-HulkScanner.pine') {
      return {
        bucket: 'corpus-hygiene',
        reason: 'The harvested source references dSR after the only dSR declaration was commented out, leaving an incomplete script fragment.',
      };
    }
    if (row.localPath === 'sources/0420-TraderOracle_TradingView-KillpipsZones.pine') {
      return {
        bucket: 'corpus-hygiene',
        reason: 'The harvested source references startBarIndex but contains no declaration for it, so the corpus row is an incomplete script fragment.',
      };
    }
    if (row.localPath === 'sources/0409-Tomas-Cyberia_EMA-Indicator-Main_Indicator.pine') {
      return {
        bucket: 'invalid-pine',
        reason: 'The v5 source references bare tr without declaring it; true range is ta.tr in namespaced Pine versions.',
      };
    }
    if (row.localPath === 'sources/0432-TraderOracle_TradingView-Nebula.pine') {
      return {
        bucket: 'invalid-pine',
        reason: 'The source references BnoShw without declaring it; Pine identifiers are case-sensitive and no matching symbol exists.',
      };
    }
    if (row.localPath === 'sources/0435-TradersPost_pinescript-agents-examples_advanced_smart-money-concepts-suite.pine') {
      return {
        bucket: 'invalid-pine',
        reason: 'The source uses a JavaScript-style return statement inside a UDF; Pine functions return the last expression and do not support bare return.',
      };
    }
    if (diagnostic.includes('Invalid box.new text_valign')) {
      return {
        bucket: 'tealscript-gap',
        reason: 'Text vertical-alignment compatibility is not proven invalid Pine, so this remains counted as a TealScript compatibility gap.',
      };
    }
    if (
      row.localPath === 'sources/0058-ictmentality-pinescript-indicators-other_HTF_Key_Level_HTF_Key_Level_Engine_JAW_SwingHL_FVG_v2_dbgFVG_noDays_keep0-200.txt'
      && cause === 'unknown-assignment-target'
    ) {
      return {
        bucket: 'invalid-pine',
        reason: 'The source overindents an if local block by an extra four spaces; Pine local blocks must begin one four-space indent or one tab under the header.',
      };
    }
    return {
      bucket: 'tealscript-gap',
      reason: `Semantic failure is not proven invalid Pine: ${cause}.`,
    };
  }

  if (row.firstFailedStage === 'execute') {
    if (diagnostic.includes('session.ismarket requires exchange session classification')) {
      return {
        bucket: 'host-dependency-gap',
        reason: 'session.ismarket needs host-supplied exchange session classification for the chart symbol and bar timestamp; the corpus host does not provide exchange calendars yet.',
      };
    }
    if (
      row.localPath === 'sources/0245-Dhinesh1211_POC-POC.pine'
      && diagnostic.includes('request.security_lower_tf requires a lower timeframe than the chart timeframe')
    ) {
      return {
        bucket: 'corpus-input-gap',
        reason: 'The script requests 60m intrabars with request.security_lower_tf(); Pine defines the function for lower-timeframe intrabars only, so the corpus 60m chart timeframe is an invalid fixture for this script rather than an engine defect.',
      };
    }
    if (
      row.localPath === 'sources/0269-gorx1_TradingView-hades.pine'
      && diagnostic.includes('input.int defval must be less than or equal to maxval')
    ) {
      return {
        bucket: 'tealscript-gap',
        reason: 'Untyped generic input() with numeric defval and UI metadata was misclassified as typed input.int range metadata; Pine v6 documents generic input(defval, title, tooltip, inline, group, display, active).',
      };
    }
    if (
      row.localPath === 'sources/0401-supertonka_tradingview-ict-indicator-combined_indicator.pine'
      && diagnostic.includes('Array index 0 is out of bounds. Array size is 0')
    ) {
      return {
        bucket: 'invalid-pine',
        reason: 'The source runs an inclusive 0-to-0 loop when the order-block array is empty, then reads index 0; Pine arrays throw for indexes outside 0..size-1.',
      };
    }
    if (
      (row.localPath === 'sources/0413-TraderOracle_TradingView-GexBot.pine'
        || row.localPath === 'sources/0426-TraderOracle_TradingView-McGrawPlaybook.pine')
      && diagnostic.includes('Array index 1 is out of bounds. Array size is 1')
    ) {
      return {
        bucket: 'invalid-pine',
        reason: 'The script defaults input.text_area() to an empty string, splits it, then reads fields that are not present; Pine arrays throw for indexes outside 0..size-1.',
      };
    }
    if (diagnostic.includes('Too many unique request.* contexts')) {
      return {
        bucket: 'supported',
        reason: 'TradingView allows 40 unique request.* contexts by default and 64 on Ultimate plans; the corpus host uses the default 40-context limit.',
      };
    }
    if (diagnostic.includes('chart timeframe is above')) {
      return {
        bucket: 'supported',
        reason: 'The script intentionally calls runtime.error() when the chart timeframe violates its own configured guard.',
      };
    }
    if (
      row.localPath === 'sources/0023-Erald12-PinescriptIndicator-order_block.txt'
      && diagnostic.includes('Array index 0 is out of bounds. Array size is 0')
    ) {
      return {
        bucket: 'supported',
        reason: 'The script indexes bullish_ob[0] on barstate.islast when the order-block array is empty under the corpus bars; Pine arrays throw for indexes outside 0..size-1.',
      };
    }
  }

  return {
    bucket: 'tealscript-gap',
    reason: `Pipeline failed at ${row.firstFailedStage}.`,
  };
}

function classifyDataGatedOutputRow(row: Omit<ExternalCorpusReportRow, 'validity'>): ExternalCorpusReportRow['validity'] | null {
  const classifiableCauses = new Set([
    'conditional-or-data-gated-output-not-triggered',
    'global-output-declared-but-not-evaluated',
  ]);
  if (!row.outputSilence?.cause || !classifiableCauses.has(row.outputSilence.cause)) return null;
  switch (row.localPath) {
    case 'sources/0026-henryoliver-pinescript-indicators-fibonacci.pine':
      return {
        bucket: 'corpus-input-gap',
        reason: 'Fibonacci lines require two confirmed opposite pivots whose leg move clears the ATR-scaled deviation threshold; the smooth synthetic series never forms qualifying anchors.',
      };
    case 'sources/0045-ictmentality-pinescript-indicators-other_FVG_Indicator.txt':
      return {
        bucket: 'corpus-input-gap',
        reason: 'Fair-value-gap boxes require low[1] > high[3] or high[1] < low[3] inside the recent NY session window; the synthetic OHLC series is continuous and overlapping, so no gap forms.',
      };
    case 'sources/0060-ictmentality-pinescript-indicators-other_QT_Indicator_QTIndicator.txt':
    case 'sources/0062-ictmentality-pinescript-indicators-other_QT_Indicator_Checkpoint.txt':
      return {
        bucket: 'corpus-input-gap',
        reason: 'Quarterly Theory drawings are gated by chart timeframe/cycle settings: daily runs only on 15m/30m, m90 only on 5m, micro on 1m-3m or 30s-59s, nano on 5s-29s, and weekly is disabled by default. The corpus executes a single default 60m runtime with 1-minute synthetic timestamps, so no live cycle is enabled.',
      };
    case 'sources/0070-ictmentality-pinescript-indicators-other_TTFM_TTFM_no_import_fixed_alert_and_shadowing.txt':
    case 'sources/0071-ictmentality-pinescript-indicators-other_TTFM_TTFM_no_import_fixed_shadowing.txt':
    case 'sources/0072-ictmentality-pinescript-indicators-other_TTFM_TTFM_no_import_no_warnings_v2.txt':
    case 'sources/0073-ictmentality-pinescript-indicators-other_TTFM_TTFM_no_import_no_warnings.txt':
    case 'sources/0074-ictmentality-pinescript-indicators-other_TTFM_TTFM_no_import.txt':
      return {
        bucket: 'corpus-input-gap',
        reason: 'TTFM output is gated behind higher-timeframe candle creation, T-spot/sweep confirmation, or a last-1000-bars display window. With the corpus default 60m runtime but 1-minute synthetic timestamps, the 160-bar and extended probes do not span enough realistic higher-timeframe sessions to create the required HTF candle set.',
      };
    case 'sources/0088-razorbladekisses-Tradingview-Indicators-indicators_Institutional_Supply_Demand_Zones':
      return {
        bucket: 'corpus-input-gap',
        reason: 'Supply/demand boxes require a red/green reversal candle whose body is at least 1.8x the previous body and passes the enabled timeframe gate; the low-volatility synthetic sequence never creates the required impulse candle.',
      };
    case 'sources/0089-razorbladekisses-Tradingview-Indicators-indicators_Reversal_Pivot_Points':
      return {
        bucket: 'corpus-input-gap',
        reason: 'Pivot lines require request.security pivothigh/pivotlow values on the selected 15m timeframe with gaps_on; the smooth synthetic request series never emits a non-na pivot level to draw.',
      };
    case 'sources/0145-Ahmed-GoCode-Quant-Edge-Indicators-Quant-Edge-Indicators_RSI_Momentum_Double_RSI_Strategy.pinescript':
      return {
        bucket: 'supported',
        reason: 'The strategy has no visual outputs and only submits orders when higher/lower timeframe RSI crossover conditions fire; the synthetic request series never triggers an entry or exit, so empty chart output is correct for this data.',
      };
    case 'sources/0182-pineforge-4pass_pineforge-engine-tutorial_mtf_strategy_ltf.pine':
      return {
        bucket: 'corpus-input-gap',
        reason: 'The strategy enters only when lower-timeframe intrabar range exceeds the configured threshold and the chart bar closes bullish; a targeted lower-timeframe fixture proves the request array and strategy entry path emit, while the corpus synthetic request feed stays too smooth.',
      };
    case 'sources/0183-Tim1l_PineCryptoStrategies-strategy1.pine':
      return {
        bucket: 'corpus-input-gap',
        reason: 'The strategy enters only when its fixed H4 momentum state equals 4 and the 15m RSI crosses below the H4 RSI; a targeted crossover fixture proves the strategy order path emits, while the corpus bars do not form that multi-timeframe crossover.',
      };
    case 'sources/0201-Alorse_pinescript-strategies-multi_Multi_MTF_MACD.pine':
      return {
        bucket: 'corpus-input-gap',
        reason: 'Alerts are gated by MACD divergence plus EMA trend filters in requested-symbol data; a targeted divergence/alert fixture proves local alert output emits, while the smooth corpus request series forms no qualifying divergence.',
      };
    case 'sources/0202-Alorse_pinescript-strategies-multi_Multi_Supertrend.pine':
      return {
        bucket: 'corpus-input-gap',
        reason: 'Alerts and labels are gated by a Supertrend direction flip; a targeted trend-flip fixture proves both alert and label output emit, while the corpus bars never flip the trend.',
      };
    case 'sources/0204-Alorse_pinescript-strategies-strategies_MTF_RSI.pine':
      return {
        bucket: 'corpus-input-gap',
        reason: 'The strategy enters only when price is above its moving average while RSI is oversold; a targeted RSI fixture proves strategy ledger output emits, while the corpus bars do not satisfy that conjunction.',
      };
    case 'sources/0232-dcaoyuan_vibetrader-public_indicators_dynpivot.pine':
      return {
        bucket: 'corpus-input-gap',
        reason: 'Dynamic pivot lines require confirmed ta.pivothigh()/ta.pivotlow() values; a targeted swing fixture proves line output emits, while the smooth corpus series does not form the required pivots.',
      };
    case 'sources/0241-deepentropy_lightweight-charts-indicators-docs_official_indicators_community_Fair_Value_Gap.pine':
      return {
        bucket: 'corpus-input-gap',
        reason: 'Fair-value-gap boxes require a true gap between the current bar and the bar two bars back; a targeted gap fixture proves box output emits, while the corpus OHLC series overlaps continuously.',
      };
    case 'sources/0262-geraked_tradingview-strategies_BBRSI.pine':
      return {
        bucket: 'corpus-input-gap',
        reason: 'The strategy enters only after RSI recovers from an oversold Bollinger-band break or reverses from an overbought break; a targeted BB/RSI fixture proves order output emits, while the corpus bars do not make the two-step reversal.',
      };
    case 'sources/0285-harryguiacorn_TradingView-Proprietary-Indicators-STRG-HOLP.pine':
      return {
        bucket: 'corpus-input-gap',
        reason: 'HOLP/LOHP orders require a fresh lookback low/high followed by a breakout back through the lookback bar; a targeted breakout fixture proves strategy output emits, while the corpus bars do not form that sequence.',
      };
    case 'sources/0303-iamhuraira_trading-view-script-FVG_Indicator.pine':
      return {
        bucket: 'corpus-input-gap',
        reason: 'FVG boxes require low > high[2] or high < low[2] inside the lookback window; a targeted gap fixture proves box output emits, while the corpus OHLC series is continuous.',
      };
    case 'sources/0398-sonnyparlin_fvg_pinescript-fvg.pine':
      return {
        bucket: 'corpus-input-gap',
        reason: 'FVG boxes require a gap larger than the ATR-derived minimum and aligned with the EMA trend filter; a targeted gap-and-trend fixture proves box output emits, while the corpus bars do not clear the filter.',
      };
    case 'sources/0434-TraderOracle_TradingView-Pivot_Order_Blocks.pine':
      return {
        bucket: 'corpus-input-gap',
        reason: 'Pivot order-block boxes require confirmed pivot highs or lows after the configured left/right lookback window; a targeted pivot fixture proves box output emits, while the corpus bars do not produce qualifying pivots.',
      };
    default:
      return null;
  }
}

function classifyParseValidity(row: Omit<ExternalCorpusReportRow, 'validity'>, diagnostic: string): ExternalCorpusReportRow['validity'] {
  if (row.sourceFilePath === '.cursor/rules/10 - pinescript-management.md') {
    return {
      bucket: 'corpus-hygiene',
      reason: 'Scraped file is a Markdown development guide containing Pine examples, not a standalone Pine script.',
    };
  }
  if (row.sourceFilePath === 'strategies/bb.sh.pine') {
    return {
      bucket: 'corpus-hygiene',
      reason: 'Scraped file is a shell heredoc template with environment interpolation, not standalone Pine source.',
    };
  }
  if (row.sourceFilePath === 'study-dynamic-variable-alert.pine') {
    return {
      bucket: 'corpus-hygiene',
      reason: 'Scraped file is a Telegram/PineCoders note that embeds a Pine example inside prose, not a standalone Pine script.',
    };
  }
  if (row.sourceFilePath === 'themes/syntaxCheck.pine') {
    return {
      bucket: 'corpus-hygiene',
      reason: 'Scraped file is a Pine syntax-highlighting token sample, not a standalone Pine script.',
    };
  }
  if (row.id.startsWith('0166:')) {
    return {
      bucket: 'invalid-pine',
      reason: 'String literals cannot contain a raw line break before the closing quote; multiline text must use escaped newlines or concatenation.',
    };
  }
  if (diagnostic.includes('but "\\" found') && row.sourceFilePath === 'options-gex-levels.pine') {
    return {
      bucket: 'invalid-pine',
      reason: 'Pine string literals use single or double quotes; triple-quoted string literals are not Pine syntax.',
    };
  }
  if (row.id.startsWith('0126:')) {
    return {
      bucket: 'invalid-pine',
      reason: 'Pine conditional expressions require both ? and : arms; this source has a colonless multi-line ternary.',
    };
  }
  if (row.id.startsWith('0227:')) {
    return {
      bucket: 'invalid-pine',
      reason: 'String literals cannot contain raw line breaks before the closing quote; this source has an unterminated tooltip string.',
    };
  }
  if (row.id.startsWith('0229:')) {
    return {
      bucket: 'invalid-pine',
      reason: 'The source is truncated at a plot expression and starts a statement with a bare comparison tail.',
    };
  }
  if (row.id.startsWith('0257:')) {
    return {
      bucket: 'invalid-pine',
      reason: 'The source contains a corrupted identifier with an apostrophe inside a variable name, which Pine parses as a string delimiter.',
    };
  }
  if (row.id.startsWith('0295:')) {
    return {
      bucket: 'invalid-pine',
      reason: 'String literals cannot span raw line breaks; multiline literal text must be represented with supported Pine string syntax.',
    };
  }
  if (row.id.startsWith('0329:')) {
    return {
      bucket: 'invalid-pine',
      reason: 'Pine named arguments use identifier= syntax; plot.style=plot.style_dashed is not a valid call argument name.',
    };
  }
  if (row.id.startsWith('0147:')) {
    return {
      bucket: 'invalid-pine',
      reason: 'Pine identifiers are limited to ASCII letters, digits, and underscores; this source uses a non-ASCII identifier character.',
    };
  }
  if (row.id.startsWith('0410:')) {
    return {
      bucket: 'invalid-pine',
      reason: 'The source contains a malformed assignment that starts with title= options without an input.* call.',
    };
  }
  if (['0047:', '0048:', '0049:', '0053:'].some((prefix) => row.id.startsWith(prefix))) {
    return {
      bucket: 'invalid-pine',
      reason: 'Pine local blocks require consistent indentation; this scraped source contains a dedented/overindented local if block inside an active statement body.',
    };
  }
  return {
    bucket: 'tealscript-gap',
    reason: 'Parse failure is not proven invalid Pine or corpus hygiene, so it remains counted as a TealScript parser gap.',
  };
}

function normalizeFailureCause(stage: ExternalCorpusPipelineStage, diagnostic: string): string {
  if (stage === 'semantic') {
    const codeMatch = diagnostic.match(/(?:^|\s)([a-z][a-z0-9-]+):/i);
    if (codeMatch) return codeMatch[1]!;
  }
  if (stage === 'parse') {
    if (diagnostic.includes('Expected')) return 'unexpected-token';
    if (diagnostic.includes('maximum')) return 'source-limit';
  }
  if (stage === 'compile') {
    const unsupportedMatch = diagnostic.match(/^([^;]+)/);
    return unsupportedMatch?.[1]?.trim() || 'compile-failure';
  }
  if (stage === 'execute') {
    if (diagnostic.includes('Too many unique request.* contexts')) return 'request-context-limit';
    if (diagnostic.includes('Array index') && diagnostic.includes('out of bounds')) return 'array-bounds-runtime-error';
    if (diagnostic.includes('chart timeframe is above')) return 'script-timeframe-runtime-guard';
    const codeMatch = diagnostic.match(/(?:^|\s)(runtime\.error|[a-z][a-z0-9_.-]+):/i);
    if (codeMatch) return codeMatch[1]!;
  }
  if (stage === 'output') {
    const silenceMatch = diagnostic.match(/^output-silence:([^:]+):/);
    if (silenceMatch) return silenceMatch[1]!;
  }
  return diagnostic.split('\n')[0]?.slice(0, 120) || 'unknown';
}

function countBy<T>(values: readonly T[], key: (value: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const name = key(value);
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function percent(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 10_000) / 100;
}

export function createSyntheticBars(count: number): Bar[] {
  const start = Date.UTC(2024, 0, 1);
  return Array.from({ length: count }, (_, index) => {
    const trend = 100 + index * 0.35;
    const wave = Math.sin(index / 5) * 2.5;
    const close = trend + wave;
    const open = close - Math.sin(index / 3);
    const high = Math.max(open, close) + 1.5 + (index % 4) * 0.15;
    const low = Math.min(open, close) - 1.25 - (index % 3) * 0.1;
    return {
      time: start + index * 60_000,
      open,
      high,
      low,
      close,
      volume: 1_000 + index * 13,
    };
  });
}

function createOutputProbeBars(): Bar[] {
  return createSyntheticBars(2_880);
}

export class SyntheticExternalCorpusRequestDatafeed implements RequestDatafeed {
  constructor(private readonly chartBars: Bar[]) {}

  getBars(query: RequestDatafeedQuery): RequestDatafeedResult {
    return {
      ok: true,
      context: this.context(query.symbol, query.timeframe, query.calcBarsCount, query.currency),
    };
  }

  getSeries(query: RequestSeriesQuery): RequestSeriesResult {
    return {
      ok: true,
      context: {
        ...query,
        points: this.chartBars.map((bar, index) => ({ time: bar.time, value: 10 + index })),
      },
    };
  }

  getCurrencyRate(query: RequestCurrencyRateQuery): number {
    return query.baseCurrency === query.quoteCurrency ? 1 : 1.1;
  }

  getEconomicSeries(query: RequestEconomicSeriesQuery): number {
    return 100 + query.field.length + query.countryCode.length;
  }

  getCorporateAction(query: RequestCorporateActionQuery): RequestCorporateActionEvent {
    const value =
      query.kind === 'splits'
        ? { kind: 'splits' as const, numerator: 2, denominator: 1 }
        : query.kind === 'earnings'
          ? { kind: 'earnings' as const, actual: 1.25, estimate: 1.1, standardized: 1.2 }
          : { kind: 'dividends' as const, gross: 0.5, net: 0.45 };
    return {
      time: query.time,
      value,
    };
  }

  getFinancialMetric(query: RequestFinancialMetricQuery): { time: number; value: number } {
    return { time: query.time, value: 1_000 + query.financialId.length };
  }

  getQuandlSeries(query: RequestQuandlSeriesQuery): { time: number; value: number } {
    return { time: query.time, value: 50 + query.column };
  }

  getFootprint(query: RequestFootprintQuery): RequestFootprintData {
    return {
      time: query.time,
      rows: [{ upPrice: 101, downPrice: 100, totalVolume: 300, buyVolume: 180, sellVolume: 120 }],
      pointOfControl: 101,
      valueAreaHigh: 102,
      valueAreaLow: 99,
      totalVolume: 300,
      buyVolume: 180,
      sellVolume: 120,
    };
  }

  private context(symbol: string, timeframe: string, calcBarsCount?: number, currency?: string): RequestDataContext {
    const offset = stableSymbolOffset(symbol, timeframe);
    const bars = this.chartBars.slice(calcBarsCount === undefined ? 0 : Math.max(0, this.chartBars.length - calcBarsCount)).map((bar) => ({
      ...bar,
      open: bar.open + offset,
      high: bar.high + offset,
      low: bar.low + offset,
      close: bar.close + offset,
    }));
    return {
      symbol,
      timeframe,
      bars,
      currency: currency ?? 'USD',
      syminfo: {
        ticker: symbol,
        tickerid: symbol,
        main_tickerid: symbol,
        currency: currency ?? 'USD',
      },
    };
  }
}

function stableSymbolOffset(symbol: string, timeframe: string): number {
  let hash = 0;
  for (const char of `${symbol}:${timeframe}`) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return (hash % 500) / 100;
}

function parseArgs(args: string[]): RunExternalPineCorpusOptions {
  let inputDir = '';
  let outputPath: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === '--input') {
      inputDir = args[++index] ?? '';
    } else if (arg === '--output') {
      outputPath = args[++index];
    } else if (!arg.startsWith('-') && !inputDir) {
      inputDir = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!inputDir) {
    throw new Error('Usage: yarn workspace @tealstreet/tealscript pine:external-corpus --input /tmp/pine-corpus-v1 --output /tmp/pine-corpus-v1/report.json');
  }
  return { inputDir, outputPath };
}

async function main(): Promise<void> {
  const report = await runExternalPineCorpus(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
