import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parse as parseCurrent } from '../src/parser/parser.ts';
import type { Program } from '../src/parser/ast.ts';
import { checkProgram as checkCurrent } from '../src/semantic/checker.ts';
import type { Bar, PlotOutput } from '../src/runtime/context.ts';
import type { ExecutionResult } from '../src/runtime/types.ts';
import { executeScript } from '../src/runtime/compiledOnly.ts';
import { executeCompiled, tryCompile } from '../src/runtime/codegen/execute.ts';
import { getOfficialTradingViewLibrary } from '../src/officialTradingViewLibraries.ts';
import {
  createSyntheticBars,
  SyntheticExternalCorpusRequestDatafeed,
  type ExternalCorpusManifest,
} from './run-external-pine-corpus.ts';

type DifferentialStatus =
  | 'matched'
  | 'mismatched'
  | 'skipped-timeout'
  | 'skipped-parse'
  | 'skipped-semantic'
  | 'skipped-compile'
  | 'public-path-error'
  | 'compiled-direct-error';

interface DifferentialRow {
  localPath: string;
  status: DifferentialStatus;
  dimension?: string;
  cause: string;
  diagnostic?: string;
  firstDifference?: {
    path?: string;
    plotIndex?: number;
    field: string;
    barIndex?: number;
    publicPath: unknown;
    compiledDirect: unknown;
  };
  plotCounts?: {
    publicPath: number;
    compiledDirect: number;
  };
}

interface DifferentialReport {
  schemaVersion: 2;
  corpusPath: string;
  publicPathName: string;
  publicPathCommitSha: string;
  compiledDirectName: string;
  compiledDirectCommitSha: string;
  bars: number;
  rows: DifferentialRow[];
  summary: {
    total: number;
    matched: number;
    mismatched: number;
    skipped: number;
    errored: number;
    byStatus: Record<string, number>;
    byCause: Array<{ cause: string; count: number; representativeScript: string }>;
  };
}

interface DifferentialBaselineEntry {
  localPath: string;
  dimension?: string;
  cause: string;
  firstDifference?: DifferentialRow['firstDifference'];
}

interface DifferentialBaseline {
  schemaVersion: 2;
  generatedFromReport?: string;
  expectedDivergences: DifferentialBaselineEntry[];
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');
const NUMERIC_TOLERANCE = 1e-8;

function resolveCliPath(filePath: string): string {
  return resolve(REPO_ROOT, filePath);
}

function buildCurrentHostLibraryRegistry(ast: Program): Map<string, Program> {
  const libraries = new Map<string, Program>();
  for (const statement of ast.body) {
    if (statement.type !== 'ImportDeclaration') continue;
    const library = getOfficialTradingViewLibrary(statement.path);
    if (library?.program) libraries.set(statement.path, library.program);
  }
  return libraries;
}

function firstErrorDiagnostic(diagnostics: Array<{ severity: string; code?: string; message: string; line?: number; column?: number }>): string {
  const diagnostic = diagnostics.find((item) => item.severity === 'error');
  if (!diagnostic) return '';
  const location = diagnostic.line !== undefined && diagnostic.column !== undefined ? `${diagnostic.line}:${diagnostic.column}: ` : '';
  return `${location}${diagnostic.code ? `${diagnostic.code}: ` : ''}${diagnostic.message}`;
}

function normalizeNumber(value: unknown): number | null | string {
  if (typeof value !== 'number') return value == null ? null : String(value);
  if (Number.isNaN(value)) return null;
  if (!Number.isFinite(value)) return String(value);
  return Object.is(value, -0) ? 0 : value;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  const normalizedLeft = normalizeNumber(left);
  const normalizedRight = normalizeNumber(right);
  if (typeof normalizedLeft === 'number' && typeof normalizedRight === 'number') {
    return Math.abs(normalizedLeft - normalizedRight) <= NUMERIC_TOLERANCE;
  }
  return normalizedLeft === normalizedRight;
}

function plotFields(plot: PlotOutput): Record<string, unknown[] | undefined> {
  return {
    values: plot.values,
    openValues: plot.openValues,
    highValues: plot.highValues,
    lowValues: plot.lowValues,
    closeValues: plot.closeValues,
  };
}

function comparePlotValues(publicPath: ExecutionResult, compiledDirect: ExecutionResult): DifferentialRow['firstDifference'] | undefined {
  if (publicPath.plots.length !== compiledDirect.plots.length) {
    return {
      plotIndex: Math.min(publicPath.plots.length, compiledDirect.plots.length),
      path: 'plots.length',
      field: 'plots.length',
      publicPath: publicPath.plots.length,
      compiledDirect: compiledDirect.plots.length,
    };
  }

  for (let plotIndex = 0; plotIndex < publicPath.plots.length; plotIndex += 1) {
    const publicPathPlot = publicPath.plots[plotIndex]!;
    const compiledPlot = compiledDirect.plots[plotIndex]!;
    const publicPathFields = plotFields(publicPathPlot);
    const compiledFields = plotFields(compiledPlot);
    for (const field of Object.keys(publicPathFields)) {
      const publicPathValues = publicPathFields[field];
      const compiledValues = compiledFields[field];
      if ((publicPathValues?.length ?? 0) !== (compiledValues?.length ?? 0)) {
        return {
          plotIndex,
          path: `plots[${plotIndex}].${field}.length`,
          field: `${field}.length`,
          publicPath: publicPathValues?.length ?? 0,
          compiledDirect: compiledValues?.length ?? 0,
        };
      }
      for (let barIndex = 0; barIndex < (publicPathValues?.length ?? 0); barIndex += 1) {
        if (!valuesEqual(publicPathValues![barIndex], compiledValues![barIndex])) {
          return {
            plotIndex,
            path: `plots[${plotIndex}].${field}[${barIndex}]`,
            field,
            barIndex,
            publicPath: normalizeNumber(publicPathValues![barIndex]),
            compiledDirect: normalizeNumber(compiledValues![barIndex]),
          };
        }
      }
    }
  }
  return undefined;
}

function valueKind(value: unknown): string {
  return value === null ? 'na' : typeof value === 'number' ? 'number' : String(value);
}

function barBand(barIndex: number | undefined): string {
  if (barIndex === undefined) return 'structure';
  if (barIndex === 0) return 'bar0';
  if (barIndex < 20) return 'warmup';
  return 'later';
}

function classifyFirstDifference(firstDifference: NonNullable<DifferentialRow['firstDifference']>): string {
  if (firstDifference.field.includes('length')) return firstDifference.field;
  return `${firstDifference.field}:${valueKind(firstDifference.publicPath)}->${valueKind(firstDifference.compiledDirect)}:${barBand(firstDifference.barIndex)}`;
}

function compareJsonDimension(
  dimension: string,
  publicPathValue: unknown,
  compiledDirectValue: unknown,
): DifferentialRow['firstDifference'] | undefined {
  const publicPathJson = JSON.stringify(stableValue(publicPathValue));
  const compiledDirectJson = JSON.stringify(stableValue(compiledDirectValue));
  if (publicPathJson === compiledDirectJson) return undefined;
  const diffIndex = firstStringDiff(publicPathJson, compiledDirectJson);
  return {
    path: `${dimension}:json[${diffIndex}]`,
    field: dimension,
    publicPath: publicPathJson.slice(Math.max(0, diffIndex - 160), diffIndex + 160),
    compiledDirect: compiledDirectJson.slice(Math.max(0, diffIndex - 160), diffIndex + 160),
  };
}

function firstStringDiff(left: string, right: string): number {
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    if (left[index] !== right[index]) return index;
  }
  return -1;
}

function canonicalizeDrawings(drawings: ExecutionResult['drawings']): unknown {
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
    ...(drawing.type === 'linefill'
      ? {
          line1: canonicalizeDrawingId(drawing.line1),
          line2: canonicalizeDrawingId(drawing.line2),
        }
      : {}),
  }));
}

function profileSignals(result: ExecutionResult): unknown {
  const signals = {
    strategyIntrabarUnavailableReasons: result.profile.strategyIntrabarUnavailableReasons,
    strategyMarginApproximationReasons: result.profile.strategyMarginApproximationReasons,
    swallowedErrors: result.profile.swallowedErrors,
    compiledBarErrors: result.profile.compiledBarErrors,
    errors: result.profile.errors,
  };
  return Object.fromEntries(
    Object.entries(signals).filter(([, value]) => !Array.isArray(value) || value.length > 0),
  );
}

function compareExecutionResults(publicPath: ExecutionResult, compiledDirect: ExecutionResult): Pick<DifferentialRow, 'dimension' | 'firstDifference'> | undefined {
  const plotDifference = comparePlotValues(publicPath, compiledDirect);
  if (plotDifference) return { dimension: 'plots', firstDifference: plotDifference };

  const dimensions: Array<[string, unknown, unknown]> = [
    ['drawings', canonicalizeDrawings(publicPath.drawings), canonicalizeDrawings(compiledDirect.drawings)],
    ['alerts', publicPath.alerts, compiledDirect.alerts],
    ['logs', publicPath.logs, compiledDirect.logs],
    ['strategy', publicPath.strategy, compiledDirect.strategy],
    ['profile', profileSignals(publicPath), profileSignals(compiledDirect)],
  ];
  for (const [dimension, publicPathValue, compiledDirectValue] of dimensions) {
    const firstDifference = compareJsonDimension(dimension, publicPathValue, compiledDirectValue);
    if (firstDifference) return { dimension, firstDifference };
  }
  return undefined;
}

function stableValue(value: unknown): unknown {
  if (typeof value === 'number') return normalizeNumber(value);
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entryValue]) => [key, stableValue(entryValue)]),
  );
}

async function runRow(
  inputDir: string,
  localPath: string,
  bars: Bar[],
): Promise<DifferentialRow> {
  const source = await readFile(resolve(inputDir, localPath), 'utf8');
  let currentAst: Program;
  try {
    currentAst = parseCurrent(source, { grammarSource: localPath });
  } catch (error) {
    return {
      localPath,
      status: 'skipped-parse',
      cause: 'parse',
      diagnostic: error instanceof Error ? error.message : String(error),
    };
  }

  const currentLibraries = buildCurrentHostLibraryRegistry(currentAst);
  const currentSemantic = checkCurrent(currentAst, { libraries: currentLibraries });
  const currentSemanticError = firstErrorDiagnostic(currentSemantic.diagnostics);
  if (currentSemanticError) {
    return {
      localPath,
      status: 'skipped-semantic',
      cause: 'semantic',
      diagnostic: currentSemanticError,
    };
  }

  const compiledDirect = tryCompile(currentAst, undefined, { libraries: currentLibraries });
  if (!compiledDirect.success) {
    return {
      localPath,
      status: 'skipped-compile',
      cause: 'compile',
      diagnostic: compiledDirect.unsupported.join('; ') || 'compiled backend did not support script',
    };
  }

  const publicPathRequestDatafeed = new SyntheticExternalCorpusRequestDatafeed(bars);
  const compiledDirectRequestDatafeed = new SyntheticExternalCorpusRequestDatafeed(bars);
  let publicPathResult: ExecutionResult;
  let compiledDirectResult: ExecutionResult | null;
  try {
    publicPathResult = executeScript(currentAst, bars, undefined, {
      requestDatafeed: publicPathRequestDatafeed,
      libraries: currentLibraries,
    });
  } catch (error) {
    return {
      localPath,
      status: 'public-path-error',
      cause: 'public-path-error',
      diagnostic: error instanceof Error ? error.message : String(error),
    };
  }
  try {
    compiledDirectResult = executeCompiled(compiledDirect, bars, undefined, {
      requestDatafeed: compiledDirectRequestDatafeed,
      libraries: currentLibraries,
    });
  } catch (error) {
    return {
      localPath,
      status: 'compiled-direct-error',
      cause: 'compiled-direct-error',
      diagnostic: error instanceof Error ? error.message : String(error),
    };
  }
  if (!compiledDirectResult) {
    return {
      localPath,
      status: 'compiled-direct-error',
      cause: 'compiled-direct-error',
      diagnostic: 'compiled direct execution returned null',
    };
  }

  const comparison = compareExecutionResults(publicPathResult, compiledDirectResult);
  if (comparison) {
    return {
      localPath,
      status: 'mismatched',
      dimension: comparison.dimension,
      cause: comparison.dimension === 'plots'
        ? classifyFirstDifference(comparison.firstDifference!)
        : comparison.dimension!,
      firstDifference: comparison.firstDifference,
      plotCounts: {
        publicPath: publicPathResult.plots.length,
        compiledDirect: compiledDirectResult.plots.length,
      },
    };
  }
  return {
    localPath,
    status: 'matched',
    cause: 'matched',
    plotCounts: {
      publicPath: publicPathResult.plots.length,
      compiledDirect: compiledDirectResult.plots.length,
    },
  };
}

function summarize(rows: DifferentialRow[]): DifferentialReport['summary'] {
  const byStatus = countBy(rows, (row) => row.status);
  const byCauseCounts = new Map<string, { cause: string; count: number; representativeScript: string }>();
  for (const row of rows.filter((item) => item.status === 'mismatched')) {
    const existing = byCauseCounts.get(row.cause);
    if (existing) existing.count += 1;
    else byCauseCounts.set(row.cause, { cause: row.cause, count: 1, representativeScript: row.localPath });
  }
  return {
    total: rows.length,
    matched: byStatus.matched ?? 0,
    mismatched: byStatus.mismatched ?? 0,
    skipped: (byStatus['skipped-parse'] ?? 0) + (byStatus['skipped-semantic'] ?? 0) + (byStatus['skipped-compile'] ?? 0) + (byStatus['skipped-timeout'] ?? 0),
    errored: (byStatus['public-path-error'] ?? 0) + (byStatus['compiled-direct-error'] ?? 0),
    byStatus,
    byCause: [...byCauseCounts.values()].sort((left, right) => right.count - left.count || left.cause.localeCompare(right.cause)),
  };
}

function createBaseline(report: DifferentialReport, generatedFromReport?: string): DifferentialBaseline {
  return {
    schemaVersion: 2,
    generatedFromReport,
    expectedDivergences: report.rows
      .filter((row) => row.status === 'mismatched')
      .map((row) => ({
        localPath: row.localPath,
        dimension: row.dimension,
        cause: row.cause,
        firstDifference: row.firstDifference,
      })),
  };
}

async function checkBaseline(report: DifferentialReport, baselinePath: string): Promise<void> {
  const baseline = JSON.parse(await readFile(resolveCliPath(baselinePath), 'utf8')) as DifferentialBaseline;
  const expected = new Map(baseline.expectedDivergences.map((entry) => [entry.localPath, entry]));
  const actual = new Map(report.rows.filter((row) => row.status === 'mismatched').map((row) => [row.localPath, row]));
  const unexpected = [...actual.values()].filter((row) => !expected.has(row.localPath));
  const resolved = [...expected.values()].filter((entry) => !actual.has(entry.localPath));
  const changed = [...actual.values()].filter((row) => {
    const expectedEntry = expected.get(row.localPath);
    return expectedEntry && (expectedEntry.dimension !== row.dimension || expectedEntry.cause !== row.cause);
  });

  if (unexpected.length === 0 && resolved.length === 0 && changed.length === 0) return;

  process.stderr.write(JSON.stringify({
    message: 'Corpus output differential baseline mismatch',
    unexpected: unexpected.map((row) => ({ localPath: row.localPath, dimension: row.dimension, cause: row.cause })),
    resolved: resolved.map((entry) => ({ localPath: entry.localPath, dimension: entry.dimension, cause: entry.cause })),
    changed: changed.map((row) => ({
      localPath: row.localPath,
      expected: expected.get(row.localPath),
      actual: { dimension: row.dimension, cause: row.cause, firstDifference: row.firstDifference },
    })),
  }, null, 2));
  process.stderr.write('\n');
  process.exitCode = 1;
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const value = key(item);
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function parseArgs(args: string[]): { inputDir: string; outputPath: string; limit?: number; timeoutScripts: Set<string>; writeBaselinePath?: string; baselinePath?: string } {
  const values = new Map<string, string>();
  const timeoutScripts = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    const value = args[++index] ?? '';
    if (arg === '--timeout-script') timeoutScripts.add(value);
    else values.set(arg, value);
  }
  const inputDir = values.get('--input') ?? '';
  const outputPath = values.get('--output') ?? '';
  const limit = values.has('--limit') ? Number(values.get('--limit')) : undefined;
  const writeBaselinePath = values.get('--write-baseline');
  const baselinePath = values.get('--baseline');
  if (!inputDir || !outputPath) {
    throw new Error('Usage: tsx scripts/measure-corpus-plot-value-differential.ts --input <corpus-dir> --output <report.json> [--limit <n>] [--timeout-script <path>] [--write-baseline <baseline.json>] [--baseline <baseline.json>]');
  }
  return { inputDir, outputPath, limit, timeoutScripts, writeBaselinePath, baselinePath };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = resolveCliPath(args.inputDir);
  const manifest = JSON.parse(await readFile(join(inputDir, 'manifest.json'), 'utf8')) as ExternalCorpusManifest;
  const currentCommitSha = execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const bars = createSyntheticBars(160);
  const selected = args.limit ? manifest.scripts.slice(0, args.limit) : manifest.scripts;
  const rows: DifferentialRow[] = [];
  for (let index = 0; index < selected.length; index += 1) {
    const script = selected[index]!;
    if (args.timeoutScripts.has(script.localPath)) {
      rows.push({
        localPath: script.localPath,
        status: 'skipped-timeout',
        cause: 'timeout',
        diagnostic: 'known deep-expression row excluded from in-process differential to keep the full denominator measurable',
      });
      continue;
    }
    if ((index + 1) % 100 === 0) process.stderr.write(`Compared ${index + 1}/${selected.length}: ${script.localPath}\n`);
    rows.push(await runRow(inputDir, script.localPath, bars));
  }
  const report: DifferentialReport = {
    schemaVersion: 2,
    corpusPath: inputDir,
    publicPathName: 'current executeScript() compiled-only wrapper',
    publicPathCommitSha: currentCommitSha,
    compiledDirectName: 'current executeCompiled() direct compiled path',
    compiledDirectCommitSha: currentCommitSha,
    bars: bars.length,
    rows,
    summary: summarize(rows),
  };
  await writeFile(resolveCliPath(args.outputPath), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (args.writeBaselinePath) {
    await writeFile(resolveCliPath(args.writeBaselinePath), `${JSON.stringify(createBaseline(report, args.outputPath), null, 2)}\n`, 'utf8');
  }
  if (args.baselinePath) {
    await checkBaseline(report, args.baselinePath);
  }
  process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
