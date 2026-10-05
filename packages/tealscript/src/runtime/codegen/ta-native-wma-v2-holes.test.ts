import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

interface NativeWindow {
  name: string;
  csv: string;
  column: string;
  first: number;
  length: number;
  startCompare: number;
  wave?: boolean;
  close: number[];
  expected: Array<number | null>;
}
// Literal native CSV excerpts. Paths are packages/tealscript/oracle-probes/v2/captures/v2/<csv>.
// Each fixture names its original phase/bar range. The source shape is retained;
// a short independent excerpt replaces preceding chart bars once its window is warm.
const fixtures: NativeWindow[] = [
  {
    name: 'warmup length2 phases-2..12',
    csv: 'warmup-seed-ma-v2.csv',
    column: 'wma_len2_holes_p1_p2_p40_p41_p80to85',
    first: -2,
    length: 2,
    startCompare: 0,
    close: [
      84586.01, 84589.27, 84589.27, 84589.27, 84589.27, 84609.99, 84602.0, 84602.0, 84603.45, 84578.01, 84588.0,
      84610.0, 84612.01, 84629.65, 84640.0,
    ],
    expected: [
      null,
      null,
      null,
      null,
      null,
      84603.08333333333,
      84604.66333333333,
      84602.0,
      84602.96666666666,
      84586.48999999999,
      84584.67,
      84602.66666666667,
      84611.34,
      84623.77,
      84636.55,
    ],
  },
  {
    name: 'warmup length5 phases-2..12',
    csv: 'warmup-seed-ma-v2.csv',
    column: 'wma_len5_holes_p1_p2_p40_p41_p80to85',
    first: -2,
    length: 5,
    startCompare: 0,
    close: [
      84586.01, 84589.27, 84589.27, 84589.27, 84589.27, 84609.99, 84602.0, 84602.0, 84603.45, 84578.01, 84588.0,
      84610.0, 84612.01, 84629.65, 84640.0,
    ],
    expected: [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      84602.7,
      84594.92266666667,
      84591.226,
      84596.32866666667,
      84601.568,
      84612.02,
      84624.17533333333,
    ],
  },
  {
    name: 'warmup length2 phases75..94',
    csv: 'warmup-seed-ma-v2.csv',
    column: 'wma_len2_holes_p1_p2_p40_p41_p80to85',
    first: 75,
    length: 2,
    startCompare: 4,
    close: [
      84590.0, 84590.0, 84588.0, 84588.01, 84590.06, 84590.06, 84590.06, 84590.05, 84590.05, 84590.04, 84579.99,
      84600.01, 84592.57, 84592.57, 84611.01, 84590.64, 84590.64, 84590.64, 84590.63, 84580.75,
    ],
    expected: [
      84590.47666666667,
      84590.0,
      84588.66666666667,
      84588.00666666667,
      84589.37666666666,
      null,
      null,
      null,
      null,
      null,
      null,
      84596.69333333333,
      84595.05,
      84592.57,
      84604.86333333333,
      84597.43,
      84590.64,
      84590.64,
      84590.63333333335,
      84584.04333333333,
    ],
  },
  {
    name: 'warmup length5 phases75..94',
    csv: 'warmup-seed-ma-v2.csv',
    column: 'wma_len5_holes_p1_p2_p40_p41_p80to85',
    first: 75,
    length: 5,
    startCompare: 4,
    close: [
      84590.0, 84590.0, 84588.0, 84588.01, 84590.06, 84590.06, 84590.06, 84590.05, 84590.05, 84590.04, 84579.99,
      84600.01, 84592.57, 84592.57, 84611.01, 84590.64, 84590.64, 84590.64, 84590.63, 84580.75,
    ],
    expected: [
      84591.394,
      84590.57133333333,
      84589.61933333334,
      84588.89866666666,
      84589.08933333334,
      null,
      null,
      null,
      null,
      null,
      null,
      84593.37666666666,
      84593.55,
      84593.55600000001,
      84599.54133333334,
      84597.34000000001,
      84595.1,
      84593.48466666667,
      84591.99466666667,
      84587.34066666666,
    ],
  },
  {
    name: 'length14 consecutive holes bars20..60',
    csv: 'coverage-ta-2-v1.csv',
    column: 'wma_len14_hole40_41',
    first: 20,
    length: 14,
    startCompare: 13,
    close: [
      78052.0, 78043.26, 77996.04, 77950.0, 77978.0, 77979.5, 78010.01, 77996.36, 77948.0, 77937.04, 77984.0, 77870.5,
      77766.95, 77694.78, 77646.57, 77634.76, 77607.96, 77609.05, 77614.39, 77778.45, 77743.47, 77796.01, 77819.73,
      77797.99, 77775.26, 77742.36, 77730.0, 77706.0, 77806.0, 77855.49, 77815.25, 77774.0, 77843.99, 77748.01, 77772.0,
      77748.01, 77714.03, 77727.91, 77684.01, 77640.94, 77597.24,
    ],
    expected: [
      77984.17599999999,
      77996.79876190476,
      78000.78885714286,
      77997.38285714285,
      77996.92457142858,
      77996.15199999999,
      77999.28961904762,
      78000.2358095238,
      77993.89571428571,
      77985.64980952382,
      77983.78857142857,
      77966.39399999999,
      77937.15695238094,
      77900.99295238096,
      77861.42666666665,
      77824.14695238096,
      77787.18438095239,
      77754.06314285715,
      77724.90104761905,
      77721.07657142857,
      null,
      null,
      77727.33742857144,
      77733.53533333333,
      77738.02685714285,
      77740.11971428571,
      77741.78495238094,
      77740.60209523811,
      77752.64571428571,
      77769.76961904761,
      77779.426,
      77781.60819047618,
      77791.55142857143,
      77786.51066666667,
      77784.95847619047,
      77780.26904761903,
      77771.33885714285,
      77765.266,
      77754.00723809525,
      77737.87485714286,
      77716.88171428572,
    ],
  },
  {
    name: 'length3 wave consecutive holes bars0..45',
    csv: 'coverage-tad-1-v1.csv',
    column: 'wma_hole_builtin',
    first: 0,
    length: 3,
    startCompare: 0,
    wave: true,
    close: [
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1,
    ],
    expected: [
      null,
      null,
      51.333333333333336,
      56.666666666666664,
      57.0,
      57.333333333333336,
      62.666666666666664,
      63.0,
      63.333333333333336,
      68.66666666666667,
      69.0,
      58.333333333333336,
      56.333333333333336,
      53.0,
      53.333333333333336,
      58.666666666666664,
      59.0,
      59.333333333333336,
      64.66666666666667,
      65.0,
      65.33333333333333,
      70.66666666666667,
      60.0,
      53.0,
      54.666666666666664,
      55.0,
      55.333333333333336,
      60.666666666666664,
      61.0,
      61.333333333333336,
      66.66666666666667,
      67.0,
      67.33333333333333,
      61.666666666666664,
      54.666666666666664,
      51.333333333333336,
      56.666666666666664,
      57.0,
      57.333333333333336,
      62.666666666666664,
      null,
      null,
      72.0,
      70.0,
      58.333333333333336,
      56.333333333333336,
    ],
  },
];

describe('Native v2 WMA leading and consecutive holes', () => {
  it.each(fixtures)('$name', (fixture) => {
    const bars = fixture.close.map((close, index) => ({
      time: index * 120000,
      open: close,
      high: close,
      low: close,
      close,
      volume: 1,
    }));
    const warmup = fixture.csv === 'warmup-seed-ma-v2.csv';
    const source = fixture.wave ? '50.0 + (bar % 11) * 2.0 + (bar % 3 == 0 ? 7.0 : -3.0)' : 'close';
    const result = executeScript(
      parse(`//@version=6
indicator("Native v2 WMA holes")
bar = bar_index + ${fixture.first}
source = ${source}
hole = ${warmup ? 'bar == 1 or bar == 2 or bar == 40 or bar == 41 or (bar >= 80 and bar <= 85)' : 'bar == 40 or bar == 41'}
s = ${warmup ? 'bar < 0 or hole' : 'hole'} ? na : source
plot(ta.wma(s, ${fixture.length}), "value")`),
      bars,
    );
    expect(result.errors).toEqual([]);
    const values = result.plots[0].values;
    expect(values).toHaveLength(fixture.expected.length);
    fixture.expected.forEach((value, index) => {
      if (index < fixture.startCompare) return;
      const message = `${fixture.csv}:${fixture.column} phase/bar ${fixture.first + index}`;
      if (value === null) expect(values[index], message).toBeNull();
      else expect(values[index], message).toBeCloseTo(value, 8);
    });
  });
});
