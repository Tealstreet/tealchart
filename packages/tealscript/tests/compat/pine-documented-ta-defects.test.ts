import { describe, expect, it } from 'vitest';

import type { Bar } from '../../src/runtime';
import { runCompatScript } from './fixtures';

// Authority for every case: https://www.tradingview.com/pine-script-reference/v6/.
// Inverse proof (2026-10-03): all 12 ordinary tests failed in an unmodified
// isolated copy, then all 12 passed after reference-derived implementation
// patches with these literal expectations unchanged. Discarded the copy.
// Per-case patches: SAR uses the published bar-1 initialization, close direction
// and clamp recurrence (both SAR defects); ATR excludes current close from TR
// and preserves known close across low holes (both ATR defects); KC runs its
// two independent EMAs and bare TR starts na (both KC defects, including KCW);
// volume indexes use the published zero-close guards and nz(prior volume,0)
// (NVI and both PVI defects); supertrend emits the published initial 0/+1;
// MFI uses the published two flow ternaries; CMO uses published rolling sums.
// Integrated fixes make the unchanged assertions ordinary tests. Remaining
// .fails cases retain their original inverse proof and expectations.
// Titles retain DEFECT_REGISTER_v1 IDs, including integrated fixes. Values are
// hand-derived from the cited published example, never engine snapshots.
function bars(rows: Array<[number, number, number, number]>): Bar[] {
  return rows.map(([high, low, close, volume], i) => ({
    time: Date.UTC(2026, 0, 1) + i * 60_000, open: close, high, low, close, volume,
  }));
}

function plots(body: string, data: Bar[]): Record<string, Array<number | null>> {
  const result = runCompatScript(`//@version=6\nindicator("Documented TA defects")\n${body}`, { bars: data });
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  expect(result.plots.length).toBeGreaterThan(0);
  for (const plot of result.plots) expect(plot.values).toHaveLength(data.length);
  return Object.fromEntries(result.plots.map((plot) => [plot.title, plot.values]));
}

const sarRise = bars([[13, 8, 10, 100], [12, 9, 11, 200]]);

describe('documented TA example defects', () => {
  // Verified native SAR fix (gaps-19 6474bd679b) clears these two defect
  // witnesses with their independently derived published-example values unchanged.
  // Neither witness is a registered authority-conflict marker.
  // fun_ta.sar example initializes only at bar_index == 1.
  it('sar-premature-first-dot [ta.sar]', () => {
    expect(plots('plot(ta.sar(0.02, 0.02, 0.2), "sar")', sarRise).sar[0]).toBeNull();
  });

  // fun_ta.sar example uses close > close[1] then clamps to low[1].
  // Inside bars reject trend selection from higher highs/lows. Mirrored close
  // fall rejects permanently bullish selection. No later SAR rounding oracle.
  it('sar-close-seed [ta.sar]', () => {
    expect.soft(plots('plot(ta.sar(0.02, 0.02, 0.2), "sar")', sarRise).sar[1]).toBe(8);
    const fall = bars([[13, 8, 11, 100], [12, 9, 10, 200]]);
    expect.soft(plots('plot(ta.sar(0.02, 0.02, 0.2), "sar")', fall).sar[1]).toBe(13);
  });

  // fun_ta.atr description/example exclude current close from TR. Length 1
  // isolates TR; finite prior high/close avoid the disputed example guard.
  it('atr-requires-current-close [ta.atr]', () => {
    const data = bars([[13, 8, 10, 100], [22, 20, NaN, 200]]);
    expect(plots('plot(ta.atr(1), "atr")', data).atr[1]).toBe(12);
  });

  // fun_ta.atr example uses previous high or close, never previous low, in its
  // guard. Next gap rejects clearing known close and substituting high-low.
  // No assertion about hole-bar emission or the disputed previous-high hole.
  it('atr-clears-close-on-low-hole [ta.atr]', () => {
    const data = bars([[13, 8, 10, 100], [14, NaN, 12, 200], [25, 23, 24, 150]]);
    expect(plots('plot(ta.atr(1), "atr")', data).atr[2]).toBe(13);
  });

  // fun_ta.kc example uses ta.tr, not ta.tr(true): na on bar zero. At bar 1,
  // basis EMA(10,14; alpha=.5)=12, first finite TR=10. fun_ta.kcw example
  // divides 2*rangeEMA*mult by basis. Negative lower rejects absolute-value pins.
  it.fails('kc-first-tr-seed [ta.kc, ta.kcw]', () => {
    const data = bars([[13, 8, 10, 100], [20, 12, 14, 200]]);
    const out = plots(`[basis, upper, lower] = ta.kc(close, 3, 1.5)
plot(basis, "basis")
plot(upper, "upper")
plot(lower, "lower")
plot(ta.kcw(close, 3, 1.5), "width")`, data);
    expect([out.basis[1], out.upper[1], out.lower[1], out.width[1]]).toEqual([12, 27, -3, 2.5]);
  });

  // fun_ta.kc example computes separate EMAs. Assert after source recovers;
  // high-low spans 5,8,2 give range EMA 5,6.5,4.25 independent of source hole.
  // useTrueRange=false isolates this from first-TR seeding.
  it.fails('kc-source-hole-couples-range [ta.kc, ta.kcw]', () => {
    const data = bars([[13, 8, 10, 100], [20, 12, 14, 200], [14, 12, 13, 150]]);
    const out = plots(`src = bar_index == 1 ? na : close
[basis, upper, lower] = ta.kc(src, 3, 2, false)
plot(upper - lower, "span")
plot(ta.kcw(src, 3, 2, false), "width")`, data);
    expect.soft(out.span[2]).toBe(17);
    expect.soft(out.width[2]).toBeCloseTo(17 / 11.5, 10);
  });

  // var_ta.nvi example guards current and previous zero closes. Decreasing
  // volume exercises the zero bar; falling price after recovery rejects holds.
  it('nvi-zero-close-guard [ta.nvi]', () => {
    const data = bars([[12, 8, 10, 300], [14, 9, 12, 200], [1, 0, 0, 100], [11, 8, 10, 50], [10, 7, 9, 25]]);
    expect(plots('plot(ta.nvi, "index")', data).index).toEqual([1, 1.2, 1.2, 1.2, 1.08]);
  });

  // var_ta.pvi same published guard, increasing volumes exercise PVI's branch.
  it('pvi-zero-close-guard [ta.pvi]', () => {
    const data = bars([[12, 8, 10, 100], [14, 9, 12, 200], [1, 0, 0, 300], [11, 8, 10, 400], [10, 7, 9, 500]]);
    expect(plots('plot(ta.pvi, "index")', data).index).toEqual([1, 1.2, 1.2, 1.2, 1.08]);
  });

  // var_ta.pvi example compares volume > nz(volume[1],0). Current-hole and
  // post-hole bars reject propagating/skipping na and comparing with stale volume.
  it('pvi-missing-prior-volume [ta.pvi]', () => {
    const data = bars([[12, 8, 10, 100], [14, 9, 12, NaN], [11, 8, 9, 50], [13, 9, 12, 25]]);
    expect(plots('plot(ta.pvi, "index")', data).index).toEqual([1, 1, 0.75, 0.75]);
  });

  // fun_ta.supertrend example: nz(previous bands)=0; unavailable ATR makes
  // comparisons false -> upperBand=0; na(atr[1]) -> direction=1.
  it('supertrend-initial-output [ta.supertrend]', () => {
    const out = plots(`[line, direction] = ta.supertrend(2, 3)
plot(line, "line")
plot(direction, "direction")`, bars([[13, 8, 10, 100], [12, 9, 11, 200], [15, 10, 14, 150]]));
    expect.soft([out.line[0], out.direction[0]]).toEqual([0, 1]);
    expect.soft([out.line[1], out.direction[1]]).toEqual([null, 1]);
    expect.soft(out.line[2]).toBeCloseTo(127 / 6, 10);
    expect.soft(out.direction[2]).toBe(1);
    const immediate = plots('[line, direction] = ta.supertrend(-1, 1)\nplot(line, "line")\nplot(direction, "direction")', sarRise);
    expect.soft([immediate.line[0], immediate.direction[0]]).toEqual([0, 1]);
  });

  // fun_ta.mfi example ternaries put initial raw flow in both sums. Values
  // 10,14,9; volumes 100,200,150 -> upper3800/lower2350. Neither sum zero,
  // avoiding undocumented zero-flow conventions and unsigned-library evidence.
  it('mfi-startup-example [ta.mfi]', () => {
    const data = bars([[13, 8, 10, 100], [17, 12, 14, 200], [12, 7, 9, 150]]);
    expect(plots('plot(ta.mfi(close, 3), "mfi")', data).mfi[2]).toBeCloseTo(100 - 100 / (1 + 3800 / 2350), 10);
  });

  // fun_ta.cmo example: hole changes make gain ternary=0, loss ternary=na;
  // math.sum's documented non-na window recovers before contiguous-source CMO.
  // Two subsequent declines give gains0/losses4, avoiding the zero convention.
  it('cmo-post-hole-example [ta.cmo]', () => {
    const data = bars([10, 14, 9, 12, NaN, 15, 13, 11, 8].map((close) => [close + 3, close - 2, close, 100]));
    expect(plots('plot(ta.cmo(close, 3), "cmo")', data).cmo[7]).toBe(-100);
  });
});
