import { describe, expect, it } from 'vitest';

import { SAR } from '../../src/runtime/codegen/ta-classes';
import { getPlot, runCompatScript } from './fixtures';

// Native authority: oracle-probes/v2/captures/v2/coverage-ta-3-v1.csv bars0–22.
// Five parameter columns cover initialization, an early reversal and acceleration.
// coverage-tad-1-v1.csv sar_builtin repeats the .02/.02/.2 native column.
const prices = [
  [77682.01, 77572.0, 77674.04],
  [77780.34, 77646.0, 77758.24],
  [77827.99, 77724.0, 77740.01],
  [77751.37, 77490.0, 77508.86],
  [77525.28, 77436.4, 77437.58],
  [77636.0, 77436.41, 77636.0],
  [77726.0, 77576.0, 77725.99],
  [77797.91, 77720.88, 77797.91],
  [77896.0, 77784.0, 77864.01],
  [77880.0, 77861.0, 77867.51],
  [77951.87, 77862.0, 77924.0],
  [77962.93, 77918.0, 77962.93],
  [77971.47, 77948.0, 77971.01],
  [77971.01, 77894.0, 77908.34],
  [77923.62, 77888.0, 77901.33],
  [77949.99, 77892.0, 77949.99],
  [77958.0, 77932.0, 77942.0],
  [78155.29, 77938.0, 78076.74],
  [78185.89, 78039.34, 78050.0],
  [78056.0, 77998.0, 78012.48],
  [78052.0, 78006.0, 78052.0],
  [78070.0, 78040.0, 78043.26],
  [78043.26, 77994.0, 77996.04],
];
const fixtures = [
  {
    params: [0.02, 0.02, 0.2],
    expected: [
      null,
      77572.0,
      77572.0,
      77827.99,
      77827.99,
      77812.3264,
      77797.289344,
      77436.4,
      77443.6302,
      77461.724992,
      77479.09599232,
      77507.4624327808,
      77543.89983815834,
      77586.65685434251,
      77625.13816890826,
      77659.77135201744,
      77690.9412168157,
      77718.99409513413,
      77771.34960371803,
      77829.3852591975,
      77879.29592290985,
      77922.21909370247,
      77959.13302058412,
    ],
  },
  {
    params: [0.01, 0.01, 0.1],
    expected: [
      null,
      77572.0,
      77572.0,
      77827.99,
      77827.99,
      77820.1582,
      77812.483036,
      77804.96137528,
      77436.4,
      77440.996,
      77445.54604,
      77455.6725192,
      77470.890243624,
      77490.91343387905,
      77510.13569652388,
      77528.58906866293,
      77546.3043059164,
      77563.31093367975,
      77592.90988699577,
      77628.48869377602,
      77661.93277214945,
      77693.37020582048,
      77722.92139347125,
    ],
  },
  {
    params: [0.05, 0.05, 0.5],
    expected: [
      null,
      77572.0,
      77572.0,
      77827.99,
      77827.99,
      77788.831,
      77753.5879,
      77436.4,
      77454.4755,
      77498.62795,
      77538.36515499999,
      77600.39088174999,
      77672.89870539999,
      77747.54152905,
      77803.5236467875,
      77845.51023509062,
      77877.00017631796,
      77892.0,
      77932.0,
      78185.89,
      78185.89,
      78176.4955,
      78167.570725,
    ],
  },
  {
    params: [0.03, 0.03, 0.2],
    expected: [
      null,
      77572.0,
      77572.0,
      77827.99,
      77827.99,
      77804.4946,
      77782.408924,
      77436.4,
      77447.2453,
      77474.17058199999,
      77499.48034708,
      77540.1954158428,
      77590.92356594166,
      77648.00553105041,
      77696.52520139285,
      77737.76692118392,
      77772.82238300634,
      77802.61952555539,
      77866.10021095542,
      77930.05816876434,
      77981.22453501147,
      77998.0,
      78185.89,
    ],
  },
  {
    params: [0.04, 0.04, 0.2],
    expected: [
      null,
      77572.0,
      77572.0,
      77827.99,
      77827.99,
      77796.6628,
      77767.841776,
      77436.4,
      77450.86039999999,
      77486.471568,
      77519.23384255999,
      77571.15018145279,
      77633.83495242034,
      77701.36196193627,
      77755.38356954901,
      77798.6008556392,
      77833.17468451137,
      77860.8337476091,
      77919.72499808727,
      77938.0,
      77987.578,
      77998.0,
      78185.89,
    ],
  },
] as const;
function compare(actual: (number | null)[], expected: readonly (number | null)[]) {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, index) =>
    value === null
      ? expect(actual[index], `bar${index}`).toBeNull()
      : expect(actual[index], `bar${index}`).toBeCloseTo(value, 7),
  );
}
const bars = prices.map(([high, low, close], index) => ({
  time: 1788134400000 + index * 120000,
  open: close!,
  high: high!,
  low: low!,
  close: close!,
  volume: 100,
}));
describe('native SAR initialization and reversal order', () => {
  it.each(fixtures)('matches native start/inc/max $params', ({ params, expected }) => {
    const result = runCompatScript(`//@version=6\nindicator("SAR")\nplot(ta.sar(${params.join(',')}),title="SAR")\n`, {
      bars,
    });
    expect(result.errors).toEqual([]);
    compare(getPlot(result, 'SAR').values, expected);
  });
  it('uses the same native state machine in the legacy global', () => {
    const result = runCompatScript('//@version=4\nstudy("Legacy SAR")\nplot(sar(.02,.02,.2),title="SAR")\n', { bars });
    expect(result.errors).toEqual([]);
    compare(getPlot(result, 'SAR').values, fixtures[0].expected);
  });
  // Independent small example follows the archived first-party ta.sar example:
  // equal/decreasing closes start above; increasing closes start below.
  it('recomputes second-bar direction from the replacement close', () => {
    const sar = new SAR(0.02, 0.02, 0.2);
    expect(sar.compute(10, 0, 8)).toBeNaN();
    expect(sar.compute(9, 1, 2)).toBe(10);
    expect(sar.recompute(9, 1, 9)).toBe(0);
    expect(sar.recompute(9, 1, 2)).toBe(10);
  });
  it('retains close/history state through intrabar recompute and restore', () => {
    const sar = new SAR(0.02, 0.02, 0.2);
    bars.slice(0, -1).forEach((bar) => sar.compute(bar.high, bar.low, bar.close));
    const saved = sar.save();
    sar.compute(1, 0, 1);
    const last = bars.at(-1)!;
    expect(sar.recompute(last.high, last.low, last.close)).toBeCloseTo(fixtures[0].expected.at(-1)!, 7);
    sar.restore(saved);
    expect(sar.compute(last.high, last.low, last.close)).toBeCloseTo(fixtures[0].expected.at(-1)!, 7);
  });
});
