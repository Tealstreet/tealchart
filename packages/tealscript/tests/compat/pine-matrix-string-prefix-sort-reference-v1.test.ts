import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/matrices/#sorting
describe('matrix string sorting compares beyond equal leading characters', () => {
  for (const receiver of [false, true]) for (const descending of [false, true]) {
    it(`${receiver ? 'receiver' : 'namespace'} ${descending ? 'descending' : 'ascending'}`, () => {
      const order = descending ? 'order.descending' : 'order.ascending';
      const call = receiver ? `m.sort(1, ${order})` : `matrix.sort(m, 1, ${order})`;
      const expected = descending ? ['Az', 'Am', 'Aa'] : ['Aa', 'Am', 'Az'];
      const companions = descending ? ['second', 'third', 'first'] : ['first', 'third', 'second'];
      const result = runCompatScript(`//@version=6
indicator("String prefix order")
m = matrix.new<string>(3, 2)
m.set(0, 0, "first")
m.set(0, 1, "Aa")
m.set(1, 0, "second")
m.set(1, 1, "Az")
m.set(2, 0, "third")
m.set(2, 1, "Am")
${call}
${expected.map((value, row) => `plot(m.get(${row}, 1) == "${value}" ? 1 : 0, "Key${row}")`).join('\n')}
${companions.map((value, row) => `plot(m.get(${row}, 0) == "${value}" ? 1 : 0, "Row${row}")`).join('\n')}`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      for (const title of ['Key0', 'Key1', 'Key2', 'Row0', 'Row1', 'Row2']) {
        expect(getPlot(result, title).values, title).toEqual([1]);
      }
    });
  }
});

it('matrix sorting distinguishes length ordering and shorter proper prefixes', () => {
  const result = runCompatScript(`//@version=6
indicator("Length and prefix discriminator")
m = matrix.new<string>(3, 2)
m.set(0, 0, "first")
m.set(0, 1, "B")
m.set(1, 0, "second")
m.set(1, 1, "Az")
m.set(2, 0, "third")
m.set(2, 1, "A")
matrix.sort(m, 1, order.ascending)
plot(m.get(0, 1) == "A" ? 1 : 0, "Key0")
plot(m.get(1, 1) == "Az" ? 1 : 0, "Key1")
plot(m.get(2, 1) == "B" ? 1 : 0, "Key2")
plot(m.get(0, 0) == "third" ? 1 : 0, "Row0")
plot(m.get(1, 0) == "second" ? 1 : 0, "Row1")
plot(m.get(2, 0) == "first" ? 1 : 0, "Row2")`, { bars: compatibilityBars.slice(0, 1) });
  expect(result.errors).toEqual([]);
  for (const title of ['Key0', 'Key1', 'Key2', 'Row0', 'Row1', 'Row2']) {
    expect(getPlot(result, title).values, title).toEqual([1]);
  }
});
