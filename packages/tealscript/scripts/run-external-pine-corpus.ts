import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { checkProgram } from '../src/semantic/checker.ts';
import { parse, TealscriptParseError } from '../src/parser/parser.ts';
import type { CallExpression, Expression, Program, Statement } from '../src/parser/ast.ts';
import type { ExecutionError, ExecutionResult, RuntimeSwallowedErrorSummary, TealscriptEngineOptions } from '../src/runtime/engine.ts';
import { executeScript } from '../src/runtime/engine.ts';
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
import { executeClosure, tryCompileClosure } from '../src/runtime/closure/execute.ts';
import type { ClosureCompiledScript } from '../src/runtime/closure/execute.ts';

export const EXTERNAL_PINE_CORPUS_REPORT_SCHEMA_VERSION = 11;

export type ExternalCorpusPipelineStage = 'parse' | 'semantic' | 'compile' | 'execute' | 'output';
export type ExternalCorpusStageStatus = 'passed' | 'failed' | 'fallback' | 'not-run';
export type ExternalCorpusExecutionMode = 'compiled' | 'interpreter-fallback' | 'not-run';
export type ExternalCorpusValidityBucket = 'supported' | 'tealscript-gap' | 'host-dependency-gap' | 'invalid-pine' | 'corpus-hygiene' | 'undecided';
export type ExternalCorpusOutputSilenceBucket = 'tealscript-gap' | 'correct-silence' | 'undecided';
export type ExternalCorpusOutputParityStatus = 'matched' | 'mismatched' | 'not-run';
export type ExternalCorpusClosureAgreement =
  | 'all-three'
  | 'compiled-interpreter-only'
  | 'closure-interpreter-only'
  | 'closure-compiled-only'
  | 'three-way-mismatch'
  | 'closure-unsupported'
  | 'closure-not-run';
export type ExternalCorpusOutcome =
  | 'produced-output-compiled'
  | 'produced-output-interpreter-fallback'
  | 'no-output-compiled'
  | 'no-output-interpreter-fallback'
  | 'failed';

export interface ExternalCorpusManifestScript {
  localPath: string;
  sourceRepoUrl?: string;
  sourceFilePath?: string;
  commitSha?: string;
}

export interface ExternalCorpusManifest {
  scripts: ExternalCorpusManifestScript[];
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
  closure: ExternalCorpusClosureAnalysis;
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
  compiledAgainstInterpreter: ExternalCorpusStrategyLedgerParityAnalysis;
  closureAgainstInterpreter: ExternalCorpusStrategyLedgerParityAnalysis;
  closureAgainstCompiled: ExternalCorpusStrategyLedgerParityAnalysis;
}

export interface ExternalCorpusOutputSilenceAnalysis {
  bucket: ExternalCorpusOutputSilenceBucket;
  reason: string;
  sourceCalls: ExternalCorpusOutputCallTrace[];
  sameBarsInterpreterOutput: ExternalCorpusOutputCounts;
  probeBars: {
    count: number;
    firstTime: number;
    lastTime: number;
    compiledOutput: ExternalCorpusOutputCounts;
    interpreterOutput: ExternalCorpusOutputCounts;
    interpreterStrategy: ExternalCorpusStrategyActivity;
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
    interpreter: ExternalCorpusOutputCounts;
    compiled: ExternalCorpusOutputCounts;
  };
}

export interface ExternalCorpusClosureAnalysis {
  stages: Record<'compile' | 'execute' | 'output', ExternalCorpusStageResult>;
  unsupported: string[];
  output: ExternalCorpusOutputCounts;
  parityAgainstInterpreter: ExternalCorpusOutputParityAnalysis;
  parityAgainstCompiled: ExternalCorpusOutputParityAnalysis;
  agreement: ExternalCorpusClosureAgreement;
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
    allThreeMatched: number;
    compiledAgainstInterpreter: Record<string, number>;
    closureAgainstInterpreter: Record<string, number>;
    closureAgainstCompiled: Record<string, number>;
    currentlyPassingRowsWithLedgerMismatch: number;
    differenceKinds: Record<string, number>;
  };
  closure: {
    funnel: Record<'compile' | 'execute' | 'output', { count: number; percent: number }>;
    agreement: Record<string, number>;
    unsupportedCauses: Array<{
      cause: string;
      count: number;
      representativeScript: string;
      representativeDiagnostic: string;
    }>;
    parityAgainstInterpreter: Record<string, number>;
    parityAgainstCompiled: Record<string, number>;
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

interface ClosureCompileProbe {
  compiled: ClosureCompiledScript | null;
  stages: Record<'compile' | 'execute' | 'output', ExternalCorpusStageResult>;
  unsupported: string[];
}

interface ClosureAnalysisRun {
  analysis: ExternalCorpusClosureAnalysis;
  result: ExecutionResult | null;
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
  const achievableRows = rows.filter((row) => row.validity.bucket !== 'invalid-pine' && row.validity.bucket !== 'corpus-hygiene');
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
    closure: summarizeClosure(rows),
    compiledBarErrors: summarizeCompiledBarErrors(rows),
    swallowedErrors: summarizeSwallowedErrors(rows),
    executionModes: countBy(rows, (row) => row.executionMode),
    outcomes: countBy(rows, (row) => row.outcome),
    failureCauses: [...failureCauseMap.values()].sort((left, right) => right.count - left.count || left.cause.localeCompare(right.cause)),
  };
}

function summarizeClosure(rows: ExternalCorpusReportRow[]): ExternalCorpusReportSummary['closure'] {
  const closureStages = ['compile', 'execute', 'output'] as const;
  const unsupported = new Map<string, {
    cause: string;
    count: number;
    representativeScript: string;
    representativeDiagnostic: string;
  }>();

  for (const row of rows) {
    if (row.closure.stages.compile.status !== 'failed') continue;
    const diagnostic = row.closure.stages.compile.diagnostic ?? row.closure.unsupported[0] ?? 'unknown closure unsupported';
    const cause = normalizeClosureUnsupportedCause(diagnostic);
    const existing = unsupported.get(cause);
    if (existing) {
      existing.count += 1;
    } else {
      unsupported.set(cause, {
        cause,
        count: 1,
        representativeScript: row.localPath,
        representativeDiagnostic: diagnostic,
      });
    }
  }

  return {
    funnel: Object.fromEntries(
      closureStages.map((stage) => {
        const count = rows.filter((row) => row.closure.stages[stage].status === 'passed').length;
        return [stage, { count, percent: percent(count, rows.length) }];
      }),
    ) as ExternalCorpusReportSummary['closure']['funnel'],
    agreement: countBy(rows, (row) => row.closure.agreement),
    unsupportedCauses: [...unsupported.values()].sort((left, right) => right.count - left.count || left.cause.localeCompare(right.cause)),
    parityAgainstInterpreter: countBy(rows, (row) => row.closure.parityAgainstInterpreter.status),
    parityAgainstCompiled: countBy(rows, (row) => row.closure.parityAgainstCompiled.status),
  };
}

function summarizeStrategyLedgerParity(rows: ExternalCorpusReportRow[]): ExternalCorpusReportSummary['strategyLedgerParity'] {
  const strategyRows = rows.filter((row) => row.declarationKind === 'strategy');
  const executableStrategies = strategyRows.filter(
    (row) => row.strategyLedgerParity.compiledAgainstInterpreter.status !== 'not-run'
      || row.strategyLedgerParity.closureAgainstInterpreter.status !== 'not-run'
      || row.strategyLedgerParity.closureAgainstCompiled.status !== 'not-run',
  );
  const activeStrategies = executableStrategies.filter((row) => {
    const compared =
      row.strategyLedgerParity.compiledAgainstInterpreter.comparedStrategy
      ?? row.strategyLedgerParity.closureAgainstInterpreter.comparedStrategy
      ?? row.strategyLedgerParity.closureAgainstCompiled.comparedStrategy;
    return compared?.expected.active || compared?.actual.active;
  });
  const allThreeMatched = executableStrategies.filter((row) => (
    row.strategyLedgerParity.compiledAgainstInterpreter.status === 'matched'
    && row.strategyLedgerParity.closureAgainstInterpreter.status === 'matched'
    && row.strategyLedgerParity.closureAgainstCompiled.status === 'matched'
  )).length;
  const currentlyPassingRowsWithLedgerMismatch = strategyRows.filter((row) => (
    row.outcome === 'produced-output-compiled'
    && (
      row.strategyLedgerParity.compiledAgainstInterpreter.status === 'mismatched'
      || row.strategyLedgerParity.closureAgainstInterpreter.status === 'mismatched'
      || row.strategyLedgerParity.closureAgainstCompiled.status === 'mismatched'
    )
  )).length;

  return {
    strategies: strategyRows.length,
    executableStrategies: executableStrategies.length,
    activeStrategies: activeStrategies.length,
    allThreeMatched,
    compiledAgainstInterpreter: countBy(strategyRows, (row) => row.strategyLedgerParity.compiledAgainstInterpreter.status),
    closureAgainstInterpreter: countBy(strategyRows, (row) => row.strategyLedgerParity.closureAgainstInterpreter.status),
    closureAgainstCompiled: countBy(strategyRows, (row) => row.strategyLedgerParity.closureAgainstCompiled.status),
    currentlyPassingRowsWithLedgerMismatch,
    differenceKinds: countBy(
      strategyRows.flatMap((row) => [
        row.strategyLedgerParity.compiledAgainstInterpreter,
        row.strategyLedgerParity.closureAgainstInterpreter,
        row.strategyLedgerParity.closureAgainstCompiled,
      ]).filter((analysis) => analysis.status === 'mismatched'),
      (analysis) => analysis.firstDifference?.kind ?? 'unclassified',
    ),
  };
}

function buildStrategyLedgerParity(
  declarationKind: ExternalCorpusReportRow['declarationKind'],
  interpreter: ExecutionResult | null,
  compiled: ExecutionResult | null,
  closure: ExecutionResult | null,
): ExternalCorpusStrategyLedgerParity {
  if (declarationKind !== 'strategy' || !interpreter) return strategyLedgerParityNotRun();
  return {
    compiledAgainstInterpreter: compiled
      ? compareStrategyLedger(compiled, interpreter, 'Compiled', 'interpreter')
      : { status: 'not-run' },
    closureAgainstInterpreter: closure
      ? compareStrategyLedger(closure, interpreter, 'Closure', 'interpreter')
      : { status: 'not-run' },
    closureAgainstCompiled: closure && compiled
      ? compareStrategyLedger(closure, compiled, 'Closure', 'compiled')
      : { status: 'not-run' },
  };
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

  const closureCompile = runClosureCompile(ast);
  let compiled: CompiledScript | null = null;
  const fallbackReasons: string[] = [];
  try {
    compiled = tryCompile(ast);
    if (compiled.success) {
      stages.compile = { status: 'passed' };
    } else {
      fallbackReasons.push(...compiled.unsupported);
      stages.compile = { status: 'fallback', diagnostic: compiled.unsupported.join('; ') || 'compiled backend did not support script' };
    }
  } catch (error) {
    stages.compile = { status: 'failed', diagnostic: formatThrownDiagnostic(error) };
    return classifyRow(failedRow(base, stages, 'compile'));
  }

  const engineOptions: TealscriptEngineOptions = { requestDatafeed };
  let result: ExecutionResult;
  let interpreterResult: ExecutionResult | null = null;
  let compiledResultForParity: ExecutionResult | null = null;
  let executionMode: ExternalCorpusExecutionMode = 'not-run';
  try {
    if (compiled?.success) {
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
    } else {
      result = executeScript(ast, bars, undefined, engineOptions);
      interpreterResult = result;
      executionMode = 'interpreter-fallback';
    }
  } catch (error) {
    stages.execute = { status: 'failed', diagnostic: formatThrownDiagnostic(error) };
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

  if (!interpreterResult) {
    interpreterResult = executeScript(ast, bars, undefined, engineOptions);
  }
  const closureRun = runClosureAnalysis(closureCompile, bars, engineOptions, interpreterResult, compiledResultForParity);
  const closure = closureRun.analysis;
  const strategyLedgerParity = buildStrategyLedgerParity(
    base.declarationKind,
    interpreterResult,
    compiledResultForParity,
    closureRun.result,
  );

  const outputParity = compiled?.success && executionMode === 'compiled'
    ? compareExecutionOutput(result, interpreterResult, 'Compiled', 'interpreter')
    : { status: 'not-run' as const };
  if (outputParity.status === 'mismatched') {
    stages.execute = { status: 'failed', diagnostic: outputParity.diagnostic };
    return classifyRow({
      ...base,
      firstFailedStage: 'execute',
      outcome: 'failed',
      executionMode,
      fallbackReasons,
      compiledBarErrors,
      swallowedErrors,
      output: outputCountsForReport(result),
      closure,
      outputParity,
      strategyLedgerParity,
      outputSilence: undefined,
      stages,
    });
  }

  const output = outputCountsForReport(result);
  if (!output.produced) {
    const outputSilence = analyzeOutputSilence(ast, bars, requestDatafeed, compiled?.success ? compiled : null);
    stages.output = { status: 'failed', diagnostic: 'No plots, drawings, alerts, or logs were produced' };
    return classifyRow({
      ...base,
      firstFailedStage: 'output',
      outcome: executionMode === 'compiled' ? 'no-output-compiled' : 'no-output-interpreter-fallback',
      executionMode,
      fallbackReasons,
      compiledBarErrors,
      swallowedErrors,
      output,
      closure,
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
    outcome: executionMode === 'compiled' ? 'produced-output-compiled' : 'produced-output-interpreter-fallback',
    executionMode,
    fallbackReasons,
    compiledBarErrors,
    swallowedErrors,
    output,
    closure,
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
  base: Omit<ExternalCorpusReportRow, 'validity' | 'firstFailedStage' | 'outcome' | 'executionMode' | 'fallbackReasons' | 'output' | 'closure' | 'outputParity' | 'strategyLedgerParity' | 'stages'>,
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
    closure: closureNotRun(),
    outputParity: { status: 'not-run' },
    strategyLedgerParity: strategyLedgerParityNotRun(),
    outputSilence: undefined,
    stages,
  };
}

function closureNotRun(): ExternalCorpusClosureAnalysis {
  return {
    stages: {
      compile: { status: 'not-run' },
      execute: { status: 'not-run' },
      output: { status: 'not-run' },
    },
    unsupported: [],
    output: outputCounts(null),
    parityAgainstInterpreter: { status: 'not-run' },
    parityAgainstCompiled: { status: 'not-run' },
    agreement: 'closure-not-run',
  };
}

function strategyLedgerParityNotRun(): ExternalCorpusStrategyLedgerParity {
  return {
    compiledAgainstInterpreter: { status: 'not-run' },
    closureAgainstInterpreter: { status: 'not-run' },
    closureAgainstCompiled: { status: 'not-run' },
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
): ExternalCorpusOutputSilenceAnalysis {
  const sourceCalls = collectOutputCallTraces(ast);
  const sameBarsInterpreter = executeScript(ast, bars, undefined, { requestDatafeed });
  const probeBars = createOutputProbeBars();
  const probeRequestDatafeed = new SyntheticExternalCorpusRequestDatafeed(probeBars);
  const probeCompiled = compiled ? executeCompiled(compiled, probeBars, undefined, { requestDatafeed: probeRequestDatafeed }) : null;
  const probeInterpreter = executeScript(ast, probeBars, undefined, { requestDatafeed: probeRequestDatafeed });
  const sameBarsInterpreterOutput = outputCounts(sameBarsInterpreter);
  const probeCompiledOutput = outputCounts(probeCompiled);
  const probeInterpreterOutput = outputCounts(probeInterpreter);
  const interpreterStrategy = strategyActivity(probeInterpreter);
  const sourceCallKinds = new Set(sourceCalls.map((call) => call.kind));
  const onlyStrategyCalls = sourceCalls.length > 0 && sourceCalls.every((call) => call.kind.startsWith('strategy.'));
  const hasStrategyActivity =
    interpreterStrategy.openTrades > 0
    || interpreterStrategy.closedTrades > 0
    || interpreterStrategy.positionSize !== 0;

  if (sameBarsInterpreterOutput.produced) {
    return {
      bucket: 'tealscript-gap',
      reason: `Compiled output path produced nothing, but the interpreter produced ${formatOutputCounts(sameBarsInterpreterOutput)} on the same synthetic bars.`,
      sourceCalls,
      sameBarsInterpreterOutput,
      probeBars: {
        count: probeBars.length,
        firstTime: probeBars[0]?.time ?? 0,
        lastTime: probeBars.at(-1)?.time ?? 0,
        compiledOutput: probeCompiledOutput,
        interpreterOutput: probeInterpreterOutput,
        interpreterStrategy,
      },
    };
  }

  if (probeInterpreterOutput.produced && !probeCompiledOutput.produced) {
    return {
      bucket: 'tealscript-gap',
      reason: `Compiled output path stayed empty on the extended probe, but the interpreter produced ${formatOutputCounts(probeInterpreterOutput)}.`,
      sourceCalls,
      sameBarsInterpreterOutput,
      probeBars: {
        count: probeBars.length,
        firstTime: probeBars[0]?.time ?? 0,
        lastTime: probeBars.at(-1)?.time ?? 0,
        compiledOutput: probeCompiledOutput,
        interpreterOutput: probeInterpreterOutput,
        interpreterStrategy,
      },
    };
  }

  if (probeCompiledOutput.produced || probeInterpreterOutput.produced) {
    return {
      bucket: 'correct-silence',
      reason: `The default 160-bar synthetic window did not trigger visible output, but the extended probe produced ${formatOutputCounts(probeCompiledOutput.produced ? probeCompiledOutput : probeInterpreterOutput)}.`,
      sourceCalls,
      sameBarsInterpreterOutput,
      probeBars: {
        count: probeBars.length,
        firstTime: probeBars[0]?.time ?? 0,
        lastTime: probeBars.at(-1)?.time ?? 0,
        compiledOutput: probeCompiledOutput,
        interpreterOutput: probeInterpreterOutput,
        interpreterStrategy,
      },
    };
  }

  if (sourceCalls.length === 0) {
    return {
      bucket: 'correct-silence',
      reason: 'The source has no plot, drawing, alert, or strategy order calls; empty output is expected.',
      sourceCalls,
      sameBarsInterpreterOutput,
      probeBars: {
        count: probeBars.length,
        firstTime: probeBars[0]?.time ?? 0,
        lastTime: probeBars.at(-1)?.time ?? 0,
        compiledOutput: probeCompiledOutput,
        interpreterOutput: probeInterpreterOutput,
        interpreterStrategy,
      },
    };
  }

  if (onlyStrategyCalls && hasStrategyActivity) {
    return {
      bucket: 'correct-silence',
      reason: 'The source only submits strategy orders; the output funnel tracks chart plots, drawings, alerts, and logs, while the extended probe shows strategy ledger activity.',
      sourceCalls,
      sameBarsInterpreterOutput,
      probeBars: {
        count: probeBars.length,
        firstTime: probeBars[0]?.time ?? 0,
        lastTime: probeBars.at(-1)?.time ?? 0,
        compiledOutput: probeCompiledOutput,
        interpreterOutput: probeInterpreterOutput,
        interpreterStrategy,
      },
    };
  }

  const allOutputCallsAreLocal = sourceCalls.every((call) => call.scope === 'local');
  if (allOutputCallsAreLocal || sourceCallKinds.has('alert') || sourceCallKinds.has('line.new') || sourceCallKinds.has('label.new') || sourceCallKinds.has('box.new')) {
    return {
      bucket: 'undecided',
      reason: 'All visible output is conditional, local, or data-gated and did not fire on either synthetic series; left undecided rather than counted as invalid source or a proven TealScript gap.',
      sourceCalls,
      sameBarsInterpreterOutput,
      probeBars: {
        count: probeBars.length,
        firstTime: probeBars[0]?.time ?? 0,
        lastTime: probeBars.at(-1)?.time ?? 0,
        compiledOutput: probeCompiledOutput,
        interpreterOutput: probeInterpreterOutput,
        interpreterStrategy,
      },
    };
  }

  return {
    bucket: 'tealscript-gap',
    reason: 'The source contains global visible-output calls, but neither execution path produced output on the default or extended synthetic series.',
    sourceCalls,
    sameBarsInterpreterOutput,
    probeBars: {
      count: probeBars.length,
      firstTime: probeBars[0]?.time ?? 0,
      lastTime: probeBars.at(-1)?.time ?? 0,
      compiledOutput: probeCompiledOutput,
      interpreterOutput: probeInterpreterOutput,
      interpreterStrategy,
    },
  };
}

export function outputCounts(result: ExecutionResult | null): ExternalCorpusOutputCounts {
  const plots = result ? visiblePlotsForCorpus(result.plots).length : 0;
  const drawings = result?.drawings.length ?? 0;
  const alerts = result?.alerts.length ?? 0;
  const logs = result?.logs.length ?? 0;
  return {
    produced: plots + drawings + alerts + logs > 0,
    plots,
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

function runClosureCompile(ast: Program): ClosureCompileProbe {
  try {
    const compiled = tryCompileClosure(ast);
    if (compiled.success) {
      return {
        compiled,
        stages: {
          compile: { status: 'passed' },
          execute: { status: 'not-run' },
          output: { status: 'not-run' },
        },
        unsupported: [],
      };
    }
    return {
      compiled,
      stages: {
        compile: { status: 'failed', diagnostic: compiled.unsupported.join('; ') || 'closure backend did not support script' },
        execute: { status: 'not-run' },
        output: { status: 'not-run' },
      },
      unsupported: compiled.unsupported,
    };
  } catch (error) {
    return {
      compiled: null,
      stages: {
        compile: { status: 'failed', diagnostic: formatThrownDiagnostic(error) },
        execute: { status: 'not-run' },
        output: { status: 'not-run' },
      },
      unsupported: [formatThrownDiagnostic(error)],
    };
  }
}

function runClosureAnalysis(
  closureCompile: ClosureCompileProbe,
  bars: Bar[],
  options: TealscriptEngineOptions,
  interpreter: ExecutionResult,
  compiled: ExecutionResult | null,
): ClosureAnalysisRun {
  if (closureCompile.stages.compile.status !== 'passed') {
    return {
      analysis: {
        stages: closureCompile.stages,
        unsupported: closureCompile.unsupported,
        output: outputCounts(null),
        parityAgainstInterpreter: { status: 'not-run' },
        parityAgainstCompiled: { status: 'not-run' },
        agreement: 'closure-unsupported',
      },
      result: null,
    };
  }

  try {
    const closureResult = executeClosure(closureCompile.compiled!, bars, undefined, options);
    return {
      analysis: closureAnalysisFromResult(closureCompile, closureResult, interpreter, compiled),
      result: closureResult,
    };
  } catch (error) {
    return {
      analysis: {
        stages: {
          ...closureCompile.stages,
          execute: { status: 'failed', diagnostic: formatThrownDiagnostic(error) },
          output: { status: 'not-run' },
        },
        unsupported: closureCompile.unsupported,
        output: outputCounts(null),
        parityAgainstInterpreter: { status: 'not-run' },
        parityAgainstCompiled: { status: 'not-run' },
        agreement: 'closure-not-run',
      },
      result: null,
    };
  }
}

function closureAnalysisFromResult(
  closureCompile: ClosureCompileProbe,
  closureResult: ExecutionResult,
  interpreter: ExecutionResult,
  compiled: ExecutionResult | null,
): ExternalCorpusClosureAnalysis {
  const output = outputCounts(closureResult);
  const executionError = closureResult.errors[0];
  const parityAgainstInterpreter = compareExecutionOutput(closureResult, interpreter, 'Closure', 'interpreter');
  const parityAgainstCompiled = compiled ? compareExecutionOutput(closureResult, compiled, 'Closure', 'compiled') : { status: 'not-run' as const };
  const compiledAgainstInterpreter = compiled ? compareExecutionOutput(compiled, interpreter, 'Compiled', 'interpreter') : { status: 'not-run' as const };
  return {
    stages: {
      ...closureCompile.stages,
      execute: { status: executionError ? 'failed' : 'passed', diagnostic: executionError ? formatExecutionError(executionError) : undefined },
      output: executionError
        ? { status: 'not-run' }
        : { status: output.produced ? 'passed' : 'failed', diagnostic: output.produced ? undefined : 'No plots, drawings, alerts, or logs were produced' },
    },
    unsupported: closureCompile.unsupported,
    output,
    parityAgainstInterpreter,
    parityAgainstCompiled,
    agreement: closureAgreement(parityAgainstInterpreter, parityAgainstCompiled, compiledAgainstInterpreter),
  };
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
      interpreter: outputCounts(expected),
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

function closureAgreement(
  againstInterpreter: ExternalCorpusOutputParityAnalysis,
  againstCompiled: ExternalCorpusOutputParityAnalysis,
  compiledAgainstInterpreter: ExternalCorpusOutputParityAnalysis,
): ExternalCorpusClosureAgreement {
  if (againstInterpreter.status === 'matched' && againstCompiled.status === 'matched') return 'all-three';
  if (againstInterpreter.status === 'matched') return 'closure-interpreter-only';
  if (againstCompiled.status === 'matched') return 'closure-compiled-only';
  if (againstCompiled.status === 'not-run') return 'three-way-mismatch';
  return compiledAgainstInterpreter.status === 'matched' ? 'compiled-interpreter-only' : 'three-way-mismatch';
}

function normalizeClosureUnsupportedCause(diagnostic: string): string {
  const message = diagnostic.split(';')[0]?.trim() ?? diagnostic;
  const unsupported = message.match(/unsupported (statement|expression|call|member|method call) ([^;\n]+)/i);
  if (unsupported) return `unsupported-${unsupported[1]!.toLowerCase().replaceAll(' ', '-')}:${unsupported[2]!.split(/\s+/)[0]}`;
  return message.split('\n')[0]?.slice(0, 120) || 'closure-unsupported';
}

function summarizeOutputDiff(expected: string, actual: string, expectedLabel = 'interpreter', actualLabel = 'compiled'): string {
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
    if (cause === 'unresolved-import') {
      return {
        bucket: 'host-dependency-gap',
        reason: 'The source imports a TradingView library that was not available to the corpus host; valid Pine cannot run until the product supplies or accepts that library source.',
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
        bucket: 'tealscript-gap',
        reason: 'Typed int variable receives a float expression; not proven invalid Pine, so this remains counted as a TealScript compatibility gap.',
      };
    }
    if (diagnostic.includes('Invalid box.new text_valign')) {
      return {
        bucket: 'tealscript-gap',
        reason: 'Text vertical-alignment compatibility is not proven invalid Pine, so this remains counted as a TealScript compatibility gap.',
      };
    }
    return {
      bucket: 'tealscript-gap',
      reason: `Semantic failure is not proven invalid Pine: ${cause}.`,
    };
  }

  return {
    bucket: 'tealscript-gap',
    reason: `Pipeline failed at ${row.firstFailedStage}.`,
  };
}

function classifyParseValidity(row: Omit<ExternalCorpusReportRow, 'validity'>, diagnostic: string): ExternalCorpusReportRow['validity'] {
  if (row.sourceFilePath === '.cursor/rules/10 - pinescript-management.md') {
    return {
      bucket: 'corpus-hygiene',
      reason: 'Scraped file is a Markdown development guide containing Pine examples, not a standalone Pine script.',
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
  if (row.id.startsWith('0147:')) {
    return {
      bucket: 'invalid-pine',
      reason: 'Pine identifiers are limited to ASCII letters, digits, and underscores; this source uses a non-ASCII identifier character.',
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
    const codeMatch = diagnostic.match(/(?:^|\s)(runtime\.error|[a-z][a-z0-9_.-]+):/i);
    if (codeMatch) return codeMatch[1]!;
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
