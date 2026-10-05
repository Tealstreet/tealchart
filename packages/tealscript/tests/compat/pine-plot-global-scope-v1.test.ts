import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

function errors(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Visual rules")\n${body}`))
    .diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('Pine visual global plot scope', () => {
  // ledger row 1117; official manual visuals/plots: calls require global scope.
  // Local if, loop and UDF discriminate nesting rules from a single AST shape.
  for (const [kind, body] of [
    ['if', 'if close > open\n    plot(close)'],
    ['loop', 'for i = 0 to 1\n    plot(i)'],
    ['UDF', 'f() =>\n    plot(close)\nf()'],
  ] as const) {
    it(`refuses plot in local ${kind} scope [visual-output row 1117]`, () => {
      expect(errors(body)).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'scope-mismatch', message: expect.stringContaining('plot()') }),
      ]));
    });
  }

  it('accepts global plot with a conditional source [functions[1], visuals/plots]', () => {
    expect(errors('plot(close > open ? close : na)')).toEqual([]);
  });
});
