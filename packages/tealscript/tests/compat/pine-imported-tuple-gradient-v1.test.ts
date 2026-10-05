import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const library = `//@version=5
library("Channel")
export channel(series bool flip, series float hi, series float lo) =>
    var float upper = na
    var float lower = na
    bool fresh = false
    if flip
        upper := hi
        lower := lo
        fresh := true
    [upper, lower, fresh]
export direct(series bool flip, series float hi, series float lo) =>
    [hi, lo, flip]
export literal() =>
    [1.0, false]
export pair(float value, float spare) =>
    float ignored = spare
    [value, value]
`;

function check(body: string, librarySource = library) {
  return checkProgram(
    parse(`//@version=5
indicator("Imported tuple gradient")
import test/Channel/1 as channel
${body}`),
    { libraries: new Map([['test/Channel/1', parse(librarySource)]]) },
  );
}

function errors(result: ReturnType<typeof check>) {
  return result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

const plots = `a = plot(close)
b = plot(open)
`;

describe('imported function tuple members and gradient fill', () => {
  // Libraries can return tuples; fill's gradient overload takes numeric bounds
  // followed by colors. Corpus v56:1301 combines both documented contracts.
  for (const name of ['channel', 'direct']) {
    it(`admits conditional gradient colors from the imported ${name} tuple`, () => {
      const result = check(`[top, bottom, fresh] = channel.${name}(close > open, high, low)
float mid = math.avg(top, bottom)
${plots}fill(a, b, top, mid, not fresh ? color.green : na, not fresh ? color.red : na)`);
      expect(errors(result)).toEqual([]);
      expect(
        result.symbols
          .filter((symbol) => ['top', 'bottom', 'fresh'].includes(symbol.name))
          .map((symbol) => symbol.type?.kind),
      ).toEqual(['float', 'float', 'bool']);
    });
  }

  it('binds named parameters independently of source order and shares the series qualifier', () => {
    const result = check('[top, bottom, fresh] = channel.direct(lo=low, flip=close > open, hi=high)');
    expect(errors(result)).toEqual([]);
    expect(
      result.symbols.filter((symbol) => ['top', 'bottom', 'fresh'].includes(symbol.name)).map((symbol) => symbol.type),
    ).toEqual([
      { kind: 'float', qualifier: 'series' },
      { kind: 'float', qualifier: 'series' },
      { kind: 'bool', qualifier: 'series' },
    ]);
  });

  it('retains the minimum simple qualifier on imported literal tuple members', () => {
    const result = check('[number, flag] = channel.literal()');
    expect(errors(result)).toEqual([]);
    expect(
      result.symbols.filter((symbol) => ['number', 'flag'].includes(symbol.name)).map((symbol) => symbol.type),
    ).toEqual([
      { kind: 'float', qualifier: 'simple' },
      { kind: 'bool', qualifier: 'simple' },
    ]);
  });

  it('infers the first named argument qualifier without treating it as a method receiver', () => {
    const result = check('[left, right] = channel.pair(spare=1.0, value=close)');
    expect(errors(result)).toEqual([]);
    expect(
      result.symbols.filter((symbol) => ['left', 'right'].includes(symbol.name)).map((symbol) => symbol.type),
    ).toEqual([
      { kind: 'float', qualifier: 'series' },
      { kind: 'float', qualifier: 'series' },
    ]);
  });

  it('refuses a known boolean gradient bound returned by an imported tuple', () => {
    const result = check(`[top, bottom, fresh] = channel.direct(close > open, high, low)
${plots}fill(a, b, top_value=fresh, bottom_value=bottom, top_color=color.green, bottom_color=color.red)`);
    expect(errors(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('top_value') }),
      ]),
    );
  });

  it('retains the real flat-fill string title contract', () => {
    expect(errors(check(`${plots}fill(a, b, color.green, 1.0)`))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('title') }),
      ]),
    );
  });

  it('retains the tuple arity contract for imported calls', () => {
    expect(errors(check('[top, bottom] = channel.direct(close > open, high, low)'))).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'tuple-shape-mismatch' })]),
    );
  });
});
