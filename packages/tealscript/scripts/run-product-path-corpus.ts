import { createServer, type Server } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer';
import { build } from 'vite';

import type { ExecutionResult } from '../src/runtime/engine.ts';
import { createStrategyLedger } from '../src/runtime/strategy.ts';
import {
  compareExecutionOutput,
  compareStrategyLedger,
  createSyntheticBars,
  outputCounts,
  type ExternalCorpusOutputParityAnalysis,
  type ExternalCorpusReport,
  type ExternalCorpusStrategyLedgerParityAnalysis,
} from './run-external-pine-corpus.ts';

type ProductPathBackend = 'compiled' | 'closure';

interface ProductPathCorpusCase {
  corpus: 'v1' | 'v2';
  id: string;
  localPath: string;
  source: string;
}

interface BrowserProductPathOutput {
  ok: boolean;
  backend: ProductPathBackend;
  requestedBackend: ProductPathBackend;
  actualBackend?: string;
  selectedBackend?: string;
  backendSelectionSource?: string;
  plots: unknown[];
  drawings: unknown[];
  alerts: unknown[];
  logs: unknown[];
  telemetry: unknown[];
  warnings: string[];
  errors: string[];
  phases: {
    historical: BrowserProductPathPhaseOutput;
    realtime: BrowserProductPathPhaseOutput;
  };
}

interface ProductPathCorpusRow {
  corpus: 'v1' | 'v2';
  id: string;
  localPath: string;
  status: 'matched' | 'mismatched' | 'failed';
  parity: {
    historical: ExternalCorpusOutputParityAnalysis;
    realtime: ExternalCorpusOutputParityAnalysis;
  };
  strategyLedgerParity: {
    historical: ExternalCorpusStrategyLedgerParityAnalysis;
    realtime: ExternalCorpusStrategyLedgerParityAnalysis;
  };
  compiled: ProductPathBackendSummary;
  closure: ProductPathBackendSummary;
}

interface BrowserProductPathPhaseOutput {
  actualBackend?: string;
  selectedBackend?: string;
  backendSelectionSource?: string;
  plots: unknown[];
  drawings: unknown[];
  alerts: unknown[];
  logs: unknown[];
  strategy?: ExecutionResult['strategy'];
}

interface ProductPathBackendSummary {
  ok: boolean;
  requestedBackend: ProductPathBackend;
  actualBackend?: string;
  selectedBackend?: string;
  backendSelectionSource?: string;
  plots: number;
  drawings: number;
  alerts: number;
  logs: number;
  strategy: {
    orders: number;
    fills: number;
    openTrades: number;
    closedTrades: number;
    equityCurve: number;
  };
  errors: string[];
  warnings: string[];
}

interface ProductPathCorpusReport {
  schemaVersion: 1;
  generatedAt: string;
  sourceReports: string[];
  coverage: {
    dimensionsCompared: Array<'plots' | 'drawings' | 'alerts' | 'logs' | 'strategyLedger'>;
    dimensionsNotCaptured: [];
    reason:
      'plots and drawings are captured from the widget manager state; alerts, logs, and strategy ledger are captured from the existing worker result message seam without adding shipped product surface';
    realtimeEventsPerScript: 1;
  };
  sample: {
    selection: 'first-dominated-per-corpus';
    limitPerCorpus: number;
    requested: number;
  };
  summary: {
    total: number;
    matched: number;
    mismatched: number;
    failed: number;
    historicalMismatched: number;
    realtimeMismatched: number;
    historicalStrategyMismatched: number;
    realtimeStrategyMismatched: number;
    compiledRealtimeFallbacks: number;
    byCorpus: Record<'v1' | 'v2', { total: number; matched: number; mismatched: number; failed: number }>;
  };
  rows: ProductPathCorpusRow[];
}

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');
const DEFAULT_SOURCE_REPORTS = [
  'reports/external-pine-corpus-v1.report.json',
  'reports/external-pine-corpus-v2.report.json',
] as const;
const DEFAULT_OUTPUT = 'reports/product-path-corpus.report.json';
const DEFAULT_LIMIT_PER_CORPUS = 16;
const BARS_PER_SCRIPT = 160;
const SETTLE_TIMEOUT_MS = 12_000;

function resolvePackagePath(path: string): string {
  const resolved = path.startsWith('packages/')
    ? resolve(REPO_ROOT, path)
    : resolve(PACKAGE_ROOT, path);
  const nestedPackagePath = resolve(PACKAGE_ROOT, 'packages');
  if (resolved === nestedPackagePath || resolved.startsWith(`${nestedPackagePath}/`)) {
    throw new Error(
      `Refusing to write product-path report under ${relative(REPO_ROOT, nestedPackagePath)}; ` +
      'when using yarn workspace, pass reports/... or a repo-relative packages/tealscript/reports/... path.',
    );
  }
  return resolved;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(resolvePackagePath(path), 'utf8')) as T;
}

async function loadCases(limitPerCorpus: number): Promise<{ cases: ProductPathCorpusCase[]; sourceReports: string[] }> {
  const cases: ProductPathCorpusCase[] = [];
  for (const [index, sourceReport] of DEFAULT_SOURCE_REPORTS.entries()) {
    const corpus = index === 0 ? 'v1' : 'v2';
    const report = await readJson<ExternalCorpusReport>(sourceReport);
    if (!existsSync(report.inputDir)) {
      throw new Error(`Corpus input directory for ${corpus} is missing: ${report.inputDir}`);
    }
    const dominated = report.rows.filter((row) => row.outcome === 'produced-output-compiled').slice(0, limitPerCorpus);
    for (const row of dominated) {
      const path = resolve(report.inputDir, row.localPath);
      cases.push({
        corpus,
        id: row.id,
        localPath: row.localPath,
        source: await readFile(path, 'utf8'),
      });
    }
  }
  return { cases, sourceReports: [...DEFAULT_SOURCE_REPORTS] };
}

function executionResultFromProductOutput(
  output: BrowserProductPathOutput,
  phase: 'historical' | 'realtime' = 'realtime',
): ExecutionResult {
  const phaseOutput = output.phases[phase];
  return {
    plots: phaseOutput.plots as ExecutionResult['plots'],
    drawings: phaseOutput.drawings as ExecutionResult['drawings'],
    alerts: phaseOutput.alerts as ExecutionResult['alerts'],
    logs: phaseOutput.logs as ExecutionResult['logs'],
    inputs: [],
    declaration: {
      title: 'product-path-corpus',
      overlay: false,
      dynamicRequests: false,
      drawingLimits: {
        label: 500,
        line: 500,
        box: 500,
        polyline: 100,
      },
    },
    indicatorTitle: 'product-path-corpus',
    indicatorOverlay: false,
    indicatorDynamicRequests: false,
    indicatorDrawingLimits: {
      label: 500,
      line: 500,
      box: 500,
      polyline: 100,
    },
    strategy: phaseOutput.strategy ?? createStrategyLedger(),
    profile: {
      executionMode: phaseOutput.actualBackend === 'closure' ? 'closure' : phaseOutput.actualBackend === 'interpreter' ? 'interpreter' : 'compiled',
      selectedBackend: phaseOutput.selectedBackend as ExecutionResult['profile']['selectedBackend'],
      backendSelectionSource: phaseOutput.backendSelectionSource as ExecutionResult['profile']['backendSelectionSource'],
      elapsedMs: 0,
      bars: BARS_PER_SCRIPT,
      statements: 0,
      expressions: 0,
      builtinCalls: 0,
      requestContexts: 0,
      maxBarsBack: 0,
      errors: output.errors.length,
    },
    errors: output.errors.map((message) => ({
      message,
      code: 'runtime.error',
    })) as ExecutionResult['errors'],
  };
}

function summarizeBackend(output: BrowserProductPathOutput): ProductPathBackendSummary {
  const counts = outputCounts(executionResultFromProductOutput(output));
  return {
    ok: output.ok,
    requestedBackend: output.requestedBackend,
    actualBackend: output.actualBackend,
    selectedBackend: output.selectedBackend,
    backendSelectionSource: output.backendSelectionSource,
    plots: counts.plots,
    drawings: counts.drawings,
    alerts: counts.alerts,
    logs: counts.logs,
    strategy: {
      orders: output.phases.realtime.strategy?.orders.length ?? 0,
      fills: output.phases.realtime.strategy?.fills.length ?? 0,
      openTrades: output.phases.realtime.strategy?.openTrades.length ?? 0,
      closedTrades: output.phases.realtime.strategy?.closedTrades.length ?? 0,
      equityCurve: output.phases.realtime.strategy?.equityCurve.length ?? 0,
    },
    errors: output.errors,
    warnings: output.warnings,
  };
}

function summarizeRows(rows: ProductPathCorpusRow[]): ProductPathCorpusReport['summary'] {
  const empty = { total: 0, matched: 0, mismatched: 0, failed: 0 };
  const byCorpus: ProductPathCorpusReport['summary']['byCorpus'] = {
    v1: { ...empty },
    v2: { ...empty },
  };
  const summary = { ...empty, byCorpus };
  let historicalMismatched = 0;
  let realtimeMismatched = 0;
  let historicalStrategyMismatched = 0;
  let realtimeStrategyMismatched = 0;
  let compiledRealtimeFallbacks = 0;
  for (const row of rows) {
    summary.total += 1;
    summary[row.status] += 1;
    byCorpus[row.corpus].total += 1;
    byCorpus[row.corpus][row.status] += 1;
    if (row.parity.historical.status === 'mismatched') historicalMismatched += 1;
    if (row.parity.realtime.status === 'mismatched') realtimeMismatched += 1;
    if (row.strategyLedgerParity.historical.status === 'mismatched') historicalStrategyMismatched += 1;
    if (row.strategyLedgerParity.realtime.status === 'mismatched') realtimeStrategyMismatched += 1;
    if (row.compiled.selectedBackend === 'compiled' && row.compiled.actualBackend !== 'compiled') {
      compiledRealtimeFallbacks += 1;
    }
  }
  return {
    ...summary,
    historicalMismatched,
    realtimeMismatched,
    historicalStrategyMismatched,
    realtimeStrategyMismatched,
    compiledRealtimeFallbacks,
  };
}

function contentType(path: string): string {
  switch (extname(path)) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

async function serveDirectory(root: string): Promise<{ origin: string; close: () => Promise<void> }> {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const full = resolve(root, `.${url.pathname === '/' ? '/index.html' : `/${file}`}`);
    if (full !== root && !full.startsWith(root + sep)) {
      response.writeHead(403);
      response.end('forbidden');
      return;
    }
    let body: Buffer;
    try {
      body = await readFile(full);
    } catch {
      response.writeHead(404);
      response.end('not found');
      return;
    }
    response.writeHead(200, { 'Content-Type': contentType(full) });
    response.end(body);
  });
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not bind product-path corpus server');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose) => server.close(() => resolveClose())),
  };
}

async function launchChrome() {
  try {
    return await puppeteer.launch({
      headless: true,
      protocolTimeout: 900_000,
      args: ['--no-sandbox'],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/could not find|executable/i.test(message)) throw error;
    throw new Error(
      'no Chrome available. Install it with:\n' +
      '  yarn workspace tealstreet-module-frame exec puppeteer browsers install chrome\n' +
      `(underlying error: ${message})`,
    );
  }
}

async function buildDriver(workDir: string, cases: ProductPathCorpusCase[]): Promise<string> {
  const driverRoot = resolve(workDir, 'driver');
  await mkdir(join(driverRoot, 'src'), { recursive: true });
  await writeFile(
    join(driverRoot, 'index.html'),
    '<!doctype html><html><head><meta charset="utf-8"><title>TealScript product path corpus</title></head><body><div id="app"></div><script type="module" src="/src/driver.ts"></script></body></html>\n',
  );
  await writeFile(join(driverRoot, 'src/driver.ts'), DRIVER_SOURCE);
  await writeFile(
    join(driverRoot, 'src/cases.ts'),
    `export const CASES = ${JSON.stringify(cases)} as const;\nexport const BARS = ${JSON.stringify(createSyntheticBars(BARS_PER_SCRIPT))} as const;\n`,
  );
  const outDir = resolve(workDir, 'dist');
  await build({
    root: driverRoot,
    base: './',
    logLevel: 'warn',
    resolve: {
      tsconfigPaths: true,
      alias: {
        '@tealstreet/tealchart': resolve(REPO_ROOT, 'packages/tealchart/src/index.ts'),
        '@tealstreet/tealscript/worker/worker.ts': resolve(REPO_ROOT, 'packages/tealscript/src/worker/worker.ts'),
        '@tealstreet/tealscript/worker': resolve(REPO_ROOT, 'packages/tealscript/src/worker/index.ts'),
        '@tealstreet/tealscript': resolve(REPO_ROOT, 'packages/tealscript/src/index.ts'),
      },
    },
    build: {
      outDir,
      emptyOutDir: true,
      modulePreload: { polyfill: false },
      sourcemap: false,
    },
  });
  return outDir;
}

async function runBrowser(cases: ProductPathCorpusCase[]): Promise<ProductPathCorpusRow[]> {
  const workDir = await mkdtemp(resolve(tmpdir(), 'tealscript-product-path-'));
  let browser: Awaited<ReturnType<typeof launchChrome>> | null = null;
  let server: Awaited<ReturnType<typeof serveDirectory>> | null = null;
  try {
    const dist = await buildDriver(workDir, cases);
    server = await serveDirectory(dist);
    browser = await launchChrome();
    const page = await browser.newPage();
    page.on('console', (message) => {
      const text = message.text();
      if (text.startsWith('[product-path]')) {
        process.stdout.write(`${text}\n`);
      }
    });
    page.on('pageerror', (error) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[product-path page error] ${message}\n`);
    });
    await page.goto(server.origin, { waitUntil: 'load' });
    const browserRows = await page.evaluate(() => window.__runTealscriptProductPathCorpus?.());
    if (!Array.isArray(browserRows)) {
      throw new Error('Product-path browser driver did not return rows');
    }
    return browserRows.map((row: any) => {
      const compiled = row.compiled as BrowserProductPathOutput;
      const closure = row.closure as BrowserProductPathOutput;
      const historicalParity = compareExecutionOutput(
        executionResultFromProductOutput(closure, 'historical'),
        executionResultFromProductOutput(compiled, 'historical'),
        'Product closure',
        'product compiled',
      );
      const realtimeParity = compareExecutionOutput(
        executionResultFromProductOutput(closure),
        executionResultFromProductOutput(compiled),
        'Product closure',
        'product compiled',
      );
      const historicalStrategyLedgerParity = compareStrategyLedger(
        executionResultFromProductOutput(closure, 'historical'),
        executionResultFromProductOutput(compiled, 'historical'),
        'Product closure',
        'product compiled',
      );
      const realtimeStrategyLedgerParity = compareStrategyLedger(
        executionResultFromProductOutput(closure),
        executionResultFromProductOutput(compiled),
        'Product closure',
        'product compiled',
      );
      const failed = !compiled.ok || !closure.ok;
      return {
        corpus: row.corpus,
        id: row.id,
        localPath: row.localPath,
        status: failed
          ? 'failed'
          : historicalParity.status === 'matched'
              && realtimeParity.status === 'matched'
              && historicalStrategyLedgerParity.status === 'matched'
              && realtimeStrategyLedgerParity.status === 'matched'
            ? 'matched'
            : 'mismatched',
        parity: {
          historical: historicalParity,
          realtime: realtimeParity,
        },
        strategyLedgerParity: {
          historical: historicalStrategyLedgerParity,
          realtime: realtimeStrategyLedgerParity,
        },
        compiled: summarizeBackend(compiled),
        closure: summarizeBackend(closure),
      };
    });
  } finally {
    await browser?.close();
    await server?.close();
    await rm(workDir, { recursive: true, force: true });
  }
}

function parseArgs(argv: string[]): { limitPerCorpus: number; output: string } {
  let limitPerCorpus = DEFAULT_LIMIT_PER_CORPUS;
  let output = DEFAULT_OUTPUT;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (arg === '--limit-per-corpus') {
      const value = Number(argv[++index]);
      if (!Number.isInteger(value) || value < 1) throw new Error('--limit-per-corpus requires a positive integer');
      limitPerCorpus = value;
    } else if (arg === '--output') {
      output = argv[++index] ?? '';
      if (!output) throw new Error('--output requires a path');
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { limitPerCorpus, output };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { cases, sourceReports } = await loadCases(args.limitPerCorpus);
  process.stdout.write(`product-path corpus: ${cases.length} scripts (${args.limitPerCorpus} per corpus)\n`);
  const rows = await runBrowser(cases);
  const report: ProductPathCorpusReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceReports,
    coverage: {
      dimensionsCompared: ['plots', 'drawings', 'alerts', 'logs', 'strategyLedger'],
      dimensionsNotCaptured: [],
      reason:
        'plots and drawings are captured from the widget manager state; alerts, logs, and strategy ledger are captured from the existing worker result message seam without adding shipped product surface',
      realtimeEventsPerScript: 1,
    },
    sample: {
      selection: 'first-dominated-per-corpus',
      limitPerCorpus: args.limitPerCorpus,
      requested: cases.length,
    },
    summary: summarizeRows(rows),
    rows,
  };
  const outputPath = resolvePackagePath(args.output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
}

declare global {
  interface Window {
    __runTealscriptProductPathCorpus?: () => Promise<unknown[]>;
  }
}

const DRIVER_SOURCE = String.raw`
import { createTealchartWidget } from '@tealstreet/tealchart';
import { getResultOutput, type Bar, type TealscriptExecutionBackend } from '@tealstreet/tealscript';
import { CASES, BARS } from './cases';

type Backend = 'compiled' | 'closure';
type RequestKind = 'full' | 'incremental';

interface CapturedWorkerResult {
  requestKind?: RequestKind;
  generation?: number;
  output: any;
}

const settleTimeoutMs = ${SETTLE_TIMEOUT_MS};

function createDatafeed(bars: readonly Bar[]) {
  let subscription: ((bar: Bar) => void) | null = null;
  return {
    emitRealtime(bar: Bar) {
      subscription?.(bar);
    },
    onReady(callback: (config: { supported_resolutions: string[] }) => void) {
      setTimeout(() => callback({ supported_resolutions: ['1', '5', '15', '60'] }), 0);
    },
    searchSymbols(_userInput: string, _exchange: string, _symbolType: string, onResult: (items: unknown[]) => void) {
      onResult([]);
    },
    resolveSymbol(symbol: string, onResolve: (info: Record<string, unknown>) => void) {
      setTimeout(() => onResolve({
        name: symbol,
        ticker: symbol,
        full_name: symbol,
        description: symbol,
        type: 'crypto',
        session: '24x7',
        timezone: 'Etc/UTC',
        exchange: 'BINANCE',
        listed_exchange: 'BINANCE',
        minmov: 1,
        pricescale: 10,
        has_intraday: true,
        supported_resolutions: ['1', '5', '15', '60'],
        volume_precision: 2,
        data_status: 'streaming',
      }), 0);
    },
    getBars(_symbolInfo: unknown, _resolution: string, _periodParams: unknown, onResult: (bars: readonly Bar[], meta: { noData?: boolean }) => void) {
      setTimeout(() => onResult([...bars], { noData: bars.length === 0 }), 0);
    },
    subscribeBars(_symbolInfo: unknown, _resolution: string, onTick: (bar: Bar) => void) {
      subscription = onTick;
    },
    unsubscribeBars() {
      subscription = null;
    },
  };
}

function createRequestResolver(chartBars: readonly Bar[]) {
  const points = chartBars.map((bar) => ({ time: bar.time, value: bar.close }));
  return async (request: any) => {
    if (request.kind === 'bars') {
      const query = request.query ?? {};
      return {
        ok: true,
        value: {
          symbol: String(query.symbol ?? 'BTCUSDT'),
          timeframe: String(query.timeframe ?? '60'),
          bars: [...chartBars],
          syminfo: { ticker: String(query.symbol ?? 'BTCUSDT'), mintick: 0.1, type: 'crypto' },
          currency: query.currency,
        },
      };
    }
    if (request.kind === 'series') {
      return { ok: true, value: points };
    }
    return {
      ok: false,
      error: {
        code: 'not-found',
        message: 'product-path corpus harness only provides bars and series request data',
      },
    };
  };
}

function nextRealtimeBar(bars: readonly Bar[]): Bar {
  const last = bars[bars.length - 1]!;
  return {
    ...last,
    close: last.close + 0.125,
    high: Math.max(last.high, last.close + 0.25),
    low: Math.min(last.low, last.close - 0.25),
    volume: last.volume + 17,
  };
}

function createObservedWorker(workerResults: CapturedWorkerResult[]): Worker {
  const worker = new Worker(new URL('@tealstreet/tealscript/worker/worker.ts', import.meta.url), { type: 'module' });
  worker.addEventListener('message', (event: MessageEvent) => {
    const message = event.data;
    if (message?.type !== 'result') return;
    const output = getResultOutput(message);
    workerResults.push({
      requestKind: output.metadata?.requestKind,
      generation: output.metadata?.generation,
      output,
    });
  });
  return worker;
}

function latestWorkerResult(workerResults: CapturedWorkerResult[], requestKind: RequestKind): any | undefined {
  return [...workerResults].reverse().find((entry) => entry.requestKind === requestKind)?.output;
}

function capturePhase(widget: any, telemetry: any[], workerResults: CapturedWorkerResult[], requestKind: RequestKind) {
  const manager = (widget as any)._tealScriptManager;
  const last = telemetry[telemetry.length - 1] ?? {};
  const workerOutput = latestWorkerResult(workerResults, requestKind);
  return {
    actualBackend: workerOutput?.profile?.executionMode ?? last.executionMode,
    selectedBackend: workerOutput?.profile?.selectedBackend ?? last.selectedBackend,
    backendSelectionSource: workerOutput?.profile?.backendSelectionSource ?? last.backendSelectionSource,
    plots: manager?.getAllPlots?.() ?? (widget as any)._plots ?? [],
    drawings: manager?.getAllDrawings?.() ?? (widget as any)._drawings ?? [],
    alerts: workerOutput?.alerts ?? [],
    logs: workerOutput?.logs ?? [],
    strategy: workerOutput?.strategy,
  };
}

async function waitForChartReady(widget: any): Promise<void> {
  await new Promise<void>((resolve) => widget.onChartReady(resolve));
}

async function waitForExecution(events: any[], requestKind: 'full' | 'incremental'): Promise<any> {
  const startedAt = performance.now();
  while (performance.now() - startedAt < settleTimeoutMs) {
    const match = [...events].reverse().find((event) => event?.generation && event?.requestKind === requestKind);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Timed out waiting for ' + requestKind + ' TealScript execution');
}

async function runOne(testCase: any, backend: Backend) {
  const container = document.createElement('div');
  container.style.width = '900px';
  container.style.height = '640px';
  document.body.append(container);
  const bars = BARS as unknown as Bar[];
  const datafeed = createDatafeed(bars);
  const telemetry: any[] = [];
  const workerResults: CapturedWorkerResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const widget = createTealchartWidget({
    container,
    symbol: 'BTCUSDT',
    interval: '60',
    datafeed: datafeed as any,
    autosize: false,
    theme: 'Dark',
    chartKey: 'product-path-corpus-' + backend + '-' + testCase.id,
    disable_default_layout_persistence: true,
    disableDebugOverlay: true,
    gapDetection: { enabled: false },
    createTealscriptWorker: () => createObservedWorker(workerResults),
    tealscriptExecutionBackend: backend as TealscriptExecutionBackend,
    enableTealscriptClosureBackend: backend === 'closure',
    resolveTealscriptRequestData: createRequestResolver(bars),
    onTealscriptError: (_scriptId: string, error: any) => {
      const message = error?.message ?? String(error);
      if (error?.severity === 'warning') warnings.push(message);
      else errors.push(message);
    },
    onTealscriptExecution: (summary: any) => telemetry.push(summary),
  } as any);
  try {
    await waitForChartReady(widget);
    const study = await widget.activeChart().createStudy(testCase.source, false, false, {}, {}, { displayName: testCase.id });
    if (!study) throw new Error('createStudy returned null');
    await waitForExecution(telemetry, 'full');
    const historical = capturePhase(widget, telemetry, workerResults, 'full');
    datafeed.emitRealtime(nextRealtimeBar(bars));
    await waitForExecution(telemetry, 'incremental');
    const realtime = capturePhase(widget, telemetry, workerResults, 'incremental');
    const last = telemetry[telemetry.length - 1] ?? {};
    return {
      ok: errors.length === 0,
      backend,
      requestedBackend: backend,
      actualBackend: last.executionMode,
      selectedBackend: last.selectedBackend,
      backendSelectionSource: last.backendSelectionSource,
      plots: realtime.plots,
      drawings: realtime.drawings,
      alerts: realtime.alerts,
      logs: realtime.logs,
      telemetry,
      warnings,
      errors,
      phases: { historical, realtime },
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return {
      ok: false,
      backend,
      requestedBackend: backend,
      actualBackend: telemetry.at(-1)?.executionMode,
      selectedBackend: telemetry.at(-1)?.selectedBackend,
      backendSelectionSource: telemetry.at(-1)?.backendSelectionSource,
      plots: [],
      drawings: [],
      alerts: [],
      logs: [],
      telemetry,
      warnings,
      errors,
      phases: {
        historical: { plots: [], drawings: [], alerts: [], logs: [] },
        realtime: { plots: [], drawings: [], alerts: [], logs: [] },
      },
    };
  } finally {
    widget.remove();
    container.remove();
  }
}

window.__runTealscriptProductPathCorpus = async () => {
  const rows = [];
  for (const [index, testCase] of CASES.entries()) {
    if (index % 10 === 0) {
      console.info('[product-path] ' + index + '/' + CASES.length);
    }
    const compiled = await runOne(testCase, 'compiled');
    const closure = await runOne(testCase, 'closure');
    rows.push({
      corpus: testCase.corpus,
      id: testCase.id,
      localPath: testCase.localPath,
      compiled,
      closure,
    });
  }
  console.info('[product-path] ' + CASES.length + '/' + CASES.length);
  return rows;
};
`;

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
