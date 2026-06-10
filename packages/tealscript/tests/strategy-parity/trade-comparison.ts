import type { StrategyTrade } from '../../src/runtime/strategy';

export interface ReferenceTrade {
  tradeNum: number;
  type: string;
  signal: string;
  dateTime: string;
  price: number;
  contractsQty: number;
  profitUsd: number | null;
  profitPct: number | null;
  cumulativeProfitUsd: number | null;
  cumulativeProfitPct: number | null;
  runupUsd: number | null;
  runupPct: number | null;
  drawdownUsd: number | null;
  drawdownPct: number | null;
}

export interface NormalizedTrade {
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  qty: number;
  profit: number;
}

export interface TradeMatch {
  engineIndex: number;
  referenceIndex: number;
  entryPriceDelta: number;
  exitPriceDelta: number;
  profitDelta: number;
  qtyDelta: number;
}

export interface ParityResult {
  strategyId: string;
  engineTradeCount: number;
  referenceTradeCount: number;
  matchedCount: number;
  unmatchedEngine: number[];
  unmatchedReference: number[];
  matches: TradeMatch[];
  entryPriceP90: number;
  exitPriceP90: number;
  profitP90: number;
  grade: ParityGrade;
  summary: string;
}

export type ParityGrade = 'excellent' | 'strong' | 'moderate' | 'weak' | 'minimal' | 'anomaly';

export function parseTvTradesCsv(csv: string): ReferenceTrade[] {
  const lines = csv.replace(/^﻿/, '').trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0]!;
  const columns = parseCsvRow(header);
  const colIndex = (...names: string[]): number => {
    for (const name of names) {
      const idx = columns.findIndex((col) => col.toLowerCase().includes(name.toLowerCase()));
      if (idx >= 0) return idx;
    }
    throw new Error(`CSV column "${names.join('" or "')}" not found in: ${columns.join(', ')}`);
  };

  const iTradeNum = colIndex('Trade #');
  const iType = colIndex('Type');
  const iSignal = colIndex('Signal');
  const iDateTime = colIndex('Date/Time', 'Date and time');
  const iPrice = colIndex('Price');
  const iContracts = colIndex('Contracts', 'Size (qty)');
  const iProfit = findOptionalCol(columns, 'Profit', 'Net P&L USD');
  const iProfitPct = findOptionalCol(columns, 'Profit %', 'Net P&L %');
  const iCumProfit = findOptionalCol(columns, 'Cum. Profit', 'Cumulative P&L USD');
  const iCumProfitPct = findOptionalCol(columns, 'Cum. Profit %', 'Cumulative P&L %');
  const iRunup = findOptionalCol(columns, 'Run-up', 'Favorable excursion USD');
  const iRunupPct = findOptionalCol(columns, 'Run-up %', 'Favorable excursion %');
  const iDrawdown = findOptionalCol(columns, 'Drawdown', 'Adverse excursion USD');
  const iDrawdownPct = findOptionalCol(columns, 'Drawdown %', 'Adverse excursion %');

  const trades: ReferenceTrade[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]!);
    if (row.length < 6) continue;

    trades.push({
      tradeNum: parseInt(row[iTradeNum]!, 10),
      type: row[iType]! as ReferenceTrade['type'],
      signal: row[iSignal]!,
      dateTime: row[iDateTime]!,
      price: parseNumeric(row[iPrice]!),
      contractsQty: parseNumeric(row[iContracts]!),
      profitUsd: iProfit >= 0 ? parseNumericOrNull(row[iProfit]!) : null,
      profitPct: iProfitPct >= 0 ? parseNumericOrNull(row[iProfitPct]!) : null,
      cumulativeProfitUsd: iCumProfit >= 0 ? parseNumericOrNull(row[iCumProfit]!) : null,
      cumulativeProfitPct: iCumProfitPct >= 0 ? parseNumericOrNull(row[iCumProfitPct]!) : null,
      runupUsd: iRunup >= 0 ? parseNumericOrNull(row[iRunup]!) : null,
      runupPct: iRunupPct >= 0 ? parseNumericOrNull(row[iRunupPct]!) : null,
      drawdownUsd: iDrawdown >= 0 ? parseNumericOrNull(row[iDrawdown]!) : null,
      drawdownPct: iDrawdownPct >= 0 ? parseNumericOrNull(row[iDrawdownPct]!) : null,
    });
  }

  return trades;
}

export function referenceToNormalizedTrades(refs: ReferenceTrade[]): NormalizedTrade[] {
  const normalized: NormalizedTrade[] = [];
  const grouped = new Map<number, { entry?: ReferenceTrade; exit?: ReferenceTrade }>();

  for (const ref of refs) {
    let group = grouped.get(ref.tradeNum);
    if (!group) {
      group = {};
      grouped.set(ref.tradeNum, group);
    }
    if (ref.type.startsWith('Entry') && !group.entry) group.entry = ref;
    else if (ref.type.startsWith('Exit') && !group.exit) group.exit = ref;
  }

  const sortedKeys = [...grouped.keys()].sort((a, b) => a - b);
  for (const key of sortedKeys) {
    const group = grouped.get(key)!;
    if (!group.entry || !group.exit) continue;

    const direction = group.entry.type.toLowerCase().includes('long') ? 'long' : 'short';
    normalized.push({
      direction,
      entryPrice: group.entry.price,
      exitPrice: group.exit.price,
      qty: group.entry.contractsQty,
      profit: group.exit.profitUsd ?? 0,
    });
  }

  return normalized;
}

export function engineToNormalizedTrades(trades: StrategyTrade[]): NormalizedTrade[] {
  return trades
    .filter((t) => t.exitPrice !== undefined)
    .map((t) => ({
      direction: t.direction,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice!,
      qty: t.qty,
      profit: t.profit,
    }));
}

export function alignTrades(engine: NormalizedTrade[], reference: NormalizedTrade[]): TradeMatch[] {
  const matches: TradeMatch[] = [];
  const usedRef = new Set<number>();

  for (let ei = 0; ei < engine.length; ei++) {
    const et = engine[ei]!;
    let bestRi = -1;
    let bestScore = Infinity;

    for (let ri = 0; ri < reference.length; ri++) {
      if (usedRef.has(ri)) continue;
      const rt = reference[ri]!;

      if (et.direction !== rt.direction) continue;

      const entryDelta = Math.abs(et.entryPrice - rt.entryPrice);
      const exitDelta = Math.abs(et.exitPrice - rt.exitPrice);
      const qtyDelta = Math.abs(et.qty - rt.qty);
      const score = entryDelta + exitDelta + qtyDelta * 1000;

      if (score < bestScore) {
        bestScore = score;
        bestRi = ri;
      }
    }

    if (bestRi >= 0 && bestScore < 500) {
      const rt = reference[bestRi]!;
      usedRef.add(bestRi);
      matches.push({
        engineIndex: ei,
        referenceIndex: bestRi,
        entryPriceDelta: relDelta(et.entryPrice, rt.entryPrice),
        exitPriceDelta: relDelta(et.exitPrice, rt.exitPrice),
        profitDelta: et.profit === 0 && rt.profit === 0 ? 0 : relDelta(et.profit, rt.profit),
        qtyDelta: et.qty - rt.qty,
      });
    }
  }

  return matches;
}

export function trimToOverlap(
  engineTrades: NormalizedTrade[],
  referenceTrades: NormalizedTrade[],
): { engine: NormalizedTrade[]; reference: NormalizedTrade[] } {
  if (engineTrades.length === 0 || referenceTrades.length === 0) {
    return { engine: engineTrades, reference: referenceTrades };
  }

  const matches = alignTrades(engineTrades, referenceTrades);
  if (matches.length === 0) {
    return { engine: engineTrades, reference: referenceTrades };
  }

  let firstE = Infinity, lastE = -Infinity, firstR = Infinity, lastR = -Infinity;
  for (const m of matches) {
    if (m.engineIndex < firstE) firstE = m.engineIndex;
    if (m.engineIndex > lastE) lastE = m.engineIndex;
    if (m.referenceIndex < firstR) firstR = m.referenceIndex;
    if (m.referenceIndex > lastR) lastR = m.referenceIndex;
  }

  return {
    engine: engineTrades.slice(firstE, lastE + 1),
    reference: referenceTrades.slice(firstR, lastR + 1),
  };
}

export function computeParity(
  strategyId: string,
  engineTrades: NormalizedTrade[],
  referenceTrades: NormalizedTrade[],
  options?: { trimOverlap?: boolean },
): ParityResult {
  let effectiveEngine = engineTrades;
  let effectiveRef = referenceTrades;

  if (options?.trimOverlap) {
    const trimmed = trimToOverlap(engineTrades, referenceTrades);
    effectiveEngine = trimmed.engine;
    effectiveRef = trimmed.reference;
  }

  const matches = alignTrades(effectiveEngine, effectiveRef);

  const matchedEngineIndices = new Set(matches.map((m) => m.engineIndex));
  const matchedRefIndices = new Set(matches.map((m) => m.referenceIndex));
  const unmatchedEngine = effectiveEngine.map((_, i) => i).filter((i) => !matchedEngineIndices.has(i));
  const unmatchedReference = effectiveRef.map((_, i) => i).filter((i) => !matchedRefIndices.has(i));

  const entryDeltas = matches.map((m) => Math.abs(m.entryPriceDelta)).sort((a, b) => a - b);
  const exitDeltas = matches.map((m) => Math.abs(m.exitPriceDelta)).sort((a, b) => a - b);
  const profitDeltas = matches.map((m) => Math.abs(m.profitDelta)).sort((a, b) => a - b);

  const entryPriceP90 = percentile(entryDeltas, 0.9);
  const exitPriceP90 = percentile(exitDeltas, 0.9);
  const profitP90 = percentile(profitDeltas, 0.9);

  const countMatch = effectiveEngine.length === effectiveRef.length;
  const countMatchPct =
    effectiveRef.length > 0 ? matches.length / effectiveRef.length : effectiveEngine.length === 0 ? 1 : 0;

  let grade: ParityGrade;
  if (countMatch && entryPriceP90 <= 0.0001 && exitPriceP90 <= 0.0001 && profitP90 <= 0.005) {
    grade = 'excellent';
  } else if (countMatchPct >= 0.99 && entryPriceP90 <= 0.001 && exitPriceP90 <= 0.001) {
    grade = 'strong';
  } else if (countMatchPct >= 0.9) {
    grade = 'moderate';
  } else if (matches.length > 0) {
    grade = 'weak';
  } else {
    grade = 'minimal';
  }

  const summary = [
    `${strategyId}: ${grade.toUpperCase()}`,
    `trades: engine=${engineTrades.length} ref=${referenceTrades.length} matched=${matches.length}`,
    `p90 deltas: entry=${(entryPriceP90 * 100).toFixed(3)}% exit=${(exitPriceP90 * 100).toFixed(3)}% pnl=${(profitP90 * 100).toFixed(3)}%`,
    unmatchedEngine.length > 0 ? `unmatched engine: [${unmatchedEngine.join(',')}]` : null,
    unmatchedReference.length > 0 ? `unmatched ref: [${unmatchedReference.join(',')}]` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  return {
    strategyId,
    engineTradeCount: effectiveEngine.length,
    referenceTradeCount: effectiveRef.length,
    matchedCount: matches.length,
    unmatchedEngine,
    unmatchedReference,
    matches,
    entryPriceP90,
    exitPriceP90,
    profitP90,
    grade,
    summary,
  };
}

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseNumeric(value: string): number {
  return parseFloat(value.replace(/[,$%]/g, ''));
}

function parseNumericOrNull(value: string): number | null {
  if (!value || value === '' || value === 'N/A') return null;
  const num = parseNumeric(value);
  return Number.isNaN(num) ? null : num;
}

function findOptionalCol(columns: string[], ...names: string[]): number {
  for (const name of names) {
    const idx = columns.findIndex((col) => col.toLowerCase().includes(name.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

function relDelta(a: number, b: number): number {
  if (a === b) return 0;
  const denom = Math.max(Math.abs(a), Math.abs(b));
  if (denom === 0) return 0;
  return Math.abs(a - b) / denom;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}
