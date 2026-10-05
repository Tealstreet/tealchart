import { describe, expect, it } from 'vitest';
import type { Bar } from '../../src/runtime/context';
import { getPlot, runCompatScript } from './fixtures';

// Native authority: oracle-probes/v2/captures/v2/coverage-math-2-v1.csv,
// input_bar_index 0..9 and 38..44. Only seed/bar index affect these outputs;
// OHLC inputs are hand-built, with no captured price data copied.
const prefix = [
  0.7275636800328681, 0.6832234717598454, 0.30871945533265976,
  0.27707849007413665, 0.6655489517945736, 0.9033722646721782,
  0.36878291341130565, 0.2757480694417024, 0.46365357580915334,
  0.7829017787900358,
];
const bars: Bar[] = Array.from({ length: 45 }, (_, index) => ({
  time: 1_700_000_040_000 + index * 120_000,
  open: 100, high: 101, low: 99, close: 100, volume: 1,
}));
const source = `//@version=6
indicator("Native seeded random")
value = math.random(0.0, 1.0, 42)
hole = bar_index % 97 == 40 or bar_index % 97 == 41 or bar_index % 97 == 42
plot(value, title="clean")
plot(hole ? na : value, title="hole")
plot(bar_index < 8 ? na : value, title="warm")`;

describe('native seed42 random stream', () => {
  it('matches the exact captured prefix', () => {
    const result = runCompatScript(source, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'clean').values.slice(0, 10)).toEqual(prefix);
  });
  it('preserves stream advancement while initial plot values are masked', () => {
    const result = runCompatScript(source, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'warm').values.slice(0, 10)).toEqual([
      ...Array(8).fill(null), 0.46365357580915334, 0.7829017787900358,
    ]);
  });
  it('resumes the same stream after recurring plot holes', () => {
    const result = runCompatScript(source, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'hole').values.slice(38, 45)).toEqual([
      0.4573170944447694, 0.4726884208758554, null, null, null,
      0.8338662354441657, 0.46030637266116115,
    ]);
  });
  it('keeps the documented range and repeated execution contract', () => {
    const first = getPlot(runCompatScript(source, { bars }), 'clean').values;
    const second = getPlot(runCompatScript(source, { bars }), 'clean').values;
    expect(first).toEqual(second);
    expect(first.every(value => value !== null && value > 0 && value < 1)).toBe(true);
  });
});
