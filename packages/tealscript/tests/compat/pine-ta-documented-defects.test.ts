import { describe, expect, it } from 'vitest';

import type { Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

// Previously registered defects fixed by verified integration commits are ordinary
// tests. Preserve the assertions and the bounded authority of each witness.
// Authority for each entry: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
// SHA256 eba108f8975d3fcd3e66f7b69c81979bb671c887607a7914aa4c7495e805fb1d.
function values(body: string, closes: Array<number | null>, volumes?: number[], ranges?: Array<[number, number]>) {
  const bars: Bar[] = closes.map((close, index) => ({
    time: 1_700_000_000_000 + index * 60_000,
    open: 10, high: ranges?.[index][0] ?? 13, low: ranges?.[index][1] ?? 8, close: close ?? NaN, volume: volumes?.[index] ?? 100,
  }));
  const result = runCompatScript(`//@version=6\nindicator("documented open defect")\n${body}`, { bars });
  expect(result.errors).toEqual([]);
  return getPlot(result, 'value').values;
}

describe('documented Pine TA open defects', () => {
  it('TA-SAR-CLOSE-SEED: the second-bar seed depends on close direction', () => {
    // fun_ta.sar equivalent example seeds at bar_index==1: rising closes
    // select low[1], falling closes high[1]. First H/L=13/8, second=12/9:
    // rising: raw8+.02*(12-8)=8.08 < current low9, then clamp low[1]=8;
    // falling: raw13+.02*(9-13)=12.92 > current high12, then clamp high[1]=13.
    // An inside bar avoids a reversal masking the seed. Both runs have identical
    // H/L but opposite close directions, rejecting a high/low-only seed.
    // Assert the decisive second bar rather than relying only on startup na.
    // Inverse proof: ordinary test failed with original engine. In an isolated
    // source copy, translated the published SAR example and passed chart close
    // into SAR from codegen; both assertions passed. Discarded that copy.
    expect(values('plot(ta.sar(0.02, 0.02, 0.2), "value")', [10, 11], undefined, [[13, 8], [12, 9]])[1]).toBe(8);
    expect(values('plot(ta.sar(0.02, 0.02, 0.2), "value")', [11, 10], undefined, [[13, 8], [12, 9]])[1]).toBe(13);
  });

  it('TA-CHANGE-BOOL-NUMERIC: boolean change must return a boolean', () => {
    // fun_ta.change bool overload returns bool, not numeric +/-1.
    // Both rising and falling flips plus unchanged bars reject numeric truthiness
    // and always-true output. Skip startup: no bool-na warmup assumption.
    // Inverse proof: ordinary test failed with original engine. Isolated patch
    // preserved boolean source type and returned src !== Boolean(prev) for the
    // bool overload; the ordinary test passed. Discarded that copy.
    expect(values('plot(ta.change(close > 0) == true ? 1 : 0, "value")', [-2, 3, 4, -1, -2]).slice(1))
      .toEqual([1, 0, 1, 0]);
  });

  // Already fixed by cad124aa59; native volume-vwap-v1.csv vwap_close_never_anchor; assertions remain missingness-only.
  it('TA-VWAP-PREANCHOR: scalar and tuple must be na until first anchor', () => {
    // fun_ta.vwap scalar/tuple remarks explicitly prescribe pre-anchor na.
    // Assert only missingness, avoiding undocumented band-variance weighting.
    // Nonconstant prices reject accidental uniform output; all three tuple
    // components must be missing, not just one band or the middle.
    // Inverse proof: ordinary test failed with original engine. Isolated patch
    // gated all scalar/tuple results on a first-true-anchor flag; ordinary test
    // passed. Discarded that copy.
    const body = 'scalar = ta.vwap(close, bar_index == 3)\n[middle, upper, lower] = ta.vwap(close, bar_index == 3, 2)\nplot(na(scalar) and na(middle) and na(upper) and na(lower) ? 1 : 0, "value")';
    expect(values(body, [10, 14, 7, 12])).toEqual([1, 1, 1, 0]);
  });

  // Already fixed by eb885bcde9; published var_ta.nvi zero guard, volumeIndexReference.test.ts.
  it('TA-NVI-ZERO-CLOSE: zero close holds the previous index', () => {
    // var_ta.nvi equivalent example explicitly guards current/previous zero close.
    // Decreasing volume activates the update branch; increasing volume would
    // conceal the missing guard. Sequence also rejects holding every update.
    // Inverse proof: ordinary test failed with original engine. Isolated patch
    // added the published close != 0 guard to VolumeIndex; ordinary test passed.
    // Discarded that copy.
    expect(values('plot(ta.nvi, "value")', [10, 12, 0, 15], [100, 80, 60, 40]))
      .toEqual([1, 1.2, 1.2, 1.2]);
  });

  // Already fixed by eb885bcde9; published var_ta.pvi zero guard, volumeIndexReference.test.ts.
  it('TA-PVI-ZERO-CLOSE: zero close holds the previous index', () => {
    // var_ta.pvi equivalent example explicitly guards current/previous zero close.
    // Increasing volume discriminates its own documented update predicate.
    // Inverse proof: ordinary test failed with original engine. Isolated patch
    // added the published close != 0 guard to VolumeIndex; ordinary test passed.
    // Discarded that copy.
    expect(values('plot(ta.pvi, "value")', [10, 12, 0, 15], [100, 120, 140, 160]))
      .toEqual([1, 1.2, 1.2, 1.2]);
  });

  // Already fixed by cad124aa59; native mfi-flat-flows-v2.csv startup and pine-ta-native-mfi.test.ts.
  it('TA-MFI-FIRST-FLOW: published equivalent includes first-bar flow in both sums', () => {
    // fun_ta.mfi equivalent example: unavailable initial change comparisons are
    // false in v6, so both ternaries choose source. For N=3 the two sums are
    // upper=10*100+12*80+0=1960, lower=10*100+0+9*120=2080.
    // The third value falls, keeping both denominators finite; no zero-flow
    // convention, EMA/RMA primitive or missing-source conflict is involved.
    // Inverse proof: ordinary test failed with original engine. Isolated patch
    // included first-bar source*volume in both streams, as the two published
    // ternaries require; ordinary test passed. Discarded that copy.
    expect(values('plot(ta.mfi(close, 3), "value")', [10, 12, 9], [100, 80, 120])[2])
      .toBeCloseTo(100 - 100 / (1 + 1960 / 2080), 10);
  });

  // DOC-vs-NATIVE: native wins over the earlier preoracle10c95ea260 reference
  // assertion. 18ace021d3 / coverage-register-ta-1-v1 rank_hole_builtin bars0..18:
  // missing12/13 rank0; recovered14..18 rank0/25/50/75/100.
  it('DOC-vs-NATIVE: TA-PERCENTRANK-COMPRESSED-HOLES follows captured ranks', () => {
    const closes = Array.from({ length: 19 }, (_, index) => (
      index === 12 || index === 13 ? null : 10 + index % 7
    ));
    expect(values('plot(ta.percentrank(close, 4), "value")', closes)).toEqual([
      null, null, null, null, 100, 100, 100, 0, 25, 50, 75, 100, 0, 0, 0, 25, 50, 75, 100,
    ]);
  });
});
