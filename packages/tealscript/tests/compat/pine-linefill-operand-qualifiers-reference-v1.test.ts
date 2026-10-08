import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_linefill.new';

function colorDeclaration(qualifier: string): string {
  if (qualifier === 'input') return 'operand = input.color(#123456)';
  return `${qualifier} color operand = ${qualifier === 'series' ? 'bar_index == 1 ? #ABCDEF : #123456' : '#123456'}`;
}

for (const operation of ['new', 'set_color'] as const) {
  for (const form of operation === 'new'
    ? ['positional', 'named']
    : ['positional', 'named', 'method-positional', 'method-named']) {
    describe(`linefill.${operation} ${form} color operand [${operation === 'new' ? 905 : 907}]`, () => {
      for (const qualifier of ['const', 'input', 'simple', 'series']) {
        it(`accepts and uses ${qualifier} color`, () => {
          const constructor =
            operation === 'new'
              ? form === 'named'
                ? 'linefill.new(color=operand, line2=b, line1=a)'
                : 'linefill.new(a, b, operand)'
              : 'linefill.new(a, b, #111111)';
          const setter =
            operation === 'new'
              ? ''
              : form === 'positional'
                ? 'linefill.set_color(id, operand)'
                : form === 'named'
                  ? 'linefill.set_color(color=operand, id=id)'
                  : form === 'method-positional'
                    ? 'id.set_color(operand)'
                    : 'id.set_color(color=operand)';
          const source = `//@version=6
indicator("Linefill color operands")
${colorDeclaration(qualifier)}
a = line.new(0, 12.25, 5, 14)
b = line.new(0, 34.75, 5, 36)
id = ${constructor}
${setter}`;
          const checked = checkProgram(parse(source));
          expect(checked.diagnostics, citation).toEqual([]);
          expect(checked.symbols.find((symbol) => symbol.name === 'operand')?.type, citation).toEqual({
            kind: 'color',
            qualifier,
          });
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
          expect(result.errors, citation).toEqual([]);
          expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
          const fills = result.drawings.filter((drawing) => drawing.type === 'linefill');
          expect(fills, citation).toHaveLength(3);
          expect(
            fills.map((fill) => fill.color),
            citation,
          ).toEqual(['#123456', qualifier === 'series' ? '#ABCDEF' : '#123456', '#123456']);
        });
      }
    });
  }
}

for (const parameter of ['line1', 'line2']) {
  for (const named of [false, true]) {
    it(`linefill.new ${parameter} ${named ? 'named' : 'positional'} accepts and uses the selected series line [905]`, () => {
      const line1 = parameter === 'line1' ? 'operand' : 'fixed';
      const line2 = parameter === 'line2' ? 'operand' : 'fixed';
      const call = named
        ? `linefill.new(color=#123456, line2=${line2}, line1=${line1})`
        : `linefill.new(${line1}, ${line2}, #123456)`;
      const source = `//@version=6
indicator("Linefill reference operands")
a = line.new(0, 12.25, 5, 14)
b = line.new(0, 34.75, 5, 36)
fixed = line.new(0, 77, 5, 78)
operand = bar_index == 1 ? b : a
id = ${call}
plot(line.get_y1(linefill.get_${parameter}(id)), "Selected")`;
      const checked = checkProgram(parse(source));
      expect(checked.diagnostics, citation).toEqual([]);
      expect(checked.symbols.find((symbol) => symbol.name === 'operand')?.type, citation).toEqual({
        kind: 'line',
        qualifier: 'series',
      });
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors, citation).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
      expect(getPlot(result, 'Selected').values, citation).toEqual([12.25, 34.75, 12.25]);
    });
  }
}
