import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
const bars = [4, 6].map((close, i) => ({ time: i * 60000, open: close, high: close + 1, low: close - 1, close, volume: 1 }));
const run = (body: string) => executeScript(parse(`//@version=6\nindicator("future drawings", overlay=true)\n${body}`), bars);
const cases = [
  ['line.new first', '', 'line.new(bar_index + 501, close, bar_index, close)'],
  ['line.new second', '', 'line.new(bar_index, close, bar_index + 501, close)'],
  ['label.new', '', 'label.new(bar_index + 501, close)'],
  ['box.new left', '', 'box.new(bar_index + 501, high, bar_index, low)'],
  ['box.new right', '', 'box.new(bar_index, high, bar_index + 501, low)'],
  ['line.set_x1', 'id=line.new(bar_index,close,bar_index+1,close)', 'line.set_x1(id,bar_index+501)'],
  ['line.set_x2', 'id=line.new(bar_index,close,bar_index+1,close)', 'line.set_x2(id,bar_index+501)'],
  ['line.set_xy1', 'id=line.new(bar_index,close,bar_index+1,close)', 'line.set_xy1(id,bar_index+501,close)'],
  ['line.set_xy2', 'id=line.new(bar_index,close,bar_index+1,close)', 'line.set_xy2(id,bar_index+501,close)'],
  ['label.set_x', 'id=label.new(bar_index,close)', 'label.set_x(id,bar_index+501)'],
  ['label.set_xy', 'id=label.new(bar_index,close)', 'label.set_xy(id,bar_index+501,close)'],
  ['box.set_left', 'id=box.new(bar_index,high,bar_index+1,low)', 'box.set_left(id,bar_index+501)'],
  ['box.set_right', 'id=box.new(bar_index,high,bar_index+1,low)', 'box.set_right(id,bar_index+501)'],
  ['line.new point', '', 'line.new(chart.point.from_index(bar_index+501,close),chart.point.from_index(bar_index,close))'],
  ['label.new point', '', 'label.new(chart.point.from_index(bar_index+501,close))'],
  ['box.new point', '', 'box.new(chart.point.from_index(bar_index,high),chart.point.from_index(bar_index+501,low))'],
  ['line.set_first_point', 'id=line.new(bar_index,close,bar_index+1,close)', 'line.set_first_point(id,chart.point.from_index(bar_index+501,close))'],
  ['line.set_second_point', 'id=line.new(bar_index,close,bar_index+1,close)', 'line.set_second_point(id,chart.point.from_index(bar_index+501,close))'],
  ['label.set_point', 'id=label.new(bar_index,close)', 'label.set_point(id,chart.point.from_index(bar_index+501,close))'],
  ['box.set_top_left_point', 'id=box.new(bar_index,high,bar_index+1,low)', 'box.set_top_left_point(id,chart.point.from_index(bar_index+501,high))'],
  ['box.set_bottom_right_point', 'id=box.new(bar_index,high,bar_index+1,low)', 'box.set_bottom_right_point(id,chart.point.from_index(bar_index+501,low))'],
  ['line.set_xloc', 'id=line.new(time,close,time+60000,close,xloc=xloc.bar_time)', 'line.set_xloc(id,bar_index,bar_index+501,xloc.bar_index)'],
  ['label.set_xloc', 'id=label.new(time,close,xloc=xloc.bar_time)', 'label.set_xloc(id,bar_index+501,xloc.bar_index)'],
  ['box.set_xloc', 'id=box.new(time,high,time+60000,low,xloc=xloc.bar_time)', 'box.set_xloc(id,bar_index,bar_index+501,xloc.bar_index)'],
] as const;

describe('documented 500 future-bar drawing limit', () => {
  for (const [name, setup, call] of cases) {
    it(`${name} rejects 501 bars in the future`, () => {
      const result = run(`${setup}\n${call}\nplot(1)`);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('500');
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
    });
    it(`${name} allows exactly 500 future bars`, () => {
      const result = run(`${setup}\n${call.replaceAll('+501', '+500').replaceAll('+ 501', '+ 500')}\nplot(1)`);
      expect(result.errors).toEqual([]);
      expect(result.plots[0].values).toEqual([1, 1]);
    });
  }
  it('allows future timestamps for bar_time drawings', () => {
    const result = run('line.new(time,close,time+1000000000,close,xloc=xloc.bar_time)\nlabel.new(time+1000000000,close,xloc=xloc.bar_time)\nbox.new(time,high,time+1000000000,low,xloc=xloc.bar_time)\nplot(1)');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([1, 1]);
  });
  it('allows missing coordinates and skipped invalid drawing calls', () => {
    const result = run('line.new(na,close,bar_index,close)\nlabel.new(na,close)\nbox.new(na,high,bar_index,low)\nif bar_index < 0\n    line.new(bar_index+501,close,bar_index,close)\nplot(1)');
    expect(result.errors).toEqual([]);
  });
});
