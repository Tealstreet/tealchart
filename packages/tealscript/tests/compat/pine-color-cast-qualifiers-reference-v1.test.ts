import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_color';

// Frozen v6 color296-299 preserves the argument qualifier and color identity.
// Named x and positional casts cover finite colors and typed missing colors.
// Finite channels are literal RGB oracles; no rendering or legacy constructor claim.
for (const missing of [false, true]) {
  for (const qualifier of ['const', 'input', 'simple', 'series'] as const) {
    for (const binding of ['positional', 'named'] as const) {
      describe(`color cast ${missing ? 'missing' : 'finite'} ${qualifier} ${binding} [functions:296-299]`, () => {
        let checked: ReturnType<typeof checkProgram>;
        let outputs: Array<Array<number | null>>;
        beforeAll(() => {
          const value = missing ? 'color(na)' : '#0A141E';
          const expression = qualifier === 'series' && !missing ? 'bar_index == 1 ? #28323C : #0A141E' : value;
          const declaration =
            qualifier === 'input'
              ? `sourceValue = input.color(${value})`
              : `${qualifier} color sourceValue = ${expression}`;
          const source = `//@version=6
indicator("Color cast qualifiers")
${declaration}
measured = color(${binding === 'named' ? 'x=' : ''}sourceValue)
alias = measured
plot(na(measured) ? 1 : 0, "missing")
plot(na(alias) ? 1 : 0, "alias_missing")
plot(color.r(measured), "red")
plot(color.g(measured), "green")
plot(color.b(measured), "blue")
plot(color.t(measured), "transparency")
plot(na(measured) ? na(alias) ? 1 : 0 : measured == alias ? 1 : 0, "alias_identity")`;
          checked = checkProgram(parse(source));
          expect(checked.diagnostics, citation).toEqual([]);
          expect(checked.symbols.find((symbol) => symbol.name === 'sourceValue')?.type, citation).toMatchObject({
            kind: 'color',
            qualifier,
          });
          const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
          expect(result.errors, citation).toEqual([]);
          expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
          outputs = ['missing', 'alias_missing', 'red', 'green', 'blue', 'transparency', 'alias_identity'].map(
            (name) => getPlot(result, name).values,
          );
          outputs.forEach((values) => expect(values, citation).toHaveLength(3));
        });
        it('preserves the color result qualifier, missing state and alias identity', () => {
          for (const name of ['measured', 'alias'])
            expect(checked.symbols.find((symbol) => symbol.name === name)?.type, citation).toMatchObject({
              kind: 'color',
              qualifier,
            });
          expect(outputs[0], citation).toEqual(Array(3).fill(missing ? 1 : 0));
          expect(outputs[1], citation).toEqual(outputs[0]);
          expect(outputs[6], citation).toEqual([1, 1, 1]);
          if (!missing) {
            for (const [index, channel] of [10, 20, 30].entries())
              expect(outputs[index + 2], citation).toEqual([
                channel,
                qualifier === 'series' ? channel + 30 : channel,
                channel,
              ]);
            expect(outputs[5], citation).toEqual([0, 0, 0]);
          }
        });
      });
    }
  }
}
