import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { Supertrend } from '../../src/runtime/codegen/ta-classes';
import { getPlot, runCompatScript } from './fixtures';

// Native v6 supertrend-factor-{alone,alone-first3,paired-fixed2}-v2, attempt1, bars0–11.
// CSV evidence is under oracle-probes/v6/captures/v6; source hashes distinguish all three captures.
const prices = [
  [77682, 77682.01, 77572, 77674.04, 51.86295],
  [77674.5, 77780.34, 77646, 77758.24, 33.50717],
  [77758.24, 77827.99, 77724, 77740.01, 33.1126],
  [77740.01, 77751.37, 77490, 77508.86, 94.421],
  [77508.86, 77525.28, 77436.4, 77437.58, 30.43664],
  [77437.57, 77636, 77436.41, 77636, 31.56641],
  [77635.99, 77726, 77576, 77725.99, 32.61091],
  [77726, 77797.91, 77720.88, 77797.91, 19.17203],
  [77797.99, 77896, 77784, 77864.01, 38.48407],
  [77864.01, 77880, 77861, 77867.51, 7.87193],
  [77867.5, 77951.87, 77862, 77924, 18.21319],
  [77924, 77962.93, 77918, 77962.93, 17.74209],
];
const bars = prices.map(([open, high, low, close, volume], index) => ({
  time: (1788134400 + index * 120) * 1000,
  open,
  high,
  low,
  close,
  volume,
}));
const first2Line = [
  0,
  null,
  78008.22166666666,
  77949.74944444443,
  77759.46962962963,
  77759.46962962963,
  77759.46962962963,
  77499.68029492456,
  77592.19019661637,
  77692.62679774425,
  77728.4395318295,
  77791.51468788633,
];
const first3Line = [
  0,
  null,
  78124.33499999999,
  78114.28166666666,
  77898.78444444443,
  77898.78444444443,
  77898.78444444443,
  77898.78444444443,
  77898.78444444443,
  77898.78444444443,
  77639.19179774425,
  77717.0395318295,
];
const first2Direction = [1, 1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1];
const first3Direction = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, -1, -1];
const scenarios = [
  {
    title: 'alone-first3',
    first: 3,
    second: 2,
    paired: false,
    hash: '6c68c0b2c5d5aed235f7102b1fffe0525cea2da6410f270e4cc331fcbd63e3ca',
  },
  {
    title: 'alone',
    first: 2,
    second: 3,
    paired: false,
    hash: '9744da2fd144dbaab123dec19935a38b703014c28e9f4100f0a90c6dbf53311c',
  },
  {
    title: 'paired-fixed2',
    first: 2,
    second: 3,
    paired: true,
    hash: '73556b702f0b324d1d9ffee4387d1564a66ed61b1482b18a1983aa67406c9bab',
  },
];

function capturedSource(scenario: (typeof scenarios)[number]): string {
  return `//@version=6
indicator("Supertrend factor ${scenario.title} v2", overlay=false)
factor = bar_index % 2 == 0 ? ${scenario.first}.0 : ${scenario.second}.0
[line, direction] = ta.supertrend(factor, 3)
${scenario.paired ? '[fixedLine, fixedDirection] = ta.supertrend(2.0, 3)\n' : ''}plot(time, "input_time_ms", display=display.data_window)
plot(bar_index, "input_bar_index", display=display.data_window)
plot(open, "input_open", display=display.data_window)
plot(high, "input_high", display=display.data_window)
plot(low, "input_low", display=display.data_window)
plot(close, "input_close", display=display.data_window)
plot(volume, "input_volume", display=display.data_window)
plot(factor, "input_factor", display=display.data_window)
plot(line, "dynamic_line", display=display.data_window)
plot(direction, "dynamic_direction", display=display.data_window)
${scenario.paired ? 'plot(fixedLine, "fixed2_line", display=display.data_window)\nplot(fixedDirection, "fixed2_direction", display=display.data_window)\n' : ''}`;
}

describe('native v6 Supertrend sampled factor', () => {
  it.each(scenarios)('matches the independently captured $title bands and direction', (scenario) => {
    const source = capturedSource(scenario);
    expect(createHash('sha256').update(source).digest('hex')).toBe(scenario.hash);
    const result = runCompatScript(source, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'input_factor').values).toEqual(
      bars.map((_, index) => (index % 2 === 0 ? scenario.first : scenario.second)),
    );
    expect(getPlot(result, 'dynamic_line').values).toEqual(scenario.first === 3 ? first3Line : first2Line);
    expect(getPlot(result, 'dynamic_direction').values).toEqual(
      scenario.first === 3 ? first3Direction : first2Direction,
    );
    if (scenario.paired) {
      expect(getPlot(result, 'fixed2_line').values).toEqual(first2Line);
      expect(getPlot(result, 'fixed2_direction').values).toEqual(first2Direction);
    }
  });

  it('restores sampled-factor initialization together with the captured band state', () => {
    const trend = new Supertrend(3);
    const empty = trend.save();
    trend.compute(bars[0].high, bars[0].low, bars[0].close, 2);
    trend.restore(empty);
    const values = bars.map((bar, index) => trend.compute(bar.high, bar.low, bar.close, index % 2 === 0 ? 3 : 2));
    expect(values.map(([line]) => (Number.isNaN(line) ? null : line))).toEqual(first3Line);
    expect(values.map(([, direction]) => direction)).toEqual(first3Direction);
  });
});
