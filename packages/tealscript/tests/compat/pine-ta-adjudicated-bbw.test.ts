import { describe, expect, it } from 'vitest';
import { getPlot, runCompatScript } from './fixtures';
import { BBW } from '../../src/runtime/codegen/ta-classes';

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
    CF034_builtin: [null, null, null, null, 1.319763646374435, 1.2982349096071453, 1.2282502723190043, 1.3732201025130322, 1.5260796103294652, 0.9046085632573864, 0.6982171787760009, 0.5794287301245753, 0.4666530733392921, 0.3875024703297048, 0.2914765509374763, 0.2930947875662416, 0.26822018952501875, 0.6501766097855599, 0.691392053446406, 0.5468252123357725, 0.48228494018314705, 0.21126610525634437, 0.23003726535017036, 0.3745082435998673, 0.3972255885095995, 0.3153441910240135],
  },
};

function expectNative(title: keyof typeof capture.expected, values: Array<number | null>): void {
  expect(values).toHaveLength(capture.expected[title].length);
  for (const [index, native] of capture.expected[title].entries()) {
    if (native === null) expect(values[index], `${title} bar${index}`).toBeNull();
    else expect(values[index], `${title} bar${index}`).toBeCloseTo(native, 8);
  }
}

describe('Native adjudication bbw', () => {
  it('matches the captured CF034_builtin vector', () => {
    const result = runCompatScript(`//@version=6
indicator("Native BBW")
plot(ta.bbw(close,5,4), "CF034_builtin")`, { bars: capture.bars });
    expect(result.errors).toEqual([]);
    expectNative('CF034_builtin', getPlot(result, 'CF034_builtin').values);
  });
  it('recomputes each captured bar without retaining a transient tick', () => {
    const bbw = new BBW(5, 4);
    const values = capture.bars.map((bar) => {
      bbw.compute(bar.close + 10000);
      const value = bbw.recompute(bar.close);
      return Number.isNaN(value) ? null : value;
    });
    expectNative('CF034_builtin', values);
  });
});
