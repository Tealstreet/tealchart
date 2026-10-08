import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/matrices/#for-in
describe('UDT matrix iteration distinguishes row order', () => {
  for (const indexed of [false,true]) {
    it(`indexed=${indexed} visits distinct first then second row`, () => {
      const result = runCompatScript(`//@version=6
indicator("Distinct UDT matrix rows")
type Cell
    int value
first = Cell.new(1)
second = Cell.new(10)
m = matrix.new<Cell>(2,1,first)
m.set(1,0,second)
int order = 0
int positions = 0
for ${indexed ? '[index,row]' : 'row'} in m
    current = row.get(0)
    order := order * 100 + current.value
    ${indexed ? 'positions := positions * 10 + index + 1' : 'positions += 1'}
    current.value += 1
    row.set(0,Cell.new(99))
plot(order,"Order")
plot(positions,"Positions")
plot(first.value,"First")
plot(second.value,"Second")
plot(m.get(0,0).value,"MatrixFirst")
plot(m.get(1,0).value,"MatrixSecond")`, { bars: compatibilityBars.slice(0,1) });
      expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title,value] of Object.entries({Order:110,Positions:indexed ? 12 : 2,First:2,Second:11,MatrixFirst:2,MatrixSecond:11})) expect(getPlot(result,title).values,title).toEqual([value]);
    });
  }
});
