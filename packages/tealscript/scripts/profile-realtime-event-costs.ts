import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import type { CompiledScript } from '../src/runtime/codegen/compile.ts';
import { executeCompiled, tryCompile } from '../src/runtime/codegen/execute.ts';
import type { ClosureCompiledScript } from '../src/runtime/closure/execute.ts';
import { executeClosure, tryCompileClosure } from '../src/runtime/closure/execute.ts';
import type { Bar } from '../src/runtime/context.ts';
import { executeScript, TealscriptEngine, type TealscriptEngineOptions } from '../src/runtime/engine.ts';
import { parse } from '../src/parser/parser.ts';
import type { Program } from '../src/parser/ast.ts';
import type { ExternalCorpusReport, ExternalCorpusReportRow } from './run-external-pine-corpus.ts';
import { createSyntheticBars, SyntheticExternalCorpusRequestDatafeed } from './run-external-pine-corpus.ts';

type BackendName = 'interpreter' | 'compiled' | 'closure';
type RealtimeEventKind = 'append' | 'replace';

interface SubjectConfig {
  corpus: 'v1' | 'v2';
  localPath: string;
  label: string;
  reason: string;
}

interface PreparedSubject {
  config: SubjectConfig;
  row: ExternalCorpusReportRow;
  ast: Program;
  compiled: CompiledScript;
  closure: ClosureCompiledScript;
}

interface BackendMeasurement {
  backend: BackendName;
  historicalUsPerBar: number;
  realtimeEvents: Record<RealtimeEventKind, {
    usPerEvent: number;
    eventToHistoricalRunRatio: number;
  }>;
}

interface SubjectMeasurement {
  corpus: 'v1' | 'v2';
  localPath: string;
  scriptId: string;
  label: string;
  reason: string;
  barCounts: Array<{
    bars: number;
    backends: BackendMeasurement[];
    reconstructionToIncrementalReplaceRatio: Record<Exclude<BackendName, 'interpreter'>, number>;
  }>;
}

interface RealtimeEventCostReport {
  schemaVersion: 1;
  generatedAt: string;
  gitCommit: string;
  measurement: {
    timedRuns: number;
    barCounts: number[];
    eventToHistoricalRunRatio: string;
    eventModel: string;
    reconstructionToIncrementalRatio: string;
  };
  subjects: SubjectMeasurement[];
  summary: Array<{
    corpus: 'v1' | 'v2';
    localPath: string;
    label: string;
    worstReplaceToHistoricalRatio: number;
    worstReplaceBackend: BackendName;
    worstReplaceBars: number;
    replaceUsAtMaxBars: Record<BackendName, number>;
    reconstructionToIncrementalReplaceRatioAtMaxBars: Record<Exclude<BackendName, 'interpreter'>, number>;
  }>;
  conclusion: string[];
}

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');
const DEFAULT_OUTPUT = resolve(PACKAGE_ROOT, 'reports/realtime-event-cost-profile-t121.json');
const TIMED_RUNS = 3;
const BAR_COUNTS = [160, 1_000, 5_000];
const RUNTIME_NOW = Date.UTC(2024, 0, 1, 12, 0);
const SUBJECTS: SubjectConfig[] = [
  {
    corpus: 'v1',
    localPath: 'sources/0002__ADWilkinson__pinescript-indicators.pine',
    label: 'v1 control',
    reason: 'early dominated script outside the slow realtime clusters',
  },
  {
    corpus: 'v1',
    localPath: 'sources/0033__ArunKBhaskar__PineScript.txt',
    label: 'v1 slow early block',
    reason: 'the full realtime oracle spent minutes in the ArunKBhaskar block',
  },
  {
    corpus: 'v1',
    localPath: 'sources/0072__gocaman__Indicators.txt',
    label: 'v1 alert-heavy slow row',
    reason: 'remaining alert mismatch row from the gocaman slow section',
  },
];

function currentGitCommit(): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function prepareSubject(config: SubjectConfig): Promise<PreparedSubject> {
  const reportPath = resolve(PACKAGE_ROOT, `reports/external-pine-corpus-${config.corpus}.report.json`);
  const report = await readJson<ExternalCorpusReport>(reportPath);
  const row = report.rows.find((candidate) => candidate.localPath === config.localPath);
  if (!row) throw new Error(`No ${config.corpus} corpus row for ${config.localPath}`);
  const source = await readFile(resolve(report.inputDir, row.localPath), 'utf8');
  const ast = parse(source, { grammarSource: row.sourceFilePath ?? row.localPath });
  const compiled = tryCompile(ast);
  if (!compiled.success) {
    throw new Error(`Compiled backend does not support ${config.localPath}: ${compiled.unsupported.join('; ')}`);
  }
  const closure = tryCompileClosure(ast);
  if (!closure.success) {
    throw new Error(`Closure backend does not support ${config.localPath}: ${closure.unsupported.join('; ')}`);
  }
  return { config, row, ast, compiled, closure };
}

function eventBar(base: Bar, kind: RealtimeEventKind): Bar {
  if (kind === 'append') return { ...base };
  return {
    ...base,
    high: Math.max(base.high, base.close + 2.25),
    low: Math.min(base.low, base.close - 2.5),
    close: base.close + 1.75,
    volume: base.volume + 250,
  };
}

function optionsFor(bars: Bar[]): TealscriptEngineOptions {
  return {
    requestDatafeed: new SyntheticExternalCorpusRequestDatafeed(bars),
    runtime: { now: RUNTIME_NOW },
  };
}

function timedMedian(callback: () => void): number {
  const samples: number[] = [];
  for (let i = 0; i < TIMED_RUNS; i += 1) {
    const started = performance.now();
    callback();
    samples.push(performance.now() - started);
  }
  return median(samples);
}

function timedMedianPrepared(prepare: () => () => void): number {
  const samples: number[] = [];
  for (let i = 0; i < TIMED_RUNS; i += 1) {
    const callback = prepare();
    const started = performance.now();
    callback();
    samples.push(performance.now() - started);
  }
  return median(samples);
}

function measureHistorical(
  backend: BackendName,
  subject: PreparedSubject,
  bars: Bar[],
  options: TealscriptEngineOptions,
): number {
  const elapsedMs = timedMedian(() => {
    if (backend === 'interpreter') {
      executeScript(subject.ast, bars, undefined, options);
    } else if (backend === 'compiled') {
      executeCompiled(subject.compiled, bars, undefined, options);
    } else {
      executeClosure(subject.closure, bars, undefined, options);
    }
  });
  return (elapsedMs * 1_000) / bars.length;
}

function measureInterpreterRealtimeEvent(
  subject: PreparedSubject,
  bars: Bar[],
  kind: RealtimeEventKind,
): number {
  const eventIndex = kind === 'append' ? bars.length - 1 : bars.length - 1;
  const seedBars = kind === 'append' ? bars.slice(0, -1) : bars;
  const event = eventBar(bars[eventIndex]!, kind);
  const elapsedMs = timedMedianPrepared(() => {
    const options = optionsFor(bars);
    const engine = new TealscriptEngine(options);
    engine.execute(subject.ast, seedBars);
    return () => engine.updateBar(subject.ast, { ...event });
  });
  return elapsedMs * 1_000;
}

function measureGeneratedRealtimeEvent(
  backend: Exclude<BackendName, 'interpreter'>,
  subject: PreparedSubject,
  bars: Bar[],
  kind: RealtimeEventKind,
): number {
  const activeBars = kind === 'append'
    ? bars
    : [...bars.slice(0, -1), eventBar(bars.at(-1)!, kind)];
  const confirmedRealtimeBarStartIndex = activeBars.length - 1;
  const options = optionsFor(activeBars);
  const elapsedMs = timedMedian(() => {
    if (backend === 'compiled') {
      executeCompiled(subject.compiled, activeBars, undefined, {
        ...options,
        confirmedRealtimeBarStartIndex,
        realtimeLastBar: { isNew: kind === 'append' },
      });
    } else {
      executeClosure(subject.closure, activeBars, undefined, {
        ...options,
        confirmedRealtimeBarStartIndex,
        realtimeLastBar: { isNew: kind === 'append' },
      });
    }
  });
  return elapsedMs * 1_000;
}

function measureBackend(
  backend: BackendName,
  subject: PreparedSubject,
  bars: Bar[],
): BackendMeasurement {
  process.stderr.write(`[${subject.config.label}] ${bars.length} bars ${backend}\n`);
  const historicalOptions = optionsFor(bars);
  const historicalUsPerBar = measureHistorical(backend, subject, bars, historicalOptions);
  const historicalRunUs = historicalUsPerBar * bars.length;
  const appendUs = backend === 'interpreter'
    ? measureInterpreterRealtimeEvent(subject, bars, 'append')
    : measureGeneratedRealtimeEvent(backend, subject, bars, 'append');
  const replaceUs = backend === 'interpreter'
    ? measureInterpreterRealtimeEvent(subject, bars, 'replace')
    : measureGeneratedRealtimeEvent(backend, subject, bars, 'replace');
  return {
    backend,
    historicalUsPerBar: round(historicalUsPerBar),
    realtimeEvents: {
      append: {
        usPerEvent: round(appendUs),
        eventToHistoricalRunRatio: round(appendUs / historicalRunUs),
      },
      replace: {
        usPerEvent: round(replaceUs),
        eventToHistoricalRunRatio: round(replaceUs / historicalRunUs),
      },
    },
  };
}

async function buildReport(): Promise<RealtimeEventCostReport> {
  const subjects: SubjectMeasurement[] = [];
  for (const config of SUBJECTS) {
    const subject = await prepareSubject(config);
    const barCounts = BAR_COUNTS.map((count) => {
      const bars = createSyntheticBars(count);
      const backends = (['interpreter', 'compiled', 'closure'] as BackendName[]).map((backend) =>
        measureBackend(backend, subject, bars),
      );
      const byBackend = Object.fromEntries(backends.map((backend) => [backend.backend, backend])) as Record<BackendName, BackendMeasurement>;
      return {
        bars: count,
        backends,
        reconstructionToIncrementalReplaceRatio: {
          compiled: round(byBackend.compiled.realtimeEvents.replace.usPerEvent / byBackend.interpreter.realtimeEvents.replace.usPerEvent),
          closure: round(byBackend.closure.realtimeEvents.replace.usPerEvent / byBackend.interpreter.realtimeEvents.replace.usPerEvent),
        },
      };
    });
    subjects.push({
      corpus: config.corpus,
      localPath: config.localPath,
      scriptId: subject.row.id,
      label: config.label,
      reason: config.reason,
      barCounts,
    });
  }

  const summary = subjects.map((subject) => {
    let worstReplaceToHistoricalRatio = -Infinity;
    let worstReplaceBackend: BackendName = 'interpreter';
    let worstReplaceBars = 0;
    for (const point of subject.barCounts) {
      for (const backend of point.backends) {
        const ratio = backend.realtimeEvents.replace.eventToHistoricalRunRatio;
        if (ratio > worstReplaceToHistoricalRatio) {
          worstReplaceToHistoricalRatio = ratio;
          worstReplaceBackend = backend.backend;
          worstReplaceBars = point.bars;
        }
      }
    }
    const maxBarsPoint = subject.barCounts.at(-1)!;
    return {
      corpus: subject.corpus,
      localPath: subject.localPath,
      label: subject.label,
      worstReplaceToHistoricalRatio,
      worstReplaceBackend,
      worstReplaceBars,
      replaceUsAtMaxBars: Object.fromEntries(
        maxBarsPoint.backends.map((backend) => [backend.backend, backend.realtimeEvents.replace.usPerEvent]),
      ) as Record<BackendName, number>,
      reconstructionToIncrementalReplaceRatioAtMaxBars: maxBarsPoint.reconstructionToIncrementalReplaceRatio,
    };
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    gitCommit: currentGitCommit(),
    measurement: {
      timedRuns: TIMED_RUNS,
      barCounts: BAR_COUNTS,
      eventToHistoricalRunRatio:
        'single realtime event wall time divided by one full historical execution wall time for the same script/backend/bar count',
      eventModel:
        'interpreter measures TealscriptEngine.updateBar after a warmed historical execute; compiled and closure measure the production-style reconstructed realtime execution over the active bar window',
      reconstructionToIncrementalRatio:
        'compiled/closure same-time replacement event wall time divided by interpreter same-time replacement updateBar wall time for the same script and bar count',
    },
    subjects,
    summary,
    conclusion: [
      'This is measurement only. It separates broad realtime-event cost from script-specific pathological cost and does not change runtime behavior.',
      'Append and replace are reported separately because same-time replacement is the live-tick shape most likely to exercise rollback and replay cost.',
      'A reconstructionToIncrementalReplaceRatio materially above 1 means moving a runtime from incremental updateBar to generated reconstruction makes live ticks slower even if historical execution is faster.',
    ],
  };
}

async function main(): Promise<void> {
  const outputIndex = process.argv.indexOf('--output');
  const output = outputIndex >= 0 ? resolve(process.argv[outputIndex + 1]!) : DEFAULT_OUTPUT;
  const report = await buildReport();
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
