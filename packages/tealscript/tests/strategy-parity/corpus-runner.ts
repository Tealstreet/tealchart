import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse } from '../../src/parser';
import { executeScript, type Bar, type TealscriptEngineOptions } from '../../src/runtime';
import type { StrategyTrade } from '../../src/runtime/strategy';
import {
  computeParity,
  engineToNormalizedTrades,
  parseTvTradesCsv,
  referenceToNormalizedTrades,
  type ParityResult,
} from './trade-comparison';

export interface CorpusEntry {
  id: string;
  pineSource: string;
  referenceCsv: string;
  bars: Bar[];
  engineOptions?: TealscriptEngineOptions;
  meta?: CorpusEntryMeta;
}

export interface CorpusEntryMeta {
  symbol?: string;
  timeframe?: string;
  barCount?: number;
  description?: string;
  tvExportDate?: string;
  knownDivergence?: string;
  source?: string;
}

export interface CorpusRunResult {
  entry: CorpusEntry;
  parity: ParityResult;
  engineTrades: StrategyTrade[];
  errors: string[];
  executionTimeMs: number;
}

export function loadCorpusEntry(dir: string): CorpusEntry | null {
  const id = path.basename(dir);
  const pinePath = path.join(dir, 'strategy.pine');
  const csvPath = path.join(dir, 'tv_trades.csv');
  const barsPath = path.join(dir, 'bars.json');
  const metaPath = path.join(dir, 'meta.json');

  if (!fs.existsSync(pinePath) || !fs.existsSync(csvPath) || !fs.existsSync(barsPath)) {
    return null;
  }

  const pineSource = fs.readFileSync(pinePath, 'utf-8');
  const referenceCsv = fs.readFileSync(csvPath, 'utf-8');
  const bars: Bar[] = JSON.parse(fs.readFileSync(barsPath, 'utf-8'));
  const meta: CorpusEntryMeta | undefined = fs.existsSync(metaPath)
    ? JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    : undefined;

  return { id, pineSource, referenceCsv, bars, meta };
}

export function loadCorpus(corpusDir: string): CorpusEntry[] {
  if (!fs.existsSync(corpusDir)) return [];

  const entries: CorpusEntry[] = [];
  const dirs = fs
    .readdirSync(corpusDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const dir of dirs) {
    const entry = loadCorpusEntry(path.join(corpusDir, dir.name));
    if (entry) entries.push(entry);
  }

  return entries;
}

export function runCorpusEntry(entry: CorpusEntry): CorpusRunResult {
  const start = performance.now();
  let engineTrades: StrategyTrade[] = [];
  const errors: string[] = [];

  try {
    const ast = parse(entry.pineSource);
    const result = executeScript(ast, entry.bars, undefined, entry.engineOptions);

    if (result.errors.length > 0) {
      errors.push(...result.errors.map((e) => (typeof e === 'string' ? e : String(e))));
    }

    if (result.strategy) {
      engineTrades = result.strategy.closedTrades;
    } else {
      errors.push('No strategy output — script may be an indicator, not a strategy');
    }
  } catch (err) {
    errors.push(`Execution error: ${err instanceof Error ? err.message : String(err)}`);
  }

  const executionTimeMs = performance.now() - start;

  const referenceTrades = referenceToNormalizedTrades(parseTvTradesCsv(entry.referenceCsv));
  const normalizedEngine = engineToNormalizedTrades(engineTrades);

  const trimOverlap = entry.meta?.source === 'tradingview';
  const parity = computeParity(entry.id, normalizedEngine, referenceTrades, { trimOverlap });

  return { entry, parity, engineTrades, errors, executionTimeMs };
}

export function runCorpus(corpusDir: string): CorpusRunResult[] {
  const entries = loadCorpus(corpusDir);
  return entries.map(runCorpusEntry);
}

export function formatCorpusReport(results: CorpusRunResult[]): string {
  if (results.length === 0) return 'No corpus entries found.';

  const lines: string[] = ['# Strategy Parity Report', ''];

  const gradeOrder: Record<string, number> = {
    excellent: 0,
    strong: 1,
    moderate: 2,
    weak: 3,
    minimal: 4,
    anomaly: 5,
  };

  const sorted = [...results].sort(
    (a, b) => (gradeOrder[a.parity.grade] ?? 99) - (gradeOrder[b.parity.grade] ?? 99),
  );

  const gradeCounts: Record<string, number> = {};
  for (const r of results) {
    gradeCounts[r.parity.grade] = (gradeCounts[r.parity.grade] ?? 0) + 1;
  }

  lines.push('## Summary');
  lines.push(`Total strategies: ${results.length}`);
  for (const [grade, count] of Object.entries(gradeCounts)) {
    lines.push(`  ${grade.toUpperCase()}: ${count}`);
  }
  lines.push('');

  lines.push('## Details');
  lines.push('| ID | Grade | Engine | Ref | Matched | Entry p90 | Exit p90 | PnL p90 | Time |');
  lines.push('|---|---|---|---|---|---|---|---|---|');

  for (const r of sorted) {
    const p = r.parity;
    lines.push(
      `| ${p.strategyId} | ${p.grade} | ${p.engineTradeCount} | ${p.referenceTradeCount} | ${p.matchedCount} | ${(p.entryPriceP90 * 100).toFixed(3)}% | ${(p.exitPriceP90 * 100).toFixed(3)}% | ${(p.profitP90 * 100).toFixed(3)}% | ${r.executionTimeMs.toFixed(0)}ms |`,
    );
  }

  const errorEntries = results.filter((r) => r.errors.length > 0);
  if (errorEntries.length > 0) {
    lines.push('');
    lines.push('## Errors');
    for (const r of errorEntries) {
      lines.push(`### ${r.entry.id}`);
      for (const err of r.errors) {
        lines.push(`- ${err}`);
      }
    }
  }

  return lines.join('\n');
}
