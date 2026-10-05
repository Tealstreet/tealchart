import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const diagnostics = (body: string) =>
  checkProgram(
    parse(`//@version=6
indicator("Input options")
${body}
plot(close)`),
  ).diagnostics;

describe('input review const options tuples', () => {
  for (const [kind, initial, values] of [
    ['int', '3', ['bar_index', 'input.int(3)', 'syminfo.minmove']],
    ['float', '3.0', ['close', 'input.float(3)', 'syminfo.mintick']],
    ['string', '"A"', ['str.tostring(close)', 'input.string("A")', 'syminfo.ticker']],
  ] as const) {
    it.each(values)(`${kind} rejects nonconst tuple member %s`, (value) => {
      for (const args of [`${initial}, options=[${initial}, value]`, `${initial}, "Options", [${initial}, value]`]) {
        expect(
          diagnostics(`value=${value}
v=input.${kind}(${args})`),
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('options') }),
          ]),
        );
      }
    });
    it(`${kind} accepts a tuple containing const variable members`, () => {
      expect(
        diagnostics(`const ${kind} value=${initial}
v=input.${kind}(${initial}, options=[${initial}, value])`),
      ).toEqual([]);
    });
  }
});

describe('input review runtime arrays and enum options', () => {
  it.each([
    ['int', '3', 'array.from(3,4)'],
    ['float', '3.0', 'array.from(3.0,4.0)'],
    ['string', '"A"', 'array.from("A","B")'],
  ])('%s rejects a runtime array as const tuple options', (kind, initial, options) => {
    expect(
      diagnostics(`choices=${options}
v=input.${kind}(${initial},options=choices)`),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('options') }),
      ]),
    );
  });
  it('enum rejects an input-qualified tuple member', () => {
    expect(
      diagnostics(`enum Choice
    first
    second
supplied=input.enum(Choice.second)
v=input.enum(Choice.first,options=[Choice.first,supplied])`),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('options') }),
      ]),
    );
  });
  it('enum accepts literal const members', () => {
    expect(
      diagnostics(`enum Choice
    first
    second
v=input.enum(Choice.first,options=[Choice.first,Choice.second])`),
    ).toEqual([]);
  });
});
