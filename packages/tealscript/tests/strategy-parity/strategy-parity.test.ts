// @vitest-environment node
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadCorpus, runCorpusEntry, type CorpusEntry } from './corpus-runner';
import {
  alignTrades,
  computeParity,
  engineToNormalizedTrades,
  parseTvTradesCsv,
  referenceToNormalizedTrades,
  type NormalizedTrade,
} from './trade-comparison';

const CORPUS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'corpus');

describe('trade comparison utilities', () => {
  it('parses a TradingView trades CSV', () => {
    const csv = `Trade #,Type,Signal,Date/Time,Price,Contracts,Profit,Cum. Profit
1,Entry Long,Long,2023-11-14 22:40:00,102,1,,
1,Exit Long,Long,2023-11-14 22:42:00,107,1,5.00,5.00
2,Entry Long,Long,2023-11-14 22:44:00,99,1,,
2,Exit Long,Long,2023-11-14 22:46:00,104,1,5.00,10.00`;

    const refs = parseTvTradesCsv(csv);
    expect(refs).toHaveLength(4);
    expect(refs[0]).toMatchObject({ tradeNum: 1, type: 'Entry Long', price: 102, contractsQty: 1 });
    expect(refs[1]).toMatchObject({ tradeNum: 1, type: 'Exit Long', price: 107, profitUsd: 5 });
  });

  it('normalizes TV reference trades into entry/exit pairs', () => {
    const csv = `Trade #,Type,Signal,Date/Time,Price,Contracts,Profit,Cum. Profit
1,Entry Long,Long,2023-11-14 22:40:00,100,2,,
1,Exit Long,Close,2023-11-14 22:42:00,105,2,10.00,10.00`;

    const refs = parseTvTradesCsv(csv);
    const normalized = referenceToNormalizedTrades(refs);
    expect(normalized).toEqual([{ direction: 'long', entryPrice: 100, exitPrice: 105, qty: 2, profit: 10 }]);
  });

  it('aligns trades greedily by direction and price proximity', () => {
    const engine: NormalizedTrade[] = [
      { direction: 'long', entryPrice: 100, exitPrice: 105, qty: 1, profit: 5 },
      { direction: 'long', entryPrice: 110, exitPrice: 108, qty: 1, profit: -2 },
    ];
    const reference: NormalizedTrade[] = [
      { direction: 'long', entryPrice: 110, exitPrice: 108, qty: 1, profit: -2 },
      { direction: 'long', entryPrice: 100, exitPrice: 105, qty: 1, profit: 5 },
    ];

    const matches = alignTrades(engine, reference);
    expect(matches).toHaveLength(2);
    expect(matches[0]!.engineIndex).toBe(0);
    expect(matches[0]!.referenceIndex).toBe(1);
    expect(matches[1]!.engineIndex).toBe(1);
    expect(matches[1]!.referenceIndex).toBe(0);
  });

  it('computes parity grade for exact match', () => {
    const trades: NormalizedTrade[] = [
      { direction: 'long', entryPrice: 100, exitPrice: 105, qty: 1, profit: 5 },
    ];
    const parity = computeParity('test', trades, trades);
    expect(parity.grade).toBe('excellent');
    expect(parity.matchedCount).toBe(1);
    expect(parity.entryPriceP90).toBe(0);
    expect(parity.exitPriceP90).toBe(0);
  });

  it('detects unmatched trades on both sides', () => {
    const engine: NormalizedTrade[] = [
      { direction: 'long', entryPrice: 100, exitPrice: 105, qty: 1, profit: 5 },
      { direction: 'long', entryPrice: 200, exitPrice: 210, qty: 1, profit: 10 },
    ];
    const reference: NormalizedTrade[] = [
      { direction: 'long', entryPrice: 100, exitPrice: 105, qty: 1, profit: 5 },
      { direction: 'short', entryPrice: 300, exitPrice: 290, qty: 1, profit: 10 },
    ];
    const parity = computeParity('test', engine, reference);
    expect(parity.matchedCount).toBe(1);
    expect(parity.unmatchedEngine).toEqual([1]);
    expect(parity.unmatchedReference).toEqual([1]);
  });
});

describe('strategy parity corpus', () => {
  const corpus = loadCorpus(CORPUS_DIR);
  const fastCorpus = corpus.filter((e) => !e.id.startsWith('pf-'));
  const pineforgeCorpus = corpus.filter((e) => e.id.startsWith('pf-'));

  it('loads corpus entries', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(5);
  });

  for (const entry of fastCorpus) {
    it(`${entry.id}: self-parity check`, () => {
      const result = runCorpusEntry(entry);

      expect(result.errors).toEqual([]);
      expect(result.parity.grade).toBe('excellent');
      expect(result.parity.matchedCount).toBe(result.parity.referenceTradeCount);
      expect(result.parity.unmatchedEngine).toEqual([]);
      expect(result.parity.unmatchedReference).toEqual([]);
    });
  }

  for (const entry of pineforgeCorpus) {
    it.skip(`${entry.id}: TV parity (slow — run manually)`, () => {
      const result = runCorpusEntry(entry);
      expect(result.errors).toEqual([]);
      expect(result.parity.grade).toMatch(/excellent|strong/);
    });
  }
});

