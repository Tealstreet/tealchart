import { describe, expect, it } from 'vitest';
import { getPlot, runCompatScript } from './fixtures';
import { KC, KCW } from '../../src/runtime/codegen/ta-classes';

// Authority: native TradingView CSV packages/tealscript/oracle-probes/v2/captures/v2/conflicts-batch-2-v1.csv
// SHA256 35d87ca506de4cd153198a4be5abcb7dd8e1312dc1e2092facb5b311ff337a14. Selected historical rows only; blanks stay null.
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
    CF041_builtin_upper: [null, null, null, null, null, 77982.78066666667, 77997.18377777778, 77982.11251851852, 78017.41167901234, 77980.11111934157, 78021.3207462277, 78031.81049748514, 78027.19033165676, 78038.91355443784, 78016.79903629188, null, 78010.73384265798, 78177.59589510532, 78232.76393007021, 78198.0026200468, 78180.00174669788, 78154.42116446524, 78134.46744297683, 78114.01162865122, 78093.6744191008, 78091.44961273386],
    CF043_builtin: [null, null, null, null, null, 0.008223965041633245, 0.008055694949307255, 0.006689305427072769, 0.006377031341699907, 0.004575180319424375, 0.004587871069337165, 0.0038261973692630567, 0.002951484372377206, 0.0032856042051294804, 0.0028001027627919473, null, 0.0023507536641483133, 0.005281821373223214, 0.006025234956992364, 0.005007989957696619, 0.0041240885730369084, 0.003261750832396485, 0.003016659800743963, 0.003063891184702287, 0.002683854319140202, 0.002708279187761404],
  },
};

function expectNative(title: keyof typeof capture.expected, values: Array<number | null>): void {
  expect(values).toHaveLength(capture.expected[title].length);
  for (const [index, native] of capture.expected[title].entries()) {
    if (native === null) expect(values[index], `${title} bar${index}`).toBeNull();
    else expect(values[index], `${title} bar${index}`).toBeCloseTo(native, 8);
  }
}

describe('Native adjudication kc', () => {
  it('matches the captured CF041_builtin_upper vector', () => {
    const result = runCompatScript(`//@version=6
indicator("Native KC")
src=int(time/120000)%11==7?float(na):close
[m,u,l]=ta.kc(src,5,2,false)
plot(u, "CF041_builtin_upper")
plot(ta.kcw(src,5,2,false), "CF043_builtin")`, { bars: capture.bars });
    expect(result.errors).toEqual([]);
    expectNative('CF041_builtin_upper', getPlot(result, 'CF041_builtin_upper').values);
  });
  it('matches the captured CF043_builtin vector', () => {
    const result = runCompatScript(`//@version=6
indicator("Native KC")
src=int(time/120000)%11==7?float(na):close
[m,u,l]=ta.kc(src,5,2,false)
plot(u, "CF041_builtin_upper")
plot(ta.kcw(src,5,2,false), "CF043_builtin")`, { bars: capture.bars });
    expect(result.errors).toEqual([]);
    expectNative('CF043_builtin', getPlot(result, 'CF043_builtin').values);
  });
  it('recomputes source and OHLC independently without retaining transient range state', () => {
    const kc = new KC(5, 2, false);
    const kcw = new KCW(5, 2, false);
    const values = capture.bars.map((bar) => {
      const slot = Math.trunc(bar.time / 120000);
      const source = slot % 11 === 7 ? NaN : bar.close;
      kc.compute(1000, bar.high + 5000, bar.low - 5000, bar.close + 5000);
      kcw.compute(1000, bar.high + 5000, bar.low - 5000, bar.close + 5000);
      const upper = kc.recompute(source, bar.high, bar.low, bar.close)[1];
      const width = kcw.recompute(source, bar.high, bar.low, bar.close);
      return { upper: Number.isNaN(upper) ? null : upper, width: Number.isNaN(width) ? null : width };
    });
    expectNative('CF041_builtin_upper', values.map((value) => value.upper));
    expectNative('CF043_builtin', values.map((value) => value.width));
  });
});
