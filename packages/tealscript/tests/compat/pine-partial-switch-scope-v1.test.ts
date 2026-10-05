import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Ledger rank1680: the manual prohibits these builtins in conditional blocks.
// https://www.tradingview.com/pine-script-docs/language/conditional-structures/
const calls = [
  ['barcolor', 'barcolor(color.red)'],
  ['bgcolor', 'bgcolor(color.red)'],
  ['plot', 'plot(close)'],
  ['plotshape', 'plotshape(true)'],
  ['plotchar', 'plotchar(true)'],
  ['plotarrow', 'plotarrow(close)'],
  ['plotcandle', 'plotcandle(open, high, low, close)'],
  ['plotbar', 'plotbar(open, high, low, close)'],
  ['hline', 'hline(1)'],
  ['fill', 'fill(first, second, color.red)'],
  ['alertcondition', 'alertcondition(true)'],
  ['indicator', 'indicator("Local")'],
  ['strategy', 'strategy("Local")'],
  ['library', 'library("Local")'],
] as const;

function errors(body: string) {
  return checkProgram(parse(`//@version=6\nfirst = plot(close)\nsecond = plot(open)\n${body}`))
    .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('manual global-only single-expression switch arms', () => {
  for (const [name, call] of calls.filter(([name]) => !['indicator', 'strategy', 'library'].includes(name))) {
    it(`refuses ${name} in an inline switch arm`, () => {
      expect(errors(`switch\n    true => ${call}`)).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'scope-mismatch', message: expect.stringContaining(`${name}()`) }),
      ]));
    });
  }
});
