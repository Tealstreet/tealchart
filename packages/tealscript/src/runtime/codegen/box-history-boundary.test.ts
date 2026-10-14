import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const bars = [0, 1].map((index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: 1,
  high: 2,
  low: 0,
  close: 1,
  volume: 1,
}));

function run(body: string) {
  return executeScript(parse(`//@version=6\nindicator("box history")\n${body}\nplot(7)`), bars);
}

describe('box creation historical coordinate boundary', () => {
  it.each([
    ['left', 'box.new(bar_index - 10001, high, bar_index, low)'],
    ['left', 'box.new(left=bar_index - 10001, top=high, right=bar_index, bottom=low)'],
  ])('rejects an unavailable %s coordinate before allocation', (argument, call) => {
    const result = run(call);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'RE10026',
        barIndex: 0,
        message: `Error on bar 0: Bar index value of the \`${argument}\` argument (-10001) in \`box.new()\` is too far from the current bar index. Try using \`time\` instead.`,
      }),
    ]);
    expect(result.drawings ?? []).toEqual([]);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
  });

  it('retains the executing source site when an identical constructor is skipped', () => {
    const result = run(`make() =>
    if bar_index < 0
        box.new(bar_index - 10001, high, bar_index, low)
    box.new(bar_index - 10001, high, bar_index, low)
make()`);
    expect(result.errors[0]).toMatchObject({
      line: 6,
      runtimeError: {
        stackTrace: [
          { n: 'make', p: 6 },
          { n: '#main', p: 7 },
        ],
      },
    });
  });

  it.each([
    'box.new(bar_index - 10000, high, bar_index, low)',
    'box.new(left=bar_index, top=high, right=bar_index - 10001, bottom=low)',
    'box.new(chart.point.from_index(bar_index - 10001, high), chart.point.from_index(bar_index, low))',
    'box.new(chart.point.from_index(bar_index, high), chart.point.from_index(bar_index - 10000, low))',
    'box.new(left=na, top=high, right=na, bottom=low)',
    'box.new(0, high, 1, low, xloc=xloc.bar_time)',
    'box.new(chart.point.from_time(0, high), chart.point.from_time(1, low), xloc=xloc.bar_time)',
    'if bar_index < 0\n    box.new(bar_index - 10001, high, bar_index, low)',
    'id = box.new(bar_index, high, bar_index, low)\nbox.set_left(id, bar_index - 10001)',
    'line.new(bar_index - 10001, high, bar_index, low)',
    'label.new(bar_index - 10001, high)',
  ])('preserves the non-target contract: %s', (body) => {
    const result = run(body);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([7, 7]);
  });
});
