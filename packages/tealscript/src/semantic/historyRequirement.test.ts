import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { executeScript } from '../runtime/compiledOnly';
import { estimateHistoryRequirement, MAX_HISTORY_REQUIREMENT_BARS } from './historyRequirement';

function estimate(
  body: string,
  options: { version?: number; declaration?: string; inputs?: Map<string, unknown> } = {},
) {
  const version = options.version ?? 6;
  const declaration =
    options.declaration ?? (version >= 5 ? 'indicator("History", overlay=true)' : 'study("History", overlay=true)');
  return estimateHistoryRequirement(parse(`//@version=${version}\n${declaration}\n${body}`), {
    inputs: options.inputs,
  });
}

describe('estimateHistoryRequirement', () => {
  it('adds the longest lookback to the deepest history offset, through named constants', () => {
    const result = estimate(
      [
        'lookback = 300',
        'slowLookback = 500',
        'ph = high[1]',
        'vol = volume[1]',
        'top = ta.highest(ph, lookback)',
        'avg = ta.sma(vol, slowLookback)',
        'plot(top + avg)',
      ].join('\n'),
      { declaration: 'indicator("History", overlay=true, max_bars_back=500)' },
    );

    expect(result).toEqual({
      bars: 501,
      source: 'inferred',
      longestLookback: 500,
      deepestHistoryOffset: 1,
      declaredMaxBarsBack: 500,
      unresolvedLookbacks: 0,
    });
  });

  it('reports the declared max_bars_back when it exceeds the inferred need', () => {
    const result = estimate('plot(ta.ema(close, 20))', { declaration: 'indicator("History", max_bars_back=1000)' });

    expect(result.bars).toBe(1000);
    expect(result.source).toBe('declared');
  });

  it('counts a max_bars_back() call as a declared depth', () => {
    const result = estimate('max_bars_back(close, 750)\nplot(ta.sma(close, 10))');

    expect(result.bars).toBe(750);
    expect(result.source).toBe('declared');
  });

  it('uses an input default, and the host override keyed by input title', () => {
    const body = 'len = input.int(50, "Length")\nplot(ta.rsi(close, len))';

    expect(estimate(body).bars).toBe(50);
    expect(estimate(body, { inputs: new Map([['input_Length', 80]]) }).bars).toBe(80);
  });

  it('folds arithmetic between static values', () => {
    expect(estimate('base = 10\nplot(ta.sma(close, base * 3 + 5))').bars).toBe(35);
  });

  it('reads the one-argument ta.highest overload as its length', () => {
    expect(estimate('plot(ta.highest(20))').bars).toBe(20);
  });

  it('takes the largest bar-count parameter of a multi-length call', () => {
    expect(estimate('[m, s, h] = ta.macd(close, 12, 26, 9)\nplot(m)').longestLookback).toBe(26);
  });

  it('reads legacy un-namespaced calls before v5', () => {
    expect(estimate('plot(sma(close, 30))', { version: 4 }).bars).toBe(30);
  });

  it('marks a length it cannot resolve statically as unknown, keeping the resolved floor', () => {
    const result = estimate('plot(ta.sma(close, 14) + ta.sma(close, bar_index % 10 + 1))');

    expect(result.source).toBe('unknown');
    expect(result.unresolvedLookbacks).toBe(1);
    expect(result.bars).toBe(14);
  });

  it('does not treat a reassigned name as a constant', () => {
    const result = estimate('len = 20\nif close > open\n    len := 40\nplot(ta.sma(close, len))');

    expect(result.source).toBe('unknown');
  });

  it('caps the requirement at Pine max_bars_back ceiling', () => {
    expect(estimate('plot(ta.sma(close, 9000))').bars).toBe(MAX_HISTORY_REQUIREMENT_BARS);
  });

  it('reports nothing needed for a script without lookbacks', () => {
    expect(estimate('plot(close)')).toMatchObject({ bars: 0, source: 'inferred' });
  });
});

describe('execution declaration metadata', () => {
  it('carries the history requirement to the host', () => {
    const program = parse('//@version=6\nindicator("History")\nplot(ta.sma(close[2], 40))');
    const bars = Array.from({ length: 60 }, (_, index) => ({
      time: index * 60_000,
      open: 100 + index,
      high: 101 + index,
      low: 99 + index,
      close: 100 + index,
      volume: 10,
    }));

    const result = executeScript(program, bars);

    expect(result.declaration.historyRequirement).toMatchObject({ bars: 42, source: 'inferred' });
  });
});
