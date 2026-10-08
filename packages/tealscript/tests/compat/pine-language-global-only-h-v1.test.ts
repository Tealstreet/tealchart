import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

const ordinaryCalls = [
  ['barcolor', 'barcolor(color.red)'],
  ['bgcolor', 'bgcolor(color.red)'],
  ['plot', 'plot(close)'],
  ['plotshape', 'plotshape(true)'],
  ['plotchar', 'plotchar(true)'],
  ['plotarrow', 'plotarrow(close)'],
  ['plotcandle', 'plotcandle(open, high, low, close)'],
  ['plotbar', 'plotbar(open, high, low, close)'],
  ['hline', 'hline(2)'],
  ['fill', 'fill(upperPlot, lowerPlot, color.red)'],
  ['alertcondition', 'alertcondition(true, "Event", "Text")'],
] as const;
const declarations = [
  ['indicator', 'indicator("Declaration")'],
  ['strategy', 'strategy("Declaration")'],
  ['library', 'library("Declaration")'],
] as const;

function errors(version: number, body: string) {
  return checkProgram(parse(`//@version=${version}\n${body}`)).diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
}

const setup = 'indicator("Scope")\nupperPlot = plot(1)\nlowerPlot = plot(2)';

// Language row 171; conditional-structures manual lists these 14 global-only calls.
// https://www.tradingview.com/pine-script-docs/language/conditional-structures/
describe.each([5, 6])('Pine v%i global-only conditional calls', (version) => {
  for (const [name, call] of [...ordinaryCalls, ...declarations]) {
    const prefix = declarations.some(([declaration]) => declaration === name) ? '' : `${setup}\n`;
    it(`refuses local ${name} with the scope diagnostic`, () => {
      expect(errors(version, `${prefix}if true\n    ${call}`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'scope-mismatch', message: expect.stringContaining(`${name}()`) }),
        ]),
      );
    });

    it(`admits global ${name}`, () => {
      const suffix = name === 'library' ? '\nexport identity(float value) => value' : '';
      expect(errors(version, `${prefix}${call}${suffix}`)).toEqual([]);
    });
  }

  it('admits a local typed input call', () => {
    expect(errors(version, 'indicator("Input")\nif true\n    value = input.int(3)')).toEqual([]);
  });

  it('keeps an array fill method eligible inside a UDF', () => {
    expect(
      errors(
        version,
        `indicator("Method")
values = array.new_int(2, 0)
modify() =>
    array.copy(values).fill(3)
modify()`,
      ),
    ).toEqual([]);
  });
});
