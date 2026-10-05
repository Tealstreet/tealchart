import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import type { Bar } from '../context';

const bars: Bar[] = [7, 8, 6].map((close, index) => ({
  time: (index + 1) * 60_000, open: close, high: close + 1, low: close - 1, close, volume: 1,
}));

// Hand-written library/chart programs; expectations follow Pine method binding,
// not values captured from corpus scripts or from the engine.
const counterLibrary = parse(`//@version=6
library("Counters")
export type Counter
    int count = 0
export method update(Counter this, int amount=2) =>
    this.count += amount
    this.count
`);

function run(source: string) {
  const ast = parse(`//@version=6\nindicator("library dispatch")\nimport Test/Counters/1 as lib\n${source}`);
  const libraries = new Map([['Test/Counters/1', counterLibrary]]);
  expect(checkProgram(ast, { libraries }).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  const result = executeScript(ast, bars, undefined, { libraries });
  expect(result.errors).toEqual([]);
  expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
  return result.plots.map((plot) => plot.values);
}

describe('imported method dispatch with chart function name collisions', () => {
  it('resolves the receiver method inside a same-named chart wrapper', () => {
    expect(run(`update() =>
    var counter = lib.Counter.new()
    counter.update()
plot(update())`)).toEqual([[2, 4, 6]]);
  });

  it('keeps a chart function and receiver method separate with explicit arguments', () => {
    expect(run(`update(int value) => value + 100
var counter = lib.Counter.new()
plot(counter.update(amount=3))
plot(update(4))`)).toEqual([[3, 6, 9], [104, 104, 104]]);
  });

  it('preserves a local method overload while keeping ordinary functions separate', () => {
    expect(run(`type Local
    int count = 10
method update(Local this) => this.count + 1
update() => 50
var local = Local.new()
var counter = lib.Counter.new()
plot(local.update())
plot(update())`)).toEqual([[11, 11, 11], [50, 50, 50]]);
  });
});
