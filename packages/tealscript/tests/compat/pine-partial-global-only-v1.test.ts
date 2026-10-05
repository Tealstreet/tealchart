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

describe('manual global-only builtin list', () => {
  for (const [name, call] of calls) {
    for (const [kind, body] of [
      ['if', `if true\n    ${call}`],
      ['switch', `switch\n    true =>\n        ${call}`],
      ['once', `once\n    ${call}`],
    ]) {
      it(`refuses ${name} in ${kind}`, () => {
        expect(errors(body)).toEqual(expect.arrayContaining([
          expect.objectContaining({ code: 'scope-mismatch', message: expect.stringContaining(`${name}()`) }),
        ]));
      });
    }

    it(`allows global ${name}`, () => {
      expect(errors(name === 'library' ? `${call}\nexport value(float source) => source` : call)).toEqual([]);
    });
  }

  it('allows locally callable inputs, drawing setters and strategy orders', () => {
    expect(errors(`strategy("Orders")
if true
    selected = input.int(1)
    marker = label.new(bar_index, close)
    label.set_text(marker, "Selected")
    strategy.entry("Long", strategy.long)`)).toEqual([]);
  });

  it('allows same-name local user functions', () => {
    expect(errors(`bgcolor(int value) => value + 1
hline(int value) => value + 2
if true
    background = bgcolor(3)
    level = hline(4)`)).toEqual([]);
  });
});
