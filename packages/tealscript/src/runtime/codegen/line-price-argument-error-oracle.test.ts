import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const bars = [4, 6].map((close, i) => ({ time: i * 60000, open: close, high: close + 1, low: close - 1, close, volume: 1 }));
const run = (body: string) => executeScript(parse(`//@version=6\nindicator("line price errors", overlay=true)\n${body}`), bars);

describe('documented line.get_price coordinate error', () => {
  it.each([
    'line.new(time, 2, time + 60000, 4, xloc=xloc.bar_time)',
    'line.new(chart.point.from_time(time, 2), chart.point.from_time(time + 60000, 4), xloc=xloc.bar_time)',
  ])('rejects price lookup on %s', constructor => {
    const result = run(`id = ${constructor}\nplot(line.get_price(id, bar_index))`);
    expect(result.errors).toHaveLength(1);
    // Native scalar-06 error wording is captured in
    // oracle-probes/v3/captures/v3/evidence/scalar-06-line-get-price-time-xloc-attempt1-error.txt.
    expect(result.errors[0]).toMatchObject({
      code: 'runtime.error',
      message: "Error on bar 0: 'line.get_price' must be used with lines created using 'xloc=xloc.bar_index'.",
    });
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
  });

  it('checks the current xloc after line.set_xloc', () => {
    const result = run('id = line.new(0, 2, 1, 4)\nline.set_xloc(id, time, time + 60000, xloc.bar_time)\nplot(line.get_price(id, 0))');
    expect(result.errors).toHaveLength(1);
  });

  it('keeps bar-index interpolation and a missing line result executable', () => {
    const result = run('id = line.new(0, 2, 1, 4)\nplot(line.get_price(id, 2))\nline missing = na\nplot(line.get_price(missing, 0))');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([6, 6]);
    expect(result.plots[1].values).toEqual([null, null]);
  });

  it('rejects only on an executed price lookup', () => {
    const result = run('id = line.new(time, 2, time + 60000, 4, xloc=xloc.bar_time)\nif bar_index == 1\n    line.get_price(id, 0)\nplot(1)');
    expect(result.errors).toHaveLength(1);
    expect(result.plots[0].values[0]).toBe(1);
    const skipped = run('id = line.new(time, 2, time + 60000, 4, xloc=xloc.bar_time)\nif bar_index < 0\n    line.get_price(id, 0)\nplot(1)');
    expect(skipped.errors).toEqual([]);
  });
});
