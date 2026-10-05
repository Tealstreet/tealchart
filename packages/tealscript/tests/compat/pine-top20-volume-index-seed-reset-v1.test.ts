import { describe, expect, it } from 'vitest';

import { NegativeVolumeIndex, PositiveVolumeIndex } from '../../src/runtime/codegen/ta-classes';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Official v6 reference entries73/74: seed1, previous-zero reset and nz guards.
const reference = `f_nvi() =>
    float ta_nvi = 1.0
    float prevNvi = (nz(ta_nvi[1], 0.0) == 0.0) ? 1.0 : ta_nvi[1]
    if nz(close, 0.0) == 0.0 or nz(close[1], 0.0) == 0.0
        ta_nvi := prevNvi
    else
        ta_nvi := (volume < nz(volume[1], 0.0)) ? prevNvi + ((close - close[1]) / close[1]) * prevNvi : prevNvi
    result = ta_nvi

f_pvi() =>
    float ta_pvi = 1.0
    float prevPvi = (nz(ta_pvi[1], 0.0) == 0.0) ? 1.0 : ta_pvi[1]
    if nz(close, 0.0) == 0.0 or nz(close[1], 0.0) == 0.0
        ta_pvi := prevPvi
    else
        ta_pvi := (volume > nz(volume[1], 0.0)) ? prevPvi + ((close - close[1]) / close[1]) * prevPvi : prevPvi
    result = ta_pvi

`;

function execute(closes: number[], volumes: number[]) {
  const bars = closes.map((close, index) => ({
    ...compatibilityBars[0],
    time: compatibilityBars[0].time + index * 60_000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: volumes[index],
  }));
  const result = runCompatScript(
    `//@version=6
indicator("Documented volume index")
${reference}
plot(ta.nvi, "NVI")
plot(f_nvi(), "NVI_REFERENCE")
plot(ta.pvi, "PVI")
plot(f_pvi(), "PVI_REFERENCE")`,
    { bars },
  );
  expect(result.errors).toEqual([]);
  expect(getPlot(result, 'NVI').values).toEqual(getPlot(result, 'NVI_REFERENCE').values);
  expect(getPlot(result, 'PVI').values).toEqual(getPlot(result, 'PVI_REFERENCE').values);
  return result;
}

describe('TOP20 job 14 documented NVI/PVI seed and reset', () => {
  it('holds across current and previous missing/zero close and equal volume', () => {
    const result = execute([10, 20, 30, NaN, 40, 50, 0, 60, 90], [100, 90, 110, 80, 120, 120, 130, 90, 140]);
    const nvi = getPlot(result, 'NVI').values;
    const pvi = getPlot(result, 'PVI').values;
    expect(nvi).toEqual([1, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(pvi).toEqual([1, 1, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 2.25]);
  });

  it('uses the documented nz previous-volume comparison after a missing volume', () => {
    const result = execute([10, 20, 30, 40, 50], [100, NaN, 90, 90, NaN]);
    expect(getPlot(result, 'NVI').values).toEqual([1, 1, 1, 1, 1]);
    expect(getPlot(result, 'PVI').values).toEqual([1, 1, 1.5, 1.5, 1.5]);
  });

  it.each([true, false])('resets a prior zero accumulator before volume update; negative=%s', (negative) => {
    const result = execute([1e18, 1, 2, NaN, 3], negative ? [100, 90, 80, 70, 60] : [100, 110, 120, 130, 140]);
    expect(getPlot(result, negative ? 'NVI' : 'PVI').values).toEqual([1, 0, 2, 2, 2]);
    expect(getPlot(result, negative ? 'PVI' : 'NVI').values).toEqual([1, 1, 1, 1, 1]);
  });

  it.each([true, false])('resets prior zero even when current close is missing; negative=%s', (negative) => {
    const result = execute([1e18, 1, NaN, 2, 3], negative ? [100, 90, 80, 70, 60] : [100, 110, 120, 130, 140]);
    expect(getPlot(result, negative ? 'NVI' : 'PVI').values).toEqual([1, 0, 1, 1, 1.5]);
  });

  it.each([true, false])('restores prior-zero reset state in class snapshots; negative=%s', (negative) => {
    const kernel = negative ? new NegativeVolumeIndex() : new PositiveVolumeIndex();
    const expected = [1, 0, 1, 1, 1.5];
    for (const [index, close] of [1e18, 1, NaN, 2, 3].entries()) {
      const volume = negative ? 100 - index * 10 : 100 + index * 10;
      const snapshot = kernel.save();
      expect(kernel.compute(close, close, close, close, volume)).toBe(expected[index]);
      kernel.compute(800, 800, 800, 800, 800);
      kernel.restore(snapshot);
      expect(kernel.compute(close, close, close, close, volume)).toBe(expected[index]);
    }
  });
});
