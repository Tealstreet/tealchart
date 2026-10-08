import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/user-defined-functions/
const bars = compatibilityBars.slice(0, 6);

for (const version of [5, 6]) {
  describe(`v${version} function body and written calls`, () => {
    it('row 202 infers distinct parameter and result types for each written call', () => {
      const source = `//@version=${version}
indicator("Written call inference")
add(left, right) => left + right
integer = add(2, 3)
fraction = add(1.25, 2.5)
joinedValue = add("Ax", "By")
changing = add(close, 0.25)
plot(integer * 100 + fraction * 4 + str.length(joinedValue), "Combined")
plot(joinedValue == "AxBy" ? 1 : 0, "Text")
plot(changing, "Changing")`;
      const semantics = checkProgram(parse(source));
      expect(semantics.diagnostics).toEqual([]);
      for (const [name, kind, qualifier] of [
        ['integer', 'int', 'const'],
        ['fraction', 'float', 'const'],
        ['joinedValue', 'string', 'const'],
        ['changing', 'float', 'series'],
      ]) {
        expect(semantics.symbols.find((symbol) => symbol.name === name)?.type, name).toMatchObject({ kind, qualifier });
      }
      const result = runCompatScript(source, { bars });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'Combined').values).toEqual([519, 519, 519, 519, 519, 519]);
      expect(getPlot(result, 'Text').values).toEqual([1, 1, 1, 1, 1, 1]);
      expect(getPlot(result, 'Changing').values).toEqual([102.25, 105.25, 107.25, 103.25, 99.25, 100.25]);
    });

    it('row 207 binds reordered named arguments by name while retaining positional controls', () => {
      const source = `//@version=${version}
indicator("Named function binding")
encode(left, right) => left * 10 - right
plot(encode(2, 7), "Positional")
plot(encode(right = 7, left = 2), "Reordered")
plot(encode(right = 2, left = 7), "Other")`;
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source, { bars });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'Positional').values).toEqual([13, 13, 13, 13, 13, 13]);
      expect(getPlot(result, 'Reordered').values).toEqual([13, 13, 13, 13, 13, 13]);
      expect(getPlot(result, 'Other').values).toEqual([68, 68, 68, 68, 68, 68]);
    });
  });
}
