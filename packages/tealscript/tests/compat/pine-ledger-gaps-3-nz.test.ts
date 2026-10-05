import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

describe('ledger gaps 119–120: nz simple numeric overloads', () => {
  for (const [rank, kind, value, replacement] of [
    [119, 'int', '-7', '9'],
    [120, 'float', '-7.25', '9.5'],
  ] as const) {
    it(`rank ${rank}: preserves ${kind} values, replaces na and returns at least simple ${kind}`, () => {
      const source = `//@version=6
indicator("Numeric nz")
const ${kind} absent = na
const ${kind} present = ${value}
userValue = input.${kind}(${replacement})
simple ${kind} fixedValue = ${replacement}
defined = nz(present, fixedValue)
zero = nz(${kind}(0), fixedValue)
defaulted = nz(absent)
explicit = nz(replacement = fixedValue, source = absent)
fromConst = nz(present)
fromInput = nz(userValue)
fromSeries = nz(${kind}(close))
plot(defined, "defined")
plot(zero, "zero")
plot(defaulted, "defaulted")
plot(explicit, "explicit")
`;
      const checked = checkProgram(parse(source));
      expect(checked.diagnostics).toEqual([]);
      const types = new Map(checked.symbols.map((symbol) => [symbol.name, symbol.type]));
      for (const name of ['defined', 'zero', 'defaulted', 'explicit', 'fromConst', 'fromInput']) {
        expect(types.get(name)).toEqual({ kind, qualifier: 'simple' });
      }
      expect(types.get('fromSeries')).toEqual({ kind, qualifier: 'series' });
      const result = runCompatScript(source);
      expect(result.errors).toEqual([]);
      for (const [title, expected] of [
        ['defined', Number(value)],
        ['zero', 0],
        ['defaulted', 0],
        ['explicit', Number(replacement)],
      ] as const) {
        expect(getPlot(result, title).values).toEqual(Array(12).fill(expected));
      }
    });
  }

  it('applies the same documented simple floor to color and v5 bool overloads', () => {
    const checked = checkProgram(
      parse(`//@version=5
indicator("Other nz types")
const color tint = #123456
colorInput = input.color(#123456)
simpleColor = nz(tint)
inputColor = nz(colorInput, tint)
seriesColor = nz(close > open ? tint : color.blue)
simpleBool = nz(true)
inputBool = nz(input.bool(false), true)
seriesBool = nz(close > open, false)
plot(seriesBool ? 1 : 0, color=seriesColor)
`),
    );
    expect(checked.diagnostics).toEqual([]);
    const types = new Map(checked.symbols.map((symbol) => [symbol.name, symbol.type]));
    for (const name of ['simpleColor', 'inputColor'])
      expect(types.get(name)).toEqual({ kind: 'color', qualifier: 'simple' });
    for (const name of ['simpleBool', 'inputBool'])
      expect(types.get(name)).toEqual({ kind: 'bool', qualifier: 'simple' });
    expect(types.get('seriesColor')).toEqual({ kind: 'color', qualifier: 'series' });
    expect(types.get('seriesBool')).toEqual({ kind: 'bool', qualifier: 'series' });
  });
});
