import type { RequestDatafeedQuery } from '../../src/runtime/requestDatafeed';

import { expect, it } from 'vitest';

import { SyntheticExternalCorpusRequestDatafeed } from '../../scripts/run-external-pine-corpus';

const bars = [1, 2, 3].map((close, index) => ({
  time: index * 120_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 10,
}));
const query: RequestDatafeedQuery = { symbol: 'BTCUSDT', timeframe: '2' };

function requested(feed: SyntheticExternalCorpusRequestDatafeed, value = query) {
  const result = feed.getBars(value);
  if (!result.ok) throw new Error('Synthetic request failed');
  return result.context;
}

it('reuses an immutable synthetic dataset for repeated identical context requests', () => {
  const feed = new SyntheticExternalCorpusRequestDatafeed(bars);
  const first = requested(feed);
  const second = requested(feed);
  expect(second).toEqual(first);
  expect(second.bars).toBe(first.bars);
  expect(Object.isFrozen(first.bars)).toBe(true);
  expect(first.bars.every(Object.isFrozen)).toBe(true);
  expect(bars.map((bar) => bar.close)).toEqual([1, 2, 3]);
});

it('keeps symbol, timeframe, count and currency context datasets separate', () => {
  const feed = new SyntheticExternalCorpusRequestDatafeed(bars);
  const first = requested(feed);
  const variants: RequestDatafeedQuery[] = [
    { ...query, symbol: 'ETHUSDT' },
    { ...query, timeframe: '5' },
    { ...query, calcBarsCount: 2 },
    { ...query, currency: 'EUR' },
  ];
  for (const value of variants) {
    const context = requested(feed, value);
    expect(context).toEqual(requested(new SyntheticExternalCorpusRequestDatafeed(bars), value));
    expect(context.bars).not.toBe(first.bars);
    expect(context.bars.length).toBe(value.calcBarsCount ?? 3);
  }
});
