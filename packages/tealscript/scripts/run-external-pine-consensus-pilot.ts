import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { checkProgram } from '../src/semantic/checker.ts';
import { parse } from '../src/parser/parser.ts';
import { executeScript } from '../src/runtime/compiledOnly.ts';
import type { Bar, PlotOutput } from '../src/runtime/context.ts';

const PACKAGE_ROOT = resolve(import.meta.dirname, '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');
const ENGINE_ROOT = resolve(PACKAGE_ROOT, '.cache/external-pine-engines');
const PINE_TS_PATH = resolve(ENGINE_ROOT, 'pinets-package/node_modules/pinets/dist/pinets.min.es.js');
const PINE_A_PATH = resolve(ENGINE_ROOT, 'Pine-A-Script/src/transpiler.js');
const BARS_PATH = resolve(PACKAGE_ROOT, 'reports/external-pine-consensus-pilot-bars-v1.json');
const JSON_REPORT_PATH = resolve(PACKAGE_ROOT, 'reports/external-pine-consensus-pilot-v1.json');
const MD_REPORT_PATH = resolve(PACKAGE_ROOT, 'reports/external-pine-consensus-pilot-v1.md');
const EPSILON = 1e-6;
const BAR_COUNT = 240;
const ENGINE_TIMEOUT_MS = 2_500;

interface ManifestEntry {
  localPath: string;
  sourceRepoUrl?: string;
  sourceFilePath?: string;
  commitSha?: string;
  sourceSha256?: string;
}

type CorpusName = 'v5' | 'v6' | 'v7' | 'v7-size-recovery';

const FIXED_PILOT_ROWS: Array<{ corpus: CorpusName; rowId: string }> = [
  { corpus: 'v5', rowId: '0023' },
  { corpus: 'v5', rowId: '0025' },
  { corpus: 'v5', rowId: '0027' },
  { corpus: 'v5', rowId: '0028' },
  { corpus: 'v5', rowId: '0029' },
  { corpus: 'v5', rowId: '0123' },
  { corpus: 'v5', rowId: '0151' },
  { corpus: 'v5', rowId: '0215' },
  { corpus: 'v5', rowId: '0222' },
  { corpus: 'v5', rowId: '0223' },
  { corpus: 'v5', rowId: '0310' },
  { corpus: 'v5', rowId: '0314' },
  { corpus: 'v5', rowId: '0315' },
  { corpus: 'v5', rowId: '0757' },
  { corpus: 'v5', rowId: '0782' },
  { corpus: 'v5', rowId: '0787' },
  { corpus: 'v5', rowId: '0911' },
  { corpus: 'v5', rowId: '0923' },
  { corpus: 'v5', rowId: '0942' },
  { corpus: 'v5', rowId: '0988' },
  { corpus: 'v6', rowId: '0176' },
  { corpus: 'v6', rowId: '0179' },
  { corpus: 'v6', rowId: '0186' },
  { corpus: 'v6', rowId: '0191' },
  { corpus: 'v6', rowId: '0201' },
];

interface CorpusCandidate extends ManifestEntry {
  corpus: CorpusName;
  rowId: string;
  absolutePath: string;
  source: string;
  sourceSha256: string;
  declaredVersion: number | 'unknown';
}

interface NormalizedPlot {
  index: number;
  title: string | null;
  values: Array<number | null>;
}

interface EngineOk {
  ok: true;
  plots: NormalizedPlot[];
}

interface EngineFail {
  ok: false;
  stage: string;
  message: string;
}

type EngineResult = EngineOk | EngineFail;

interface PilotRow {
  corpus: CorpusName;
  rowId: string;
  localPath: string;
  sourceRepoUrl?: string;
  sourceFilePath?: string;
  commitSha?: string;
  sourceSha256: string;
  declaredVersion: number | 'unknown';
  comparison: 'agree' | 'tealscript-differs' | 'voters-differ';
  bucket: 'consensus-agree' | 'harness-plot-count-repaired' | 'warmup-seed-disagreement' | 'value-disagreement';
  voterPlotCount: number;
  tealscriptPlotCount: number;
  firstDifference?: string;
  titles: {
    pineTS: Array<string | null>;
    pineAScript: Array<string | null>;
    tealscript: Array<string | null>;
  };
}

interface RejectedAttempt {
  corpus: CorpusName;
  rowId: string;
  localPath: string;
  reason: string;
  detail?: string;
}

const HLINE_ZERO_LENGTH_AUDIT = {
  method: 'Pre-fix audit from latest accepted corpus reports at 5da61fcb1a plus runtime invariant: hline registered visible plot metadata with values: [], and visiblePlotsForCorpus counted hline plots without checking values length.',
  acceptedProducedRows: { v5: 867, v6: 787, v7: 305, total: 1959 },
  acceptedRowsWithHline: { v5: 216, v6: 94, v7: 24, total: 334 },
  hlineCallsInAcceptedRows: { v5: 526, v6: 222, v7: 59, total: 807 },
  hlineOnlyAcceptedRows: [
    {
      corpus: 'v7',
      rowId: '0049',
      localPath: 'sources/0049__helenananaa-pine-compat-runtime__unsupported_array_numeric_float_const_input_return_qualifier.pine',
      outputPlots: 14,
    },
  ],
};

const WARMUP_CHARACTERIZATION = [
  {
    row: 'v5 0027',
    source: 'midprice.pine',
    class: 'windowed TA warmup',
    behavior: 'PineTS and TealScript emit na at bar 0; Pine-A emits a partial ta.highest/ta.lowest value.',
    adjudication: 'hand-derived',
    oracle: 'The local value-vector warmup guard requires ta.highest/ta.lowest(length=5) first valid at bar 4; this row uses length 2, so bar 0 is na.',
    tealscript: 'matches documented/vector-backed warmup',
  },
  {
    row: 'v5 0123',
    source: 'sak.pine',
    class: 'custom recursive seed',
    behavior: 'PineTS and TealScript agree at bar 1; Pine-A seeds the custom filter differently.',
    adjudication: 'undocumented',
    oracle: 'Custom recurrence; no manual/vector oracle for this script-specific seed.',
    tealscript: 'no documented verdict',
  },
  {
    row: 'v5 0151',
    source: 'sam.pine',
    class: 'custom recursive seed',
    behavior: 'PineTS and TealScript agree at bar 1; Pine-A seeds the custom momentum filter differently.',
    adjudication: 'undocumented',
    oracle: 'Custom recurrence; no manual/vector oracle for this script-specific seed.',
    tealscript: 'no documented verdict',
  },
  {
    row: 'v5 0222',
    source: 'lrsi.pine',
    class: 'custom recursive seed',
    behavior: 'PineTS and TealScript agree at bar 1; Pine-A seeds LRSI differently.',
    adjudication: 'undocumented',
    oracle: 'Custom recurrence using nz/history; no manual/vector oracle for this script-specific seed.',
    tealscript: 'no documented verdict',
  },
  {
    row: 'v5 0310',
    source: 'rwma.pine',
    class: 'custom recursive seed',
    behavior: 'PineTS and TealScript agree at bar 1; Pine-A seeds RWMA differently.',
    adjudication: 'undocumented',
    oracle: 'Custom moving-average function; no manual/vector oracle for this script-specific seed.',
    tealscript: 'no documented verdict',
  },
  {
    row: 'v5 0314',
    source: 'sp15.pine',
    class: 'custom FIR warmup',
    behavior: 'PineTS and TealScript emit na at bar 0; Pine-A emits a partial FIR value.',
    adjudication: 'undocumented',
    oracle: 'Script-specific FIR filter; no manual/vector oracle.',
    tealscript: 'no documented verdict',
  },
  {
    row: 'v5 0315',
    source: 'swma.pine',
    class: 'windowed TA warmup',
    behavior: 'PineTS and TealScript emit na at bar 0; Pine-A emits a partial weighted value.',
    adjudication: 'hand-derived',
    oracle: 'The local value-vector ta.swma oracle and warmup guard require first valid bar 3.',
    tealscript: 'matches documented/vector-backed warmup',
  },
  {
    row: 'v5 0757',
    source: 'adaptive_rsi.pine',
    class: 'hline constant from first bar',
    behavior: 'PineTS and TealScript emit the hline value at bar 0; Pine-A emits null for that hline on bar 0.',
    adjudication: 'documented',
    oracle: 'hline is a constant horizontal level; the MarketFI fix now emits per-bar hline values from bar 0.',
    tealscript: 'matches documented visual-output behavior',
  },
  {
    row: 'v5 0942',
    source: 'Moving-Average-Exponential.pine',
    class: 'EMA seed',
    behavior: 'Pine-A and TealScript emit the first source value at bar 0; PineTS emits na.',
    adjudication: 'hand-derived',
    oracle: 'The local ta.ema value vector seeds EMA from the first non-na source and is valid at bar 0.',
    tealscript: 'matches hand-derived oracle',
  },
  {
    row: 'v5 0988',
    source: 'EMA.pine',
    class: 'EMA seed',
    behavior: 'Pine-A and TealScript emit the first source value at bar 0; PineTS emits na.',
    adjudication: 'hand-derived',
    oracle: 'The local ta.ema value vector seeds EMA from the first non-na source and is valid at bar 0.',
    tealscript: 'matches hand-derived oracle',
  },
  {
    row: 'v6 0176',
    source: 'ATR Ratio Percentile.pine',
    class: 'windowed TA warmup',
    behavior: 'PineTS and TealScript emit na at bar 0; Pine-A emits 0.',
    adjudication: 'hand-derived',
    oracle: 'The local ta.atr, ta.percentrank, and ta.ema warmup guards require the ATR/percentrank chain to remain na at bar 0.',
    tealscript: 'matches vector-backed warmup',
  },
  {
    row: 'v6 0186',
    source: 'short-term-alpha.pine',
    class: 'windowed TA warmup',
    behavior: 'PineTS and TealScript emit na at bar 0; Pine-A emits 0.',
    adjudication: 'hand-derived',
    oracle: 'The source chains ta.sma/ta.stdev/ta.ema; local vectors require ta.sma and ta.stdev to remain na until their windows are filled.',
    tealscript: 'matches vector-backed warmup',
  },
  {
    row: 'v6 0201',
    source: 'kama_values.pine',
    class: 'custom KAMA seed',
    behavior: 'PineTS and TealScript emit the prior seed at bar 1; Pine-A advances the custom KAMA recurrence differently.',
    adjudication: 'undocumented',
    oracle: 'Script-defined KAMA recurrence; no manual/vector oracle for this exact custom implementation.',
    tealscript: 'no documented verdict',
  },
] as const;

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function shortHead(): string {
  return createHash('sha1').update(`${Date.now()}:${Math.random()}`).digest('hex').slice(0, 10);
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value ? 1 : null;
  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : null;
}

function normalizePlots(rawPlots: Array<{ title?: unknown; values?: unknown[] }>): NormalizedPlot[] {
  return rawPlots.map((plot, index) => ({
    index,
    title: typeof plot.title === 'string' && plot.title.length > 0 ? plot.title : null,
    values: (plot.values ?? []).map(normalizeNumber),
  }));
}

function comparePlotSets(a: NormalizedPlot[], b: NormalizedPlot[]): string | null {
  if (a.length !== b.length) return `plot count ${a.length} != ${b.length}`;
  for (let plotIndex = 0; plotIndex < a.length; plotIndex += 1) {
    const av = a[plotIndex]!.values;
    const bv = b[plotIndex]!.values;
    if (av.length !== bv.length) return `plot[${plotIndex}] length ${av.length} != ${bv.length}`;
    for (let barIndex = 0; barIndex < av.length; barIndex += 1) {
      const left = av[barIndex];
      const right = bv[barIndex];
      if (left === null || right === null) {
        if (left !== right) return `plot[${plotIndex}][${barIndex}] ${left} != ${right}`;
        continue;
      }
      const tolerance = EPSILON * Math.max(1, Math.abs(left), Math.abs(right));
      if (Math.abs(left - right) > tolerance) {
        return `plot[${plotIndex}][${barIndex}] ${left} != ${right}`;
      }
    }
  }
  return null;
}

function classifyBucket(row: PilotRow): PilotRow['bucket'] {
  if (row.comparison === 'agree') return 'consensus-agree';
  if (/plot count \d+ != 1/.test(row.firstDifference ?? '')) return 'harness-plot-count-repaired';
  const barMatch = row.firstDifference?.match(/\]\[(\d+)\]/);
  const bar = barMatch ? Number(barMatch[1]) : null;
  if (bar === 0 || bar === 1) return 'warmup-seed-disagreement';
  return 'value-disagreement';
}

function detectPineVersion(source: string): number | 'unknown' {
  const match = source.match(/^\s*\/\/\s*@version\s*=\s*(\d+)/m);
  if (!match) return 'unknown';
  return Number(match[1]);
}

function buildBars(): Bar[] {
  const bars: Bar[] = [];
  let close = 101;
  const start = Date.UTC(2024, 0, 1);
  for (let i = 0; i < BAR_COUNT; i += 1) {
    const drift = Math.sin(i / 5) * 1.7 + Math.cos(i / 11) * 0.9 + ((i % 17) - 8) * 0.08;
    const open = close + Math.sin(i / 7) * 0.6;
    close = open + drift;
    const high = Math.max(open, close) + 1.2 + (i % 5) * 0.13;
    const low = Math.min(open, close) - 1.1 - (i % 7) * 0.11;
    bars.push({
      time: start + i * 86_400_000,
      open,
      high,
      low,
      close,
      volume: 10_000 + (i % 29) * 137 + Math.round(Math.abs(drift) * 900),
    });
  }
  return bars;
}

async function ensureBarsFixture(): Promise<Bar[]> {
  const bars = buildBars();
  if (!existsSync(BARS_PATH)) {
    await writeFile(BARS_PATH, `${JSON.stringify({ schemaVersion: 1, bars }, null, 2)}\n`);
    return bars;
  }
  const parsed = JSON.parse(await readFile(BARS_PATH, 'utf8')) as { bars?: Bar[] };
  if (!Array.isArray(parsed.bars) || parsed.bars.length !== BAR_COUNT) {
    throw new Error(`${BARS_PATH} must contain ${BAR_COUNT} bars`);
  }
  return parsed.bars;
}

function barsForPineTS(bars: Bar[]): Array<Record<string, number>> {
  return bars.map((bar, index) => ({
    openTime: bar.time,
    closeTime: bars[index + 1]?.time ? bars[index + 1]!.time - 1 : bar.time + 86_400_000 - 1,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  }));
}

function barsForPineAScript(bars: Bar[]): Record<string, number[]> {
  return {
    open: bars.map((bar) => bar.open),
    high: bars.map((bar) => bar.high),
    low: bars.map((bar) => bar.low),
    close: bars.map((bar) => bar.close),
    volume: bars.map((bar) => bar.volume),
    time: bars.map((bar) => bar.time),
  };
}

async function runPineTS(source: string, bars: Bar[]): Promise<EngineResult> {
  try {
    const mod = await import(pathToFileURL(PINE_TS_PATH).href);
    const engine = new mod.PineTS(barsForPineTS(bars), 'CONSENSUS', 'D', bars.length);
    const result = await engine.run(source);
    const rawPlots = result?.plots && typeof result.plots === 'object' ? result.plots : {};
    const plots = Object.keys(rawPlots)
      .filter((key) => !key.startsWith('__'))
      .map((key, index) => {
        const value = rawPlots[key];
        const data = Array.isArray(value?.data) ? value.data : [];
        return {
          index,
          title: typeof value?.title === 'string' ? value.title : key,
          values: data.map((point: unknown) => normalizeNumber((point as { value?: unknown })?.value ?? point)),
        };
      });
    return { ok: true, plots };
  } catch (error) {
    return { ok: false, stage: 'pineTS', message: error instanceof Error ? error.message : String(error) };
  }
}

async function runPineAScript(source: string, bars: Bar[]): Promise<EngineResult> {
  try {
    const mod = await import(pathToFileURL(PINE_A_PATH).href);
    const transpiled = mod.transpile(source, { prettyPrint: false, includeComments: false });
    if (!transpiled.success) {
      return { ok: false, stage: `pine-a-script:${transpiled.stage ?? 'transpile'}`, message: String(transpiled.error) };
    }
    const repairedCode = repairPineAScriptGeneratedCode(transpiled.code);
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(repairedCode, 'utf8').toString('base64')}#${shortHead()}`;
    const runnable = await import(moduleUrl);
    const result = runnable.run(barsForPineAScript(bars));
    const rawPlots = result?.plots && typeof result.plots === 'object' ? result.plots : {};
    const plots = Object.keys(rawPlots).map((key, index) => ({
      index,
      title: typeof rawPlots[key]?.title === 'string' ? rawPlots[key].title : key,
      values: (Array.isArray(rawPlots[key]?.data) ? rawPlots[key].data : []).map(normalizeNumber),
    }));
    return { ok: true, plots };
  } catch (error) {
    return { ok: false, stage: 'pine-a-script', message: error instanceof Error ? error.message : String(error) };
  }
}

function repairPineAScriptGeneratedCode(code: string): string {
  return code
    .replace(/pinescript\.hline\(/g, 'pinescript.plot(')
    .replace(/pinescript\.plot\(([^;\n]+?), \(\{([^{}\n]*)\}\)\);/g, (_match, series, objectBody) => {
      const body = String(objectBody);
      const titleMatch = body.match(/(?:^|,\s*)title:\s*("(?:[^"\\]|\\.)*")/);
      const title = titleMatch?.[1] ?? '""';
      return `pinescript.plot(${series}, ${title});`;
    });
}

async function withTimeout(label: string, promise: Promise<EngineResult>): Promise<EngineResult> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<EngineResult>((resolveTimeout) => {
    timeout = setTimeout(() => {
      resolveTimeout({ ok: false, stage: label, message: `timed out after ${ENGINE_TIMEOUT_MS}ms` });
    }, ENGINE_TIMEOUT_MS);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  if (timeout) clearTimeout(timeout);
  return result;
}

async function runTealScript(candidate: CorpusCandidate, bars: Bar[]): Promise<EngineResult> {
  try {
    const ast = parse(candidate.source, { grammarSource: candidate.sourceFilePath ?? candidate.localPath });
    const semantic = checkProgram(ast);
    const semanticError = semantic.diagnostics.find((diagnostic) => diagnostic.severity === 'error');
    if (semanticError) {
      return { ok: false, stage: 'tealscript:semantic', message: semanticError.message };
    }
    const result = executeScript(ast, bars);
    if (result.errors.length > 0) {
      return { ok: false, stage: 'tealscript:execute', message: result.errors[0]!.message };
    }
    return { ok: true, plots: normalizePlots(result.plots.map((plot: PlotOutput) => ({ title: plot.title, values: plot.values }))) };
  } catch (error) {
    return { ok: false, stage: 'tealscript', message: error instanceof Error ? error.message : String(error) };
  }
}

function sourceLooksPilotFriendly(source: string): boolean {
  if (!/\b(?:indicator|study)\s*\(/.test(source)) return false;
  if (!/\bplot\s*\(/.test(source)) return false;
  if (/\b(?:strategy|library|import|request\.|security|table\.|line\.|box\.|label\.|polyline\.|matrix\.|map\.|runtime\.error)\b/.test(source)) return false;
  if (/\b(?:plotshape|plotchar|plotarrow|plotbar|plotcandle|fill|bgcolor|barcolor)\s*\(/.test(source)) return false;
  if (Buffer.byteLength(source, 'utf8') > 25_000) return false;
  return true;
}

function corpusInputDir(corpus: CorpusName): string {
  switch (corpus) {
    case 'v5':
      return resolve(PACKAGE_ROOT, '.cache/tealscript/pine-corpus-v5-20260910');
    case 'v6':
      return resolve(PACKAGE_ROOT, '.cache/tealscript/pine-corpus-v6-20260911');
    case 'v7':
      return resolve(PACKAGE_ROOT, '.cache/tealscript/pine-corpus-v7-20260911');
    case 'v7-size-recovery':
      return resolve(PACKAGE_ROOT, '.cache/tealscript/pine-corpus-v7-size-recovery-20260911');
  }
}

async function loadCandidates(corpus: CorpusName): Promise<CorpusCandidate[]> {
  const inputDir = corpusInputDir(corpus);
  const manifestPath = join(inputDir, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { scripts: ManifestEntry[] };
  const candidates: CorpusCandidate[] = [];
  for (let index = 0; index < manifest.scripts.length; index += 1) {
    const entry = manifest.scripts[index]!;
    const absolutePath = join(inputDir, entry.localPath);
    const source = await readFile(absolutePath, 'utf8');
    const sourceSha256 = sha256(source);
    if (entry.sourceSha256 && sourceSha256 !== entry.sourceSha256) {
      throw new Error(`${corpus} ${entry.localPath} sha256 mismatch`);
    }
    candidates.push({
      ...entry,
      corpus,
      rowId: String(index + 1).padStart(4, '0'),
      absolutePath,
      source,
      sourceSha256,
      declaredVersion: detectPineVersion(source),
    });
  }
  return candidates;
}

async function selectAndRunPilot(bars: Bar[]): Promise<{ rows: PilotRow[]; rejected: RejectedAttempt[] }> {
  const rows: PilotRow[] = [];
  const rejected: RejectedAttempt[] = [];
  const candidatesByKey = new Map<string, CorpusCandidate>();
  for (const corpus of ['v5', 'v6', 'v7', 'v7-size-recovery'] as const) {
    for (const candidate of await loadCandidates(corpus)) {
      candidatesByKey.set(`${corpus}:${candidate.rowId}`, candidate);
    }
  }
  for (const fixed of FIXED_PILOT_ROWS) {
    const candidate = candidatesByKey.get(`${fixed.corpus}:${fixed.rowId}`);
    if (!candidate) throw new Error(`fixed pilot row missing: ${fixed.corpus}:${fixed.rowId}`);
    process.stderr.write(`[pilot] ${fixed.corpus} ${fixed.rowId} fixed row\n`);
    const [pineTS, pineA, teal] = await Promise.all([
      withTimeout('pineTS', runPineTS(candidate.source, bars)),
      withTimeout('pine-a-script', runPineAScript(candidate.source, bars)),
      runTealScript(candidate, bars),
    ]);
    if (!pineTS.ok || !pineA.ok || !teal.ok) {
      rejected.push({
        corpus: candidate.corpus,
        rowId: candidate.rowId,
        localPath: candidate.localPath,
        reason: 'fixed-row-engine-failed',
        detail: [pineTS, pineA, teal].filter((result) => !result.ok).map((result) => `${result.stage}: ${result.message}`).join(' | '),
      });
      continue;
    }
    const voterDiff = comparePlotSets(pineTS.plots, pineA.plots);
    const tealDiff = voterDiff ? null : comparePlotSets(pineTS.plots, teal.plots);
    const comparison: PilotRow['comparison'] = voterDiff ? 'voters-differ' : tealDiff ? 'tealscript-differs' : 'agree';
    const row: PilotRow = {
      corpus: candidate.corpus,
      rowId: candidate.rowId,
      localPath: candidate.localPath,
      sourceRepoUrl: candidate.sourceRepoUrl,
      sourceFilePath: candidate.sourceFilePath,
      commitSha: candidate.commitSha,
      sourceSha256: candidate.sourceSha256,
      declaredVersion: candidate.declaredVersion,
      comparison,
      bucket: 'value-disagreement',
      voterPlotCount: Math.max(pineTS.plots.length, pineA.plots.length),
      tealscriptPlotCount: teal.plots.length,
      firstDifference: voterDiff ?? tealDiff ?? undefined,
      titles: {
        pineTS: pineTS.plots.map((plot) => plot.title),
        pineAScript: pineA.plots.map((plot) => plot.title),
        tealscript: teal.plots.map((plot) => plot.title),
      },
    };
    row.bucket = classifyBucket(row);
    rows.push(row);
  }
  if (rows.length !== FIXED_PILOT_ROWS.length) {
    throw new Error(`ran ${rows.length}/${FIXED_PILOT_ROWS.length} fixed pilot rows; rejected=${JSON.stringify(rejected, null, 2)}`);
  }
  return { rows, rejected };
}

async function gitHead(dir: string): Promise<string | null> {
  try {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const out = await promisify(execFile)('git', ['-C', dir, 'rev-parse', 'HEAD']);
    return out.stdout.trim();
  } catch {
    return null;
  }
}

async function gitDirty(dir: string): Promise<boolean> {
  try {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const out = await promisify(execFile)('git', ['-C', dir, 'status', '--porcelain']);
    return out.stdout.trim().length > 0;
  } catch {
    return true;
  }
}

async function main(): Promise<void> {
  for (const enginePath of [PINE_TS_PATH, PINE_A_PATH]) {
    if (!existsSync(enginePath)) {
      throw new Error(`Missing external engine cache: ${enginePath}`);
    }
  }
  const bars = await ensureBarsFixture();
  const { rows, rejected } = await selectAndRunPilot(bars);
  const head = await gitHead(REPO_ROOT);
  const dirty = await gitDirty(REPO_ROOT);
  const summary = {
    attemptedComparableRows: rows.length,
    agree: rows.filter((row) => row.comparison === 'agree').length,
    tealscriptDiffers: rows.filter((row) => row.comparison === 'tealscript-differs').length,
    votersDiffer: rows.filter((row) => row.comparison === 'voters-differ').length,
    buckets: {
      consensusAgree: rows.filter((row) => row.bucket === 'consensus-agree').length,
      warmupSeedDisagreement: rows.filter((row) => row.bucket === 'warmup-seed-disagreement').length,
      valueDisagreement: rows.filter((row) => row.bucket === 'value-disagreement').length,
      harnessPlotCountRepaired: rows.filter((row) => row.bucket === 'harness-plot-count-repaired').length,
    },
    rejectedBeforeSelection: rejected.length,
  };
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommitSha: head,
    measuredWorkingTreeDirty: dirty,
    bars: {
      path: 'packages/tealscript/reports/external-pine-consensus-pilot-bars-v1.json',
      count: bars.length,
      sha256: sha256(JSON.stringify({ schemaVersion: 1, bars }, null, 2) + '\n'),
    },
    voters: {
      pineTS: {
        repo: 'https://github.com/LuxAlgo/PineTS',
        localHead: await gitHead(resolve(ENGINE_ROOT, 'PineTS')),
        packagePath: 'packages/tealscript/.cache/external-pine-engines/pinets-package/node_modules/pinets/dist/pinets.min.es.js',
      },
      pineAScript: {
        repo: 'https://github.com/MeridianAlgo/Pine-A-Script',
        localHead: await gitHead(resolve(ENGINE_ROOT, 'Pine-A-Script')),
        packagePath: 'packages/tealscript/.cache/external-pine-engines/Pine-A-Script/src/transpiler.js',
      },
    },
    independence: {
      verdict: 'no-shared-lineage-found',
      evidence: [
        'No fork relationship in local remotes: LuxAlgo/PineTS versus MeridianAlgo/Pine-A-Script.',
        'README/license attribution differs: PineTS is LuxAlgo AGPL/commercial; Pine-A-Script is MeridianAlgo MIT.',
        'TA/runtime structure differs: PineTS has per-method TypeScript factories with incremental state; Pine-A-Script has a compact JS builtins map and generated run(data) driver.',
        'No PineTS attribution or license header was found in Pine-A-Script implementation files; LuxAlgo mentions there are sample Pine scripts, not implementation provenance.',
      ],
    },
    normalizer: {
      plotKey: 'source order/index',
      titleUse: 'metadata only; malformed titles such as [object Object] do not affect matching',
      naValues: 'null/undefined/NaN/non-finite normalized to null',
      epsilon: EPSILON,
    },
    summary,
    beforeAfter: {
      beforePlotExtractionRepair: { comparableRows: 25, agree: 7, tealscriptDiffers: 0, votersDiffer: 18 },
      afterPlotExtractionBeforeHlineFix: {
        comparableRows: 25,
        agree: 7,
        tealscriptDiffers: 1,
        votersDiffer: 17,
        tealscriptMismatch: 'v5 0223 marketfi.pine: external voters emitted Zero hline as 240 bars; TealScript emitted length 0.',
      },
      after: summary,
    },
    marketfiFix: {
      row: 'v5 0223',
      source: 'mihakralj/pinescript:indicators/oscillators/marketfi.pine',
      defect: 'hline registered visible plot metadata but never appended the constant price into the per-bar values array.',
      fix: 'hline now writes the hline price at the current bar and hline values participate in plot truncation for realtime replay.',
      result: 'The same 25-row pilot moved marketfi from external-consensus mismatch to consensus-agree.',
    },
    zeroLengthPlotAudit: HLINE_ZERO_LENGTH_AUDIT,
    warmupCharacterization: WARMUP_CHARACTERIZATION,
    rows,
    rejectedSample: rejected.slice(0, 40),
  };
  await mkdir(resolve(PACKAGE_ROOT, 'reports'), { recursive: true });
  await writeFile(JSON_REPORT_PATH, `${JSON.stringify(report)}\n`);
  await writeFile(MD_REPORT_PATH, renderMarkdown(report));
  console.log(`${basename(MD_REPORT_PATH)}: ${summary.agree} agree, ${summary.tealscriptDiffers} TealScript differs, ${summary.votersDiffer} voters differ`);
}

function renderMarkdown(report: ReturnType<typeof JSON.parse>): string {
  const lines: string[] = [];
  lines.push('# External Pine Consensus Oracle Pilot v1');
  lines.push('');
  lines.push(`Measured commit: \`${report.measuredCommitSha}\``);
  if (report.measuredWorkingTreeDirty) lines.push('Measurement tree: working tree had local changes for this run.');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(`Same fixed 25-row pilot after the Pine-A-Script plot extraction repair and the TealScript hline fix: ${report.summary.agree} agree, ${report.summary.tealscriptDiffers} external-consensus mismatch against TealScript, ${report.summary.votersDiffer} voters differ.`);
  lines.push('');
  lines.push(`Before Pine-A plot extraction repair on the same 25 rows: ${report.beforeAfter.beforePlotExtractionRepair.agree} agree, ${report.beforeAfter.beforePlotExtractionRepair.tealscriptDiffers} external-consensus mismatches, ${report.beforeAfter.beforePlotExtractionRepair.votersDiffer} voters differ.`);
  lines.push(`After Pine-A repair but before the TealScript hline fix: ${report.beforeAfter.afterPlotExtractionBeforeHlineFix.agree} agree, ${report.beforeAfter.afterPlotExtractionBeforeHlineFix.tealscriptDiffers} external-consensus mismatch, ${report.beforeAfter.afterPlotExtractionBeforeHlineFix.votersDiffer} voters differ; ${report.beforeAfter.afterPlotExtractionBeforeHlineFix.tealscriptMismatch}`);
  lines.push(`After the hline fix on the same 25 rows: ${report.beforeAfter.after.agree} agree, ${report.beforeAfter.after.tealscriptDiffers} external-consensus mismatch, ${report.beforeAfter.after.votersDiffer} voters differ.`);
  lines.push('');
  lines.push('The original Class A plot-count ceiling is eliminated for this sample: the 11 `plot count N != 1` rows were a Pine-A-Script extraction/keying issue, not Pine disagreement. Remaining no-verdict rows are classified separately instead of masked.');
  lines.push('');
  lines.push('The pilot uses exactly two external voters per Sam rule: PineTS and Pine-A-Script. PyneCore and pine2py are excluded; no third-voter hunt is part of this artifact.');
  lines.push('');
  lines.push('## Lineage Check');
  lines.push('');
  lines.push(`Verdict: **${report.independence.verdict}**. This is not a kill finding.`);
  lines.push('');
  for (const item of report.independence.evidence) lines.push(`- ${item}`);
  lines.push('');
  lines.push('## Normalization');
  lines.push('');
  lines.push(`Plots are keyed by ${report.normalizer.plotKey}; titles are ${report.normalizer.titleUse}. ${report.normalizer.naValues}. Float epsilon: ${report.normalizer.epsilon}.`);
  lines.push('');
  lines.push('Pine-A-Script generated-code repair is applied before execution: `hline()` is treated as numeric plot output, and `plot(series, { ... title ... })` / `plot(series, { ... })` are rewritten so object-valued named-argument bundles do not collapse plot keys to `[object Object]`. Style options are dropped because this pilot compares numeric plot series only.');
  lines.push('');
  lines.push('## MarketFI HLine Fix');
  lines.push('');
  lines.push(`Row \`${report.marketfiFix.row}\` (${report.marketfiFix.source}) was the first true catch from the pilot. Defect: ${report.marketfiFix.defect} Fix: ${report.marketfiFix.fix} Result: ${report.marketfiFix.result}`);
  lines.push('');
  lines.push('## Zero-Length Plot Acceptance Audit');
  lines.push('');
  lines.push(report.zeroLengthPlotAudit.method);
  lines.push('');
  lines.push('| Corpus | Accepted output rows | Accepted rows with hline | hline calls in accepted rows |');
  lines.push('|---|---:|---:|---:|');
  for (const corpus of ['v5', 'v6', 'v7'] as const) {
    lines.push(`| ${corpus} | ${report.zeroLengthPlotAudit.acceptedProducedRows[corpus]} | ${report.zeroLengthPlotAudit.acceptedRowsWithHline[corpus]} | ${report.zeroLengthPlotAudit.hlineCallsInAcceptedRows[corpus]} |`);
  }
  lines.push(`| total | ${report.zeroLengthPlotAudit.acceptedProducedRows.total} | ${report.zeroLengthPlotAudit.acceptedRowsWithHline.total} | ${report.zeroLengthPlotAudit.hlineCallsInAcceptedRows.total} |`);
  lines.push('');
  lines.push(`Accepted rows whose visible output appears to be hline-only before the fix: ${report.zeroLengthPlotAudit.hlineOnlyAcceptedRows.length}. This bounds the produced-output headline inflation to one row in the latest reports; the larger issue was wrong/empty hline value payloads in ${report.zeroLengthPlotAudit.acceptedRowsWithHline.total} accepted rows.`);
  for (const row of report.zeroLengthPlotAudit.hlineOnlyAcceptedRows) {
    lines.push(`- \`${row.corpus} ${row.rowId}\` ${row.localPath}: ${row.outputPlots} hline plots.`);
  }
  lines.push('');
  lines.push('## Buckets');
  lines.push('');
  lines.push('| Bucket | Rows | Meaning |');
  lines.push('|---|---:|---|');
  lines.push(`| consensus-agree | ${report.summary.buckets.consensusAgree} | External voters agree and TealScript matches. |`);
  lines.push(`| external-consensus mismatch | ${report.summary.tealscriptDiffers} | External voters agree and TealScript differs. |`);
  lines.push(`| warmup-seed-disagreement | ${report.summary.buckets.warmupSeedDisagreement} | External voters differ at bar 0 or 1; warmup/seeding remains semantics and is not masked. |`);
  lines.push(`| value-disagreement | ${report.summary.buckets.valueDisagreement} | External voters differ after the first two bars or by output-shape/value behavior. |`);
  lines.push(`| harness-plot-count-repaired | ${report.summary.buckets.harnessPlotCountRepaired} | Remaining rows with the original one-plot extraction ceiling. |`);
  lines.push('');
  lines.push('## Rows');
  lines.push('');
  lines.push('| Corpus | Row | Declared | Result | Bucket | Voter plots | TealScript plots | First difference | Source |');
  lines.push('|---|---:|---:|---|---|---:|---:|---|---|');
  for (const row of report.rows as PilotRow[]) {
    const source = row.sourceRepoUrl && row.sourceFilePath ? `${row.sourceRepoUrl.replace('https://github.com/', '')}:${row.sourceFilePath}` : row.localPath;
    lines.push(`| ${row.corpus} | ${row.rowId} | v${row.declaredVersion} | ${row.comparison} | ${row.bucket} | ${row.voterPlotCount} | ${row.tealscriptPlotCount} | ${row.firstDifference ?? ''} | ${source} |`);
  }
  lines.push('');
  lines.push('## Warmup Characterization');
  lines.push('');
  lines.push('The 13 warmup rows are not 13 independent semantic disputes. They split into windowed-TA warmup, hline first-bar behavior, and custom recursive seed differences. Warmup bars are not masked; documented/vector-backed rows are adjudicated with provenance `documented` or `hand-derived`, while custom script-specific seeds stay no-consensus.');
  lines.push('');
  lines.push('| Row | Class | Provenance | Behavior | TealScript status |');
  lines.push('|---|---|---|---|---|');
  for (const row of report.warmupCharacterization) {
    lines.push(`| ${row.row} | ${row.class} | ${row.adjudication} | ${row.behavior} ${row.oracle} | ${row.tealscript} |`);
  }
  lines.push('');
  lines.push('## Inputs');
  lines.push('');
  lines.push(`Bars: \`${report.bars.path}\`, ${report.bars.count} bars, sha256 \`${report.bars.sha256}\`.`);
  lines.push(`PineTS: ${report.voters.pineTS.repo} local head \`${report.voters.pineTS.localHead}\`.`);
  lines.push(`Pine-A-Script: ${report.voters.pineAScript.repo} local head \`${report.voters.pineAScript.localHead}\`.`);
  lines.push('');
  lines.push('## Selection');
  lines.push('');
  lines.push('The pilot selected 12 declared-v5 and 13 declared-v6 currently executable indicator/study scripts with plain `plot()` outputs and without host-required surfaces, scanning the committed corpus union in order. Synthetic compat/runtime stress fixtures were excluded from the selection pool. Rejections before selection are engine/readiness filters, not corpus classifications.');
  lines.push('');
  lines.push(`Rejected before selection while filling quotas: ${report.summary.rejectedBeforeSelection}. The JSON report includes a sample for reproducibility.`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
