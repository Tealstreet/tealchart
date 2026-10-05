import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import type { Program } from '../../parser/ast';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import type { Bar } from '../context';

const bars: Bar[] = [7, 8, 6].map((close, index) => ({
  time: (index + 1) * 60_000, open: close, high: close + 1, low: close - 1, close, volume: 1,
}));

function run(source: string, libraries?: Map<string, Program>) {
  const ast = parse(`//@version=6\nindicator("library defaults")\n${source}`);
  expect(checkProgram(ast, { libraries }).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  const result = executeScript(ast, bars, undefined, { libraries });
  expect(result.errors).toEqual([]);
  expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
  return result;
}

// Hand-written UDT values prove definition-scope resolution independently of
// any public script. ZigZag cases assert construction/execution only.
describe('imported function default argument scope', () => {
  const library = parse(`//@version=6
library("Defaults")
export type Settings
    int value = 7
export read(Settings settings=Settings.new()) => settings.value
`);
  const libraries = new Map([['Test/Defaults/1', library]]);

  it('resolves omitted UDT constructor defaults inside the library', () => {
    expect(run(`import Test/Defaults/1 as lib
plot(lib.read())`, libraries).plots[0].values).toEqual([7, 7, 7]);
  });

  it('does not bind a library default to a same-named chart type', () => {
    expect(run(`import Test/Defaults/1 as lib
type Settings
    int value = 91
plot(lib.read())`, libraries).plots[0].values).toEqual([7, 7, 7]);
  });

  it('keeps explicit caller arguments in the caller scope', () => {
    expect(run(`import Test/Defaults/1 as lib
settings = lib.Settings.new(9)
plot(lib.read(settings))`, libraries).plots[0].values).toEqual([9, 9, 9]);
  });

  it.each([7, 8, 9])('constructs the default official ZigZag v%s instance', (version) => {
    const result = run(`import TradingView/ZigZag/${version} as zz
var zigzag = zz.newInstance()
plot(zigzag.update() ? 1 : 0)`);
    expect(result.plots[0].values).toHaveLength(bars.length);
    expect(result.plots[0].values.every((value) => value === 0 || value === 1)).toBe(true);
  });
});
