import { describe, expect, it } from 'vitest';

import { VWAP } from '../../src/runtime/codegen/ta-classes';
import { getPlot, runCompatScript } from './fixtures';

const bars = [10, 20, 15, 40, 12, 18, 25, 11].map((close, index) => ({
  time: Date.UTC(2024, 0, 1, 0, index),
  open: close - 2,
  high: close + 3,
  low: close - 4,
  close,
  volume: (index % 3) + 1,
}));
const multipliers = [1, 2, 1, 3, 2, 3, 1, 2];
// Each anchor starts a new volume-weighted population: mean = sum(w*x)/sum(w),
// variance = sum(w*(x-mean)^2)/sum(w). These fractions use only the fixture bars.
const expectedMeans = [10, 50 / 3, 95 / 6, 135 / 7, 12, 78 / 5, 103 / 6, 125 / 8];
const expectedVariances = [0, 200 / 9, 425 / 36, 4000 / 49, 0, 216 / 25, 701 / 36, 1391 / 64];
const multiplierSource =
  'multiplier = bar_index == 3 or bar_index == 5 ? 3.0 : bar_index == 1 or bar_index == 4 or bar_index == 7 ? 2.0 : 1.0';
const calls = ['ta.vwap(close, anchor, multiplier)', 'ta.vwap(stdev_mult=multiplier, anchor=anchor, source=close)'];

function checkBands(source: string, multiplierValues: number[]) {
  const result = runCompatScript(source, { bars });
  expect(result.errors).toEqual([]);
  const middle = getPlot(result, 'Middle').values;
  const upper = getPlot(result, 'Upper').values;
  const lower = getPlot(result, 'Lower').values;
  const unitMiddle = getPlot(result, 'Unit middle').values;
  const unitUpper = getPlot(result, 'Unit upper').values;
  const unitLower = getPlot(result, 'Unit lower').values;
  for (const values of [middle, upper, lower, unitMiddle, unitUpper, unitLower]) {
    expect(values).toHaveLength(bars.length);
  }
  for (let index = 0; index < bars.length; index += 1) {
    const center = expectedMeans[index]!;
    const deviation = Math.sqrt(expectedVariances[index]!);
    expect(middle[index]).toBeCloseTo(center, 10);
    expect(unitMiddle[index]).toBeCloseTo(center, 10);
    expect(unitUpper[index]).toBeCloseTo(center + deviation, 10);
    expect(unitLower[index]).toBeCloseTo(center - deviation, 10);
    expect(upper[index]).toBeCloseTo(center + multiplierValues[index]! * deviation, 10);
    expect(lower[index]).toBeCloseTo(center - multiplierValues[index]! * deviation, 10);
    if (expectedVariances[index]! > 0) {
      expect(upper[index]!).toBeGreaterThan(middle[index]!);
      expect(lower[index]!).toBeLessThan(middle[index]!);
    }
  }
  return result;
}

// The v6 reference permits a series numeric stdev_mult; it scales the current bands.
describe('VWAP series band multiplier preserves the anchor period', () => {
  for (const version of [5, 6]) {
    for (const declaration of ['multiplier', 'int(multiplier)']) {
      for (const call of calls) {
        it(`v${version} ${declaration} keeps weighted state for ${call}`, () => {
          checkBands(
            `//@version=${version}
indicator("VWAP current multiplier")
${multiplierSource}
anchor = bar_index == 0 or bar_index == 4
[middle, upper, lower] = ${call.replaceAll('multiplier', declaration)}
[unitMiddle, unitUpper, unitLower] = ta.vwap(close, anchor, 1.0)
plot(middle, "Middle")
plot(upper, "Upper")
plot(lower, "Lower")
plot(unitMiddle, "Unit middle")
plot(unitUpper, "Unit upper")
plot(unitLower, "Unit lower")`,
            multipliers,
          );
        });
      }
    }

    it(`v${version} preserves function-scoped VWAP state as its multiplier changes`, () => {
      checkBands(
        `//@version=${version}
indicator("VWAP function multiplier")
bands(float source, bool anchor, float multiplier) =>
    ta.vwap(source, anchor, multiplier)
${multiplierSource}
anchor = bar_index == 0 or bar_index == 4
[middle, upper, lower] = bands(close, anchor, multiplier)
[unitMiddle, unitUpper, unitLower] = bands(close, anchor, 1.0)
plot(middle, "Middle")
plot(upper, "Upper")
plot(lower, "Lower")
plot(unitMiddle, "Unit middle")
plot(unitUpper, "Unit upper")
plot(unitLower, "Unit lower")`,
        multipliers,
      );
    });

    for (const constant of [1.0, 2.0]) {
      it(`v${version} keeps constant multiplier ${constant} bands and scalar VWAP aligned`, () => {
        const result = checkBands(
          `//@version=${version}
indicator("VWAP constant multiplier")
anchor = bar_index == 0 or bar_index == 4
[middle, upper, lower] = ta.vwap(close, anchor, ${constant.toFixed(1)})
[unitMiddle, unitUpper, unitLower] = ta.vwap(close, anchor, 1.0)
scalar = ta.vwap(close, anchor)
plot(middle, "Middle")
plot(upper, "Upper")
plot(lower, "Lower")
plot(unitMiddle, "Unit middle")
plot(unitUpper, "Unit upper")
plot(unitLower, "Unit lower")
plot(scalar - middle, "Scalar difference")`,
          bars.map(() => constant),
        );
        expect(getPlot(result, 'Scalar difference').values).toEqual(bars.map(() => 0));
      });
    }
  }
});

it('recomputes with the current multiplier and the existing pre-bar accumulator snapshot', () => {
  const dynamic = new VWAP(true, 1);
  dynamic.compute(10, true, 1, 1);
  dynamic.compute(20, false, 2, 1);
  dynamic.compute(30, false, 3, 2);
  const [middle, upper, lower] = dynamic.recompute(40, false, 4, 3) as [number, number, number];
  expect(middle).toBe(30);
  // The provisional 30 is replaced: prices [10,20,40], volumes [1,2,4].
  // Center 30 gives variance (1*400 + 2*100 + 4*100)/7 = 1000/7.
  const deviation = Math.sqrt(1000 / 7);
  expect(upper).toBeCloseTo(30 + 3 * deviation, 10);
  expect(lower).toBeCloseTo(30 - 3 * deviation, 10);
  expect(upper).toBeGreaterThan(middle);
  expect(lower).toBeLessThan(middle);
});
