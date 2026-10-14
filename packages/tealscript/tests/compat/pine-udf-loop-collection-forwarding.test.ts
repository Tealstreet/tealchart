import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const closes = [23, 25, 29, 31, 37];
const bars = closes.map((close, index) => ({
  time: Date.UTC(2026, 9, 2) + index * 60_000, open: close, high: close + 1,
  low: close - 1, close, volume: 17,
}));

const collections = [
  { name: 'array', type: (kind: string) => `array<${kind}>`, read: 'array.get(values,0)',
    create: (kind: string, value: string) => `array.new<${kind}>(1,${value})` },
  { name: 'matrix', type: (kind: string) => `matrix<${kind}>`, read: 'matrix.get(values,0,0)',
    create: (kind: string, value: string) => `matrix.new<${kind}>(1,1,${value})` },
  { name: 'map', type: (kind: string) => `map<string,${kind}>`, read: 'map.get(values,"v")',
    create: (kind: string) => `map.new<string,${kind}>()` },
];

function run(source: string) {
  const ast = parse(source);
  expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars, undefined, { runtime: { timeframe: { period: '1' } } });
  expect(result).toBeDefined();
  expect(result?.errors).toEqual([]);
  expect(result?.profile.compiledBarErrors?.firstMessage).toBeUndefined();
  return result?.plots.map((plot) => plot.values);
}

describe('selected collection overloads through nonterminal UDF loops', () => {
  for (const version of [5, 6]) {
    for (const collection of collections) {
      for (const kind of ['int', 'float']) {
        const value = kind === 'int' ? 'int(close)' : 'close+0.5';
        const expected = closes.map((close) => close + (kind === 'int' ? 100 : 200.5));
        for (const typed of [false, true]) {
          it(`v${version} ${collection.name}<${kind}> ${typed ? 'typed control' : 'untyped forwarding'}`, () => {
            const param = typed ? collection.type(kind) + ' ' : '';
            const source = `//@version=${version}
indicator("collection loop forwarding")
score(${collection.type('int')} values) => 100+${collection.read}
score(${collection.type('float')} values) => 200+${collection.read}
relay(${param}xs,${param}ys) =>
    a = xs
    score(a)
outer(${param}xs,${param}ys) =>
    saved = close*0
    for i = 0 to 1
        saved := relay(xs,ys)
    saved
xs = ${collection.create(kind, value)}
ys = ${collection.create(kind, value + '+70')}
${collection.name === 'map' ? `map.put(xs,"v",${value})\nmap.put(ys,"v",${value}+70)\n` : ''}plot(outer(xs,ys))`;
            expect(run(source)).toEqual([expected]);
          });
        }
      }
    }
  }

  it('keeps separate int and float selections for two callers of the same loop UDF', () => {
    expect(run(`//@version=6
indicator("separate loop call contexts")
score(array<float> values) => 200+array.get(values,0)
score(array<int> values) => 100+array.get(values,0)
relay(xs) =>
    a = xs
    score(a)
outer(xs) =>
    saved = close*0
    for i = 0 to 1
        saved := relay(xs)
    saved
plot(outer(array.new<int>(1,int(close))))
plot(outer(array.new<float>(1,close)))`)).toEqual([
      closes.map((close) => close + 100), closes.map((close) => close + 200),
    ]);
  });

  it('carries selected calls through while and conditional bodies', () => {
    expect(run(`//@version=6
indicator("while forwarding")
score(array<int> values) => 100+array.get(values,0)
score(array<float> values) => 200+array.get(values,0)
relay(xs) =>
    a = xs
    score(a)
outer(xs) =>
    saved = close*0
    i = 0
    while i < 2
        if i == 1
            saved := relay(xs)
        i += 1
    saved
plot(outer(array.new<int>(1,int(close))))`)).toEqual([closes.map((close) => close + 100)]);
  });
});
