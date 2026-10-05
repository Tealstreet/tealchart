import { describe, expect, it } from 'vitest';
import { getPlot, runCompatScript } from './fixtures';
import { COG, Dev } from '../../src/runtime/codegen/ta-classes';

// Authority: native TradingView CSV packages/tealscript/oracle-probes/v2/captures/v2/conflicts-batch-1-v1.csv
// SHA256 233aa47cd64ae49423ba2aadb55d1762f3ebf4df96f9d52f5c96737a8d09026f. Selected historical rows only; blanks stay null.
const capture = {
  bars: [
    { open: 77682.0, high: 77682.01, low: 77572.0, close: 77674.04, time: 1788134400000, volume: 1.0 },
    { open: 77674.5, high: 77780.34, low: 77646.0, close: 77758.24, time: 1788134520000, volume: 1.0 },
    { open: 77758.24, high: 77827.99, low: 77724.0, close: 77740.01, time: 1788134640000, volume: 1.0 },
    { open: 77740.01, high: 77751.37, low: 77490.0, close: 77508.86, time: 1788134760000, volume: 1.0 },
    { open: 77508.86, high: 77525.28, low: 77436.4, close: 77437.58, time: 1788134880000, volume: 1.0 },
    { open: 77437.57, high: 77636.0, low: 77436.41, close: 77636.0, time: 1788135000000, volume: 1.0 },
    { open: 77635.99, high: 77726.0, low: 77576.0, close: 77725.99, time: 1788135120000, volume: 1.0 },
    { open: 77726.0, high: 77797.91, low: 77720.88, close: 77797.91, time: 1788135240000, volume: 1.0 },
    { open: 77797.99, high: 77896.0, low: 77784.0, close: 77864.01, time: 1788135360000, volume: 1.0 },
    { open: 77864.01, high: 77880.0, low: 77861.0, close: 77867.51, time: 1788135480000, volume: 1.0 },
    { open: 77867.5, high: 77951.87, low: 77862.0, close: 77924.0, time: 1788135600000, volume: 1.0 },
    { open: 77924.0, high: 77962.93, low: 77918.0, close: 77962.93, time: 1788135720000, volume: 1.0 },
    { open: 77962.92, high: 77971.47, low: 77948.0, close: 77971.01, time: 1788135840000, volume: 1.0 },
    { open: 77971.0, high: 77971.01, low: 77894.0, close: 77908.34, time: 1788135960000, volume: 1.0 },
    { open: 77908.34, high: 77923.62, low: 77888.0, close: 77901.33, time: 1788136080000, volume: 1.0 },
    { open: 77901.34, high: 77949.99, low: 77892.0, close: 77949.99, time: 1788136200000, volume: 1.0 },
    { open: 77950.0, high: 77958.0, low: 77932.0, close: 77942.0, time: 1788136320000, volume: 1.0 },
    { open: 77942.0, high: 78155.29, low: 77938.0, close: 78076.74, time: 1788136440000, volume: 1.0 },
    { open: 78076.75, high: 78185.89, low: 78039.34, close: 78050.0, time: 1788136560000, volume: 1.0 },
    { open: 78050.01, high: 78056.0, low: 77998.0, close: 78012.48, time: 1788136680000, volume: 1.0 },
    { open: 78013.42, high: 78052.0, low: 78006.0, close: 78052.0, time: 1788136800000, volume: 1.0 },
    { open: 78052.0, high: 78070.0, low: 78040.0, close: 78043.26, time: 1788136920000, volume: 1.0 },
    { open: 78043.26, high: 78043.26, low: 77994.0, close: 77996.04, time: 1788137040000, volume: 1.0 },
    { open: 77996.05, high: 78011.54, low: 77949.99, close: 77950.0, time: 1788137160000, volume: 1.0 },
    { open: 77949.99, high: 77985.43, low: 77947.93, close: 77978.0, time: 1788137280000, volume: 1.0 },
    { open: 77978.0, high: 78031.75, low: 77978.0, close: 77979.5, time: 1788137400000, volume: 1.0 },
  ],
  expected: {
    CF035_builtin: [null, null, null, null, null, null, null, null, null, -2.8461538461538463, -2.857142857142857, -3.0588235294117645, -3.1666666666666665, -3.171875, -3.064516129032258, null, null, null, null, null, -3.171875, -3.064516129032258, -2.8333333333333335, -2.8461538461538463, -2.857142857142857, -3.0588235294117645],
    CF039_builtin: [null, null, null, null, null, null, null, null, null, 1.2, 1.2, 1.6800000000000002, 2.16, 2.16, 1.6800000000000002, null, null, null, null, null, 2.16, 1.6800000000000002, 1.2, 1.2, 1.2, 1.6800000000000002],
  },
};

function expectNative(title: keyof typeof capture.expected, values: Array<number | null>): void {
  expect(values).toHaveLength(capture.expected[title].length);
  for (const [index, native] of capture.expected[title].entries()) {
    if (native === null) expect(values[index], `${title} bar${index}`).toBeNull();
    else expect(values[index], `${title} bar${index}`).toBeCloseTo(native, 8);
  }
}

describe('Native adjudication cog-dev', () => {
  it('matches the captured CF035_builtin vector', () => {
    const result = runCompatScript(`//@version=6
indicator("Native COG Dev")
src=int(time/120000)%11==7?float(na):10.0+float(int(time/120000)%7)
plot(ta.cog(src,5), "CF035_builtin")
plot(ta.dev(src,5), "CF039_builtin")`, { bars: capture.bars });
    expect(result.errors).toEqual([]);
    expectNative('CF035_builtin', getPlot(result, 'CF035_builtin').values);
  });
  it('matches the captured CF039_builtin vector', () => {
    const result = runCompatScript(`//@version=6
indicator("Native COG Dev")
src=int(time/120000)%11==7?float(na):10.0+float(int(time/120000)%7)
plot(ta.cog(src,5), "CF035_builtin")
plot(ta.dev(src,5), "CF039_builtin")`, { bars: capture.bars });
    expect(result.errors).toEqual([]);
    expectNative('CF039_builtin', getPlot(result, 'CF039_builtin').values);
  });
  it('restores raw slots and the independent aggregate on same-bar recomputation', () => {
    for (const [title, helper] of [['CF035_builtin', new COG(5)], ['CF039_builtin', new Dev(5)]] as const) {
      const values = capture.bars.map((bar) => {
        const slot = Math.trunc(bar.time / 120000);
        const source = slot % 11 === 7 ? NaN : 10 + slot % 7;
        helper.compute(1000);
        const value = helper.recompute(source);
        return Number.isNaN(value) ? null : value;
      });
      expectNative(title, values);
    }
  });
});
