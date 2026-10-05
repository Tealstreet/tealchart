import { describe, expect, it } from 'vitest';

import type { Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

// Authority for every case below:
// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
// Defect names are the indicator-only DEFECT_REGISTER_v1 IDs. Expectations
// are derived from that reference, never captured from TealScript output.
// Inverse proof (2026-10-03): eight ordinary it() tests RED in an unmodified
// isolated package copy; all eight GREEN after the following documented
// patches, with no expectation edits. Discarded the copy; production source
// was never patched. Each bullet maps to the named expected-red below:
// - monthly-timeframe-seconds: N months -> N*2628003 seconds.
// - array-negative-insert-placement: negative index -> size+index (no +1).
// - string-na-cast-identity: string(na) preserves typed missing identity.
// - bool-change-return-identity: boolean source -> boolean inequality result.
// - vwap-delayed-anchor: preserve a started flag; return na until anchor=true.
// - vwap-default-daily-reset: omitted anchor calls timeframe.change("1D").
// - percentile-linear-skips-na: contiguous window includes na and propagates it.
// Seeing an expected-red fail under a worse mutation is NOT a valid proof;
// the inverse green above establishes that these specs can pass when corrected.
// Fixed defect assertions are ordinary tests after integration. Remaining
// named .fails cases retain the original inverse proof and expectations.
// PercentRank is the explicit DOC-vs-NATIVE exception: native wins under the
// overseer's ruling, using 18ace021d3 and coverage-register-ta-1-v1 capture rows.
const bars: Bar[] = [10, 14, 9, 12, 8, 15].map((close, index) => ({
  time: Date.UTC(2026, 0, 1) + index * 60_000,
  open: 11,
  high: close + 3,
  low: close - 2,
  close,
  volume: [100, 200, 150, 300, 120, 240][index],
}));

function values(body: string, data: Bar[] = bars): Array<number | null> {
  const result = runCompatScript(`//@version=6\nindicator("Documented defects")\n${body}`, { bars: data });
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  const output = getPlot(result, 'spec').values;
  expect(output).toHaveLength(data.length);
  return output;
}

describe('documented indicator defects', () => {
  // Reference fun_timeframe.in_seconds remarks: one month = 2628003 seconds.
  // Rejects 30-day calendar approximations and forgetting the multiplier.
  it('monthly-timeframe-seconds [timeframe.in_seconds]', () => {
    expect.soft(values('plot(timeframe.in_seconds("1M"), "spec")', bars.slice(0, 1))).toEqual([2628003]);
    expect.soft(values('plot(timeframe.in_seconds("12M"), "spec")', bars.slice(0, 1))).toEqual([31536036]);
  });

  // Reference fun_array.insert remarks: -1 selects the last element, -size
  // selects the first. Nonmonotonic elements reject appending and value sorting.
  it('array-negative-insert-placement [array.insert]', () => {
    expect.soft(values(`a = array.from(2, 10, 3, 5)
array.insert(a, -1, 20)
plot(array.get(a, bar_index), "spec")`, bars.slice(0, 5))).toEqual([2, 10, 3, 20, 5]);
    expect.soft(values(`a = array.from(2, 10, 3, 5)
array.insert(a, -4, 20)
plot(array.get(a, bar_index), "spec")`, bars.slice(0, 5))).toEqual([20, 2, 10, 3, 5]);
  });

  // Reference fun_string: casts na to a typed string, unlike str.tostring's
  // documented "NaN" text. Both predicates distinguish identity from spelling.
  it('string-na-cast-identity [string]', () => {
    expect.soft(values('plot(na(string(na)) ? 1 : 0, "spec")', bars.slice(0, 1))).toEqual([1]);
    expect.soft(values('plot(na(str.tostring(na)) ? 1 : 0, "spec")', bars.slice(0, 1))).toEqual([0]);
  });

  // Reference fun_ta.change boolean overload returns true on either direction
  // of change. Equality rejects numeric +/-1 and the unchanged pairs reject
  // returning the source itself. No assertion about first-bar bool history.
  // Verified fb18fc1111/e36e68d027 preserves the documented boolean return identity.
  it('bool-change-return-identity [ta.change bool overload]', () => {
    expect.soft(values('plot(ta.change(close > open) == true ? 1 : 0, "spec")').slice(1))
      .toEqual([1, 1, 1, 1, 1]);
    expect.soft(values('plot(ta.change(bar_index >= 2) == true ? 1 : 0, "spec")').slice(1))
      .toEqual([0, 1, 0, 0, 0]);
  });

  // Reference fun_ta.vwap remarks require na before the first anchor. Reset
  // and post-reset weighted means reject a permanently-na or passthrough stub.
  it('vwap-delayed-anchor [ta.vwap]', () => {
    expect.soft(values('plot(ta.vwap(close, bar_index == 2 or bar_index == 4), "spec")'))
      .toEqual([null, null, 9, 11, 8, 38 / 3]);
  });

  // Reference fun_ta.vwap anchor parameter: omission = timeframe.change("1D").
  // Assert after an actual midnight boundary, avoiding first-bar ambiguity.
  it('vwap-default-daily-reset [ta.vwap]', () => {
    const dailyBars = bars.slice(0, 4).map((bar, index) => ({
      ...bar, time: Date.UTC(2026, 0, 1, 12) + index * 12 * 60 * 60_000,
    }));
    const output = values('plot(ta.vwap(close), "spec")', dailyBars);
    expect.soft(output.slice(1)).toEqual([14, 83 / 7, 12]);
  });


  // Reference: https://www.tradingview.com/pine-script-reference/v6/#fun_ta.percentile_linear_interpolation
  // Exact single-hole source remains pending v8/linear-percentile-missing-current-len3-v1.pine.
  // Native two-hole captures cannot settle this reference claim; 978 only masked the expected failure.
  it.skip('AUTHORITY-CONFLICT (TV v8 pending): percentile-linear-skips-na [ta.percentile_linear_interpolation]', () => {
    const data = [...bars, ...bars.slice(0, 3)].map((bar, i) => ({ ...bar, time: bars[0].time + i * 60_000 }));
    const output = values(`src = bar_index == 3 ? na : close
plot(ta.percentile_linear_interpolation(src, 4, 75), "spec")`, data);
    // Keep only the NA-inclusion claim; the archived finite-position baseline was a separate policy.
    expect(output[4]).toBeNull();
  });

  // DOC-vs-NATIVE: native wins (18ace021d3). coverage-register-ta-1-v1
  // rank_hole_builtin bars0..18, especially missing12/13 and recovery14..18.
  it('DOC-vs-NATIVE: percentrank-skips-window-na [ta.percentrank]', () => {
    const data = Array.from({ length: 19 }, (_, index) => ({
      ...bars[index % bars.length], time: bars[0].time + index * 60_000,
    }));
    const output = values(`phase = bar_index % 64
src = phase == 12 or phase == 13 ? na : 10.0 + phase % 7
plot(ta.percentrank(src, 4), "spec")`, data);
    expect(output).toEqual([
      null, null, null, null, 100, 100, 100, 0, 25, 50, 75, 100, 0, 0, 0, 25, 50, 75, 100,
    ]);
  });
});
