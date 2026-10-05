import { expect, it } from 'vitest';

import { parse } from '../../parser/parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';

it('v6 imported additive helper does not depend on unrelated main arithmetic', () => {
  const library = parse(`//@version=6
library("Arithmetic")
export grouped(series float source, series float other) =>
    source + (source - other)
`);
  const ast = parse(`//@version=6
indicator("import context")
import Test/Arithmetic/1 as lib
plot(lib.grouped(close, open))
`);
  const libraries = new Map([['Test/Arithmetic/1', library]]);
  expect(checkProgram(ast, { libraries }).diagnostics.filter((x) => x.severity === 'error')).toEqual([]);
  const bars = [7, 8, 6].map((close, i) => ({
    time: (i + 1) * 60000,
    open: close - 1,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1,
  }));
  const r = executeScript(ast, bars, undefined, { libraries });
  expect(r.profile.swallowedErrors ?? []).toEqual([]);
  expect(r.errors).toEqual([]);
  expect(r.plots[0].values).toEqual([8, 9, 7]);
});

for (const version of [5, 6]) {
  for (const mainAddition of [false, true]) {
    it(`v${version} imported series association has its own context, main arithmetic=${mainAddition}`, () => {
      const library = parse(`//@version=${version}
library("Arithmetic")
export grouped(series float source, series float other) =>
    source + (source - other)
`);
      const ast = parse(`//@version=${version}
indicator("imported series association")
import Test/Arithmetic/1 as lib
${mainAddition ? 'plot(close + (close - open))' : ''}
plot(lib.grouped(close, open))
`);
      const libraries = new Map([['Test/Arithmetic/1', library]]);
      expect(checkProgram(ast, { libraries }).diagnostics.filter((x) => x.severity === 'error')).toEqual([]);
      const bars = [{ time: 60000, open: 1e16, high: 1e16, low: 1, close: 1, volume: 1 }];
      const result = executeScript(ast, bars, undefined, { libraries });
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.plots.at(-1)?.values).toEqual([-9999999999999998]);
    });
  }
}

it('nested main UDF carries imported arithmetic context to its child call', () => {
  const library = parse(`//@version=6
library("Arithmetic")
export grouped(series float source, series float other) =>
    source + (source - other)
`);
  const ast = parse(`//@version=6
indicator("nested import context")
import Test/Arithmetic/1 as lib
wrapped(source, other) => lib.grouped(source, other)
plot(wrapped(close, open))
`);
  const libraries = new Map([['Test/Arithmetic/1', library]]);
  expect(checkProgram(ast, { libraries }).diagnostics.filter((x) => x.severity === 'error')).toEqual([]);
  const result = executeScript(ast, [{ time: 60000, open: 1e16, high: 1e16, low: 1, close: 1, volume: 1 }], undefined, {
    libraries,
  });
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  expect(result.errors).toEqual([]);
  expect(result.plots[0].values).toEqual([-9999999999999998]);
});
it('arithmetic-free imported helper keeps its original call parameter positions', () => {
  const library = parse(`//@version=6
library("Arithmetic")
export identity(series float source) => source
`);
  const ast = parse(`//@version=6
indicator("plain import context")
import Test/Arithmetic/1 as lib
plot(lib.identity(close))
`);
  const libraries = new Map([['Test/Arithmetic/1', library]]);
  expect(checkProgram(ast, { libraries }).diagnostics.filter((x) => x.severity === 'error')).toEqual([]);
  const result = executeScript(ast, [{ time: 60000, open: 6, high: 8, low: 6, close: 7, volume: 1 }], undefined, {
    libraries,
  });
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  expect(result.errors).toEqual([]);
  expect(result.plots[0].values).toEqual([7]);
});
