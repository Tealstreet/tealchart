import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: Pine history missing-value rules and manual drawing point copies.
const run = (body: string, declaration = '') =>
  runCompatScript(`//@version=6\nindicator("Point lifecycle"${declaration})\n${body}`, {
    bars: compatibilityBars.slice(0, 3),
  });
describe('Documented drawing reference history', () => {
  for (const [family, call] of [
    ['line', 'line.new(bar_index,-7,bar_index+1,13)'],
    ['label', 'label.new(bar_index,-7)'],
    ['box', 'box.new(bar_index,13,bar_index+1,-7)'],
    ['table', 'table.new(position.top_left,1,1)'],
    [
      'polyline',
      'polyline.new(array.from(chart.point.from_index(bar_index,-7),chart.point.from_index(bar_index+1,13)))',
    ],
    [
      'linefill',
      'linefill.new(line.new(bar_index,-7,bar_index+1,13),line.new(bar_index,-23,bar_index+1,19),color.red)',
    ],
  ] as const) {
    it(`${family} unavailable history differs from previous and current handles`, () => {
      const result = run(
        `id=${call}\nvar ${family} first=id\nprevious=id[1]\nplot(na(previous)?1:0,title="missing")\nplot(array.indexof(array.from(first),previous)==0?1:0,title="first")\nplot(bar_index>0 and array.indexof(array.from(id),previous)<0?1:0,title="distinct")`,
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'missing').values).toEqual(family === 'table' ? [1, 1, 1] : [1, 0, 0]);
      expect(getPlot(result, 'first').values).toEqual([0, 1, 0]);
      expect(getPlot(result, 'distinct').values).toEqual([0, 1, 1]);
    });
  }
  it('chart.point history preserves the previous execution bar fields', () => {
    const result = run(
      'p=chart.point.now(-7+bar_index*20)\nold=p[1]\nplot(na(old)?1:0,title="missing")\nplot(old.index,title="index")\nplot(old.price,title="price")\nplot(old.time,title="time")',
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'missing').values).toEqual([1, 0, 0]);
    expect(getPlot(result, 'index').values).toEqual([null, 0, 1]);
    expect(getPlot(result, 'price').values).toEqual([null, -7, 13]);
    expect(getPlot(result, 'time').values).toEqual([null, 1700000000000, 1700000060000]);
  });
});
describe('Documented polyline point copies', () => {
  for (const xloc of ['bar_index', 'bar_time']) {
    it(`polyline.new copies coordinates independently of point and array mutation in ${xloc}`, () => {
      const result = run(
        `if bar_index==0\n    a=chart.point.new(1700000000000,4,13)\n    b=chart.point.new(1700000060000,1,-7)\n    points=array.from(a,b)\n    id=polyline.new(points,xloc=xloc.${xloc})\n    a.price:=99\n    a.index:=2\n    a.time:=1700000120000\n    b.price:=-23\n    b.index:=3\n    b.time:=1700000180000\n    array.clear(points)`,
      );
      expect(result.errors).toEqual([]);
      expect(result.drawings).toHaveLength(1);
      expect(result.drawings![0]).toMatchObject({
        type: 'polyline',
        xloc,
        points: [
          { time: 1700000000000, index: 4, price: 13 },
          { time: 1700000060000, index: 1, price: -7 },
        ],
      });
    });
  }
  it('polyline hard maximum keeps an oldest-first suffix without assuming an exact eviction trigger', () => {
    const result = run(
      'if bar_index==0\n    created=array.new<polyline>()\n    for i=0 to 129\n        id=polyline.new(array.from(chart.point.from_index(i,-7),chart.point.from_index(i+1,13)))\n        array.push(created,id)\n    count=array.size(polyline.all)\n    valid=count>0 and count<=100\n    for i=0 to count-1\n        valid:=valid and array.indexof(created,array.get(polyline.all,i))==130-count+i\n    plot(valid?1:0,title="valid")',
      ',max_polylines_count=100',
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'valid').values).toEqual([1]);
  });
});

describe('Drawing reference and point field qualified types', () => {
  for (const [family, create] of [
    ['line', 'line.new(4,13,1,-7)'],
    ['label', 'label.new(4,13)'],
    ['box', 'box.new(4,13,1,-7)'],
    ['table', 'table.new(position.top_left,1,1)'],
    ['linefill', 'linefill.new(line.new(4,13,1,-7),line.new(4,19,1,-23),color.red)'],
    ['chart.point', 'chart.point.new(1700000000000,4,13)'],
    ['polyline', 'polyline.new(array.from(chart.point.from_index(4,13),chart.point.from_index(1,-7)))'],
  ] as const) {
    it(`${family} constructor and typed declaration retain series references`, () => {
      const result = checkProgram(parse(`//@version=6\nindicator("Reference types")\na=${create}\n${family} typed=a`));
      expect(result.diagnostics).toEqual([]);
      for (const name of ['a', 'typed'])
        expect(result.symbols.find((s) => s.name === name)?.type).toMatchObject({ kind: family, qualifier: 'series' });
    });
  }
  for (const [field, kind] of [
    ['time', 'int'],
    ['price', 'float'],
  ] as const) {
    it(`chart.point.${field} has its documented series field type`, () => {
      const result = checkProgram(
        parse(`//@version=6\nindicator("Point fields")\np=chart.point.new(1700000000000,4,13)\nvalue=p.${field}`),
      );
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((s) => s.name === 'value')?.type).toMatchObject({ kind, qualifier: 'series' });
    });
  }
});
