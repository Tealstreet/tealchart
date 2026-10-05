import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';

const bars: Bar[] = Array.from({ length: 4 }, (_, i) => ({
  time: 1700000000000 + i * 60000,
  open: i + 1,
  high: i + 2,
  low: i,
  close: i + 1,
  volume: 1,
}));
const source = (body: string, version = 6) =>
  `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("Ledger13 contract")\n${body}`;
const check = (body: string, version = 6) => checkProgram(parse(source(body, version)));
const errors = (body: string, version = 6) => check(body, version).diagnostics.filter((d) => d.severity === 'error');
const run = (body: string, version = 6) => {
  expect(errors(body, version)).toEqual([]);
  const result = executeScript(parse(source(body, version)), bars, undefined, {
    runtime: { timeframe: { period: '2' } },
  });
  expect(result.errors).toEqual([]);
  return result;
};
describe('ledger13 existing documented contracts', () => {
  // Reference per exact slot/remark is retained in assigned-rows.json. These
  // controls assert documented behavior, not values captured from this engine.
  for (const [rank, kind, setup, values] of [
    [481, 'color', '', 'color.red, color.blue'],
    [483, 'enum', 'enum Choice\n    left\n    right\n', 'Choice.left, Choice.right'],
    [485, 'box', 'first = box.new(0, 1, 1, 0)\nsecond = box.new(0, 2, 1, 0)\n', 'first, second'],
    [
      487,
      'table',
      'first = table.new(position.top_right, 1, 1)\nsecond = table.new(position.top_left, 1, 1)\n',
      'first, second',
    ],
    [
      489,
      'linefill',
      'a = line.new(0, 1, 1, 1)\nb = line.new(0, 0, 1, 0)\nfirst = linefill.new(a, b, color.red)\nsecond = linefill.new(a, b, color.blue)\n',
      'first, second',
    ],
  ] as const)
    it(`rank${rank} array.from preserves ${kind} members in order`, () => {
      const body =
        setup +
        `values = array.from(${values})\nplot(array.size(values), "Size")\nplot(array.indexof(values, ${values.split(',')[0]}), "First")\nplot(array.indexof(values, ${values.split(',')[1]}), "Second")`;
      const checked = check(body);
      expect(checked.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const type = checked.symbols.find((s) => s.name === 'values')?.type;
      expect(type).toEqual(
        expect.objectContaining({
          kind: 'array',
          elementType: expect.objectContaining(kind == 'enum' ? { kind: 'udt', name: 'Choice' } : { kind }),
        }),
      );
      const result = run(body);
      expect(result.plots.map((p) => p.values)).toEqual([Array(4).fill(2), Array(4).fill(0), Array(4).fill(1)]);
    });
  for (const [qualifier, setup] of [
    ['const', 'const color tint = color.red'],
    ['input', 'tint = input.color(color.red)'],
    ['simple', 'simple color tint = color.red'],
    ['series', 'tint = bar_index % 2 == 0 ? color.red : color.green'],
  ])
    it(`rank481 admits ${qualifier} color arguments`, () => {
      const result = run(`${setup}\nvalues = array.from(tint, color.blue)\nplot(array.indexof(values, tint))`);
      expect(result.plots[0].values).toEqual([0, 0, 0, 0]);
    });
  it('rank483 admits series enum arguments and preserves membership order', () => {
    const result = run(
      'enum Choice\n    left\n    right\nchoice = bar_index % 2 == 0 ? Choice.left : Choice.right\nvalues = array.from(choice, Choice.left)\nplot(array.indexof(values, choice))',
    );
    expect(result.plots[0].values).toEqual([0, 0, 0, 0]);
  });
  for (const call of ['box(na)', 'box(x=na)'])
    it(`rank494 ${call} returns na without allocating a drawing`, () => {
      const result = run(`value = ${call}\nplot(na(value) ? 1 : 0)`);
      expect(result.plots[0].values).toEqual(Array(4).fill(1));
      expect(result.drawings).toEqual([]);
    });
  for (const call of ['box(na)', 'box(x=na)'])
    it(`rank495 ${call} returns series box`, () => {
      expect(check(`value = ${call}`).symbols.find((s) => s.name === 'value')?.type).toEqual({
        kind: 'box',
        qualifier: 'series',
      });
    });
  it('rank497 admits declared maximum500 boxes and retains the declaration metadata', () => {
    const ast = parse('//@version=6\nindicator("Box maximum", max_boxes_count=500)\nbox.new(0, 1, 1, 0)');
    expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.declaration?.drawingLimits.box).toBe(500);
    expect(result.drawings).toHaveLength(4);
    // This is a declaration/availability witness. Published counts are approximate;
    // exact max+1 eviction remains TRACE-REQUIRED rather than assumed here.
  });
  it('rank497 collects oldest boxes without pinning the approximate retention count', () => {
    const ast = parse(
      '//@version=6\nindicator("Box collection order", max_boxes_count=1)\nfor i = 0 to 599\n    box.new(bar_index, bar_index * 600 + i, bar_index + 1, 0)',
    );
    expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.drawings.length).toBeGreaterThan(0);
    expect(result.drawings.length).toBeLessThanOrEqual(500);
    // The documented oldest-first relation determines the retained suffix,
    // independent of the approximate declared count or first eviction tick.
    const count = result.drawings.length;
    expect(result.drawings.map((d) => (d.type === 'box' ? d.top : null))).toEqual(
      Array.from({ length: count }, (_, i) => 2400 - count + i),
    );
  });
  it('rank496 typed box variable has series qualifier', () => {
    expect(check('box value = na').symbols.find((s) => s.name === 'value')?.type).toEqual({
      kind: 'box',
      qualifier: 'series',
    });
  });
  it('ranks518–519 box delete method is idempotent and affects the receiver only', () => {
    const result = run(
      'a = box.new(0, 1, 1, 0)\nb = box.new(0, 2, 1, 0)\na.delete()\na.delete()\nplot(array.size(box.all))',
    );
    expect(result.plots[0].values).toEqual([1, 2, 3, 4]);
    expect(result.drawings).toHaveLength(4);
    expect(result.drawings.every((d) => d.type === 'box' && d.top === 2)).toBe(true);
  });
  it('rank515 array.new_int uses index0 as its first element', () => {
    const result = run(
      'values = array.new_int(2, 9)\narray.set(values, 0, 7)\nplot(array.get(values, 0))\nplot(array.get(values, 1))',
    );
    expect(result.plots.map((p) => p.values)).toEqual([Array(4).fill(7), Array(4).fill(9)]);
  });
  it('rank493 preserves v4 stdev and v5 namespace rename', () => {
    expect(run('plot(stdev(close, 2))', 4).plots[0].values).toEqual([null, 0.5, 0.5, 0.5]);
    expect(run('plot(ta.stdev(close, 2))', 5).plots[0].values).toEqual([null, 0.5, 0.5, 0.5]);
    expect(errors('plot(stdev(close, 2))', 5)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'version-mismatch' })]),
    );
  });
  for (const [name, body] of [
    ['omitted', 'value = timeframe.in_seconds()'],
    ['const', 'value = timeframe.in_seconds("2")'],
    ['input', 'tf = input.timeframe("2")\nvalue = timeframe.in_seconds(tf)'],
    ['simple named', 'simple string tf = "2"\nvalue = timeframe.in_seconds(timeframe=tf)'],
  ] as const)
    it(`rank520 timeframe.in_seconds accepts ${name} and returns simple int`, () => {
      expect(check(body).symbols.find((s) => s.name === 'value')?.type).toEqual({ kind: 'int', qualifier: 'simple' });
      expect(run(body + '\nplot(value)').plots[0].values).toEqual(Array(4).fill(120));
    });
  it('rank520 keeps the neighboring documented series-string overload accepted', () => {
    const result = run('tf = bar_index % 2 == 0 ? "1" : "2"\nplot(timeframe.in_seconds(tf))');
    expect(result.plots[0].values).toEqual([60, 120, 60, 120]);
    // Its separate return-qualifier root521–522 belongs to ledger14.
  });
  for (const slot of ['title', 'tooltip', 'inline', 'group'])
    it(`input.timeframe ${slot} rank498–501 refuses input metadata and accepts const`, () => {
      expect(errors(`value = input.timeframe("2", ${slot}="Metadata")`)).toEqual([]);
      expect(errors(`metadata = input.string("Metadata")\nvalue = input.timeframe("2", ${slot}=metadata)`)).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'qualifier-mismatch' })]),
      );
    });
  it('rank502 input.timeframe confirm has const ceiling', () => {
    expect(errors('value = input.timeframe("2", confirm=true)')).toEqual([]);
    expect(errors('flag = input.bool(true)\nvalue = input.timeframe("2", confirm=flag)')).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'qualifier-mismatch' })]),
    );
  });
  it('rank503 input.timeframe active permits input bool and refuses series bool', () => {
    expect(errors('flag = input.bool(true)\nvalue = input.timeframe("2", active=flag)')).toEqual([]);
    expect(errors('value = input.timeframe("2", active=bar_index > 0)')).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'qualifier-mismatch' })]),
    );
  });
});
