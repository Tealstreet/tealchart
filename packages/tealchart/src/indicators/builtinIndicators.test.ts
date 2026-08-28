import type { Bar } from '../types';

import { describe, expect, it } from 'vitest';

import { executeScript, parse } from '@tealstreet/tealscript';
import { getIndicatorById } from './builtinIndicators';

function createBars(count: number): Bar[] {
  return Array.from({ length: count }, (_, index) => {
    const price = 100 + Math.sin(index / 5) * 4 + index * 0.2;
    return {
      time: 1_700_000_000 + index * 60,
      open: price,
      high: price + 1,
      low: price - 1,
      close: price + 0.3,
      volume: 1_000 + index,
    };
  });
}

function finiteCount(values: readonly (number | null)[]): number {
  return values.filter((value) => typeof value === 'number' && Number.isFinite(value)).length;
}

describe('built-in indicator definitions', () => {
  it('stochastic produces finite K and D plots', () => {
    const stochastic = getIndicatorById('stochastic');
    expect(stochastic).toBeDefined();

    const result = executeScript(parse(stochastic!.code), createBars(80));

    expect(result.errors).toEqual([]);
    expect(finiteCount(result.plots.find((plot) => plot.title === 'K')?.values ?? [])).toBeGreaterThan(0);
    expect(finiteCount(result.plots.find((plot) => plot.title === 'D')?.values ?? [])).toBeGreaterThan(0);
  });
});
