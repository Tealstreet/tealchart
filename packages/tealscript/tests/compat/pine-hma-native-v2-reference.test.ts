import { describe, expect, it } from 'vitest';

import { HMA } from '../../src/runtime/codegen/ta-classes';
import { getPlot, runCompatScript } from './fixtures';

// Native TV authority: oracle-probes/v2/captures/v2/coverage-ta-2-v1.csv bars0–21;
// coverage-tab-1-v1.csv bars0–4; warmup-seed-ma-v2.csv bars24007–24022.
// These are small literal witnesses, with no CSV import or generated replay fixture.
const closes = [
  77674.04, 77758.24, 77740.01, 77508.86, 77437.58, 77636.0, 77725.99, 77797.91, 77864.01, 77867.51, 77924.0, 77962.93,
  77971.01, 77908.34, 77901.33, 77949.99, 77942.0, 78076.74, 78050.0, 78012.48, 78052.0, 78043.26,
];
const clean14 = [
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  77996.12911111112,
  77986.44969047619,
  77999.46238888889,
  78018.95034920635,
  78033.93213492063,
  78049.20521428571,
  78061.97834920633,
];
const leading14 = [
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  78049.20521428571,
  78061.97834920633,
];
const short3 = [null, null, 77744.92833333333, 77390.24666666666, 77363.41500000001];
const holeCloses = [
  84638.06, 84624.01, 84624.02, 84590.01, 84590.01, 84576.02, 84589.48, 84589.87, 84579.19, 84579.2, 84589.99, 84608.67,
  84610.0, 84620.0, 84624.01, 84641.88,
];
const holeFixtures = [
  {
    length: 2,
    mode: 'clean',
    expected: [
      84571.35666666667, 84593.96666666666, 84590.0, 84575.63, 84579.20333333332, 84593.58666666668, 84614.89666666665,
      84610.44333333334, 84623.33333333333, 84625.34666666666, 84647.83666666667,
    ],
  },
  {
    length: 2,
    mode: 'holes',
    expected: [
      84571.35666666667,
      null,
      null,
      84580.24666666666,
      84579.20333333332,
      84593.58666666668,
      84614.89666666665,
      84610.44333333334,
      84623.33333333333,
      84625.34666666666,
      84647.83666666667,
    ],
  },
  {
    length: 5,
    mode: 'clean',
    expected: [
      84571.30288888888, 84577.48400000001, 84588.84288888889, 84584.88888888889, 84577.63733333333, 84583.89044444443,
      84604.14533333333, 84617.17911111111, 84623.2017777778, 84628.01, 84640.22222222223,
    ],
  },
  {
    length: 5,
    mode: 'holes',
    expected: [
      84571.30288888888,
      null,
      null,
      84575.24444444447,
      84579.73111111113,
      84587.24133333332,
      84605.67555555557,
      84617.48688888889,
      84623.2017777778,
      84628.01,
      84640.22222222223,
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
function barsFor(values: number[]) {
  return values.map((close, index) => ({
    time: Date.UTC(2024, 0, 1) + index * 120000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
  }));
}
describe('native HMA final-window and holes', () => {
  it.each([
    ['clean', 'close', clean14],
    ['leading', 'bar_index < 5 ? na : close', leading14],
  ] as const)('matches native length14 %s seed and values', (_name, source, expected) => {
    const result = runCompatScript(`//@version=6\nindicator("HMA14")\nplot(ta.hma(${source},14),title="HMA")\n`, {
      bars: barsFor(closes),
    });
    expect(result.errors).toEqual([]);
    compare(getPlot(result, 'HMA').values, expected);
  });
  it('uses final window1 for length3, including explicit int cast', () => {
    const result = runCompatScript('//@version=6\nindicator("HMA3")\nplot(ta.hma(close,int(3.0)),title="HMA")\n', {
      bars: barsFor(closes.slice(0, 5)),
    });
    expect(result.errors).toEqual([]);
    compare(getPlot(result, 'HMA').values, short3);
  });
  it.each(holeFixtures)('matches native length$length $mode publication and recovery', ({ length, mode, expected }) => {
    const source = mode === 'holes' ? 'bar_index == 6 or bar_index == 7 ? na : close' : 'close';
    const result = runCompatScript(
      `//@version=6\nindicator("HMA holes")\nplot(ta.hma(${source},${length}),title="HMA")\n`,
      { bars: barsFor(holeCloses) },
    );
    expect(result.errors).toEqual([]);
    compare(getPlot(result, 'HMA').values.slice(5), expected);
  });
  // coverage-ta-2-v1.csv bars24–46, comparison39–46 after local warmup.
  it('advances length14 through both missing inputs and final weighted slots', () => {
    const closes = [
      77978.0, 77979.5, 78010.01, 77996.36, 77948.0, 77937.04, 77984.0, 77870.5, 77766.95, 77694.78, 77646.57, 77634.76,
      77607.96, 77609.05, 77614.39, 77778.45, 77743.47, 77796.01, 77819.73, 77797.99, 77775.26, 77742.36, 77730.0,
    ];
    const expected = [
      77568.98953174602,
      null,
      null,
      77689.68121428571,
      77767.31638095237,
      77815.8795079365,
      77820.17756349205,
      77804.51588095239,
    ];
    const result = runCompatScript(
      '//@version=6\nindicator("HMA14 holes")\nsource=bar_index == 16 or bar_index == 17 ? na : close\nplot(ta.hma(source,14),title="HMA")\n',
      { bars: barsFor(closes) },
    );
    expect(result.errors).toEqual([]);
    compare(getPlot(result, 'HMA').values.slice(15), expected);
  });
  it('restores final-window state for recompute and save/restore', () => {
    const hma = new HMA(14);
    closes.slice(0, -1).forEach((value) => hma.compute(value));
    const saved = hma.save();
    hma.compute(1);
    expect(hma.recompute(closes.at(-1)!)).toBeCloseTo(clean14.at(-1)!, 7);
    hma.restore(saved);
    expect(hma.compute(closes.at(-1)!)).toBeCloseTo(clean14.at(-1)!, 7);
  });
});
