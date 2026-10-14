import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

const closes = [23, 25, 29, 31, 37];
const bars = closes.map((close, index) => ({
  time: Date.UTC(2026, 9, 2) + index * 60000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 17,
}));

const bodies = {
  'chain-two': '    copied = xs\n    second = copied\n    score(second)',
  'chain-four': '    copied = xs\n    a = copied\n    b = a\n    c = b\n    score(c)',
  'other-parameter-chain': '    copied = xs\n    other = ys\n    second = other\n    score(second)',
  'var-chain': '    var copied = xs\n    second = copied\n    score(second)',
};

function values(source: string, count: number) {
  const ast = parse(source);
  expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars.slice(0, count), undefined, {
    runtime: { timeframe: { period: '1' } },
  });
  expect(result).toBeDefined();
  expect(result!.errors).toEqual([]);
  expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
  return result!.plots.map((plot) => plot.values);
}

describe('immutable local collection alias chains inherit the written call type', () => {
  for (const version of [5, 6])
    for (const collection of ['array', 'matrix', 'map']) {
      const type = (kind: string) => (collection === 'map' ? `map<string,${kind}>` : `${collection}<${kind}>`);
      const create = (kind: string, value = kind === 'float' ? '1.5' : '3') =>
        collection === 'map'
          ? `map.new<string,${kind}>()`
          : collection === 'matrix'
            ? `matrix.new<${kind}>(1,1,${value})`
            : `array.new<${kind}>(1,${value})`;

      for (const shape of ['chain-two', 'chain-four', 'other-parameter-chain', 'var-chain'] as const)
        for (const [first, second] of [
          ['int', 'float'],
          ['float', 'int'],
          ...(shape === 'other-parameter-chain' ? [['int', 'int']] : []),
        ])
          for (const order of shape === 'chain-four' ? ['int-first', 'float-first'] : ['int-first']) {
            it(`v${version} ${collection} ${shape} ${first}-${second} ${order}`, () => {
              const scores = [`score(${type('int')} xs) => 10`, `score(${type('float')} xs) => 20`];
              const source = (typed: boolean) => `//@version=${version}
indicator("G6 adversarial alias")
${(order === 'float-first' ? scores.toReversed() : scores).join('\n')}
relay(${typed ? `${type(first)} xs, ${type(second)} ys` : 'xs, ys'}) =>
${bodies[shape]}
plot(relay(${create(first)},${create(second)}))`;
              const selectedKind = shape === 'other-parameter-chain' ? second : first;
              const typed = values(source(true), 3);
              expect(typed).toEqual([Array(3).fill(selectedKind === 'int' ? 10 : 20)]);
              expect(values(source(false), 3)).toEqual(typed);
            });
          }

      for (const kind of ['int', 'float']) {
        it(`v${version} ${collection} var-alias-chain ${kind} retains its initial collection`, () => {
          const initial = kind === 'int' ? 'int(close)' : 'close+0.5';
          const read =
            collection === 'map'
              ? 'map.get(values,"v")'
              : `${collection}.get(values,${collection === 'matrix' ? '0,0' : '0'})`;
          const source = (typed: boolean) => `//@version=${version}
indicator("G6 persistent alias state")
score(${type('int')} values) => 100+${read}
score(${type('float')} values) => 200+${read}
relay(${typed ? `${type(kind)} xs,${type(kind)} ys` : 'xs,ys'}) =>
    var copied = xs
    forwarded = copied
    score(forwarded)
xs = ${create(kind, initial)}
${collection === 'map' ? `map.put(xs,"v",${initial})\n` : ''}ys = ${create(kind, `${initial}+70`)}
${collection === 'map' ? `map.put(ys,"v",${initial}+70)\n` : ''}plot(relay(xs,ys))
`;
          const typed = values(source(true), 5);
          expect(typed).toEqual([Array(5).fill(kind === 'int' ? 123 : 223.5)]);
          expect(values(source(false), 5)).toEqual(typed);
        });
      }

      for (const intermediate of ['copied', 'a', 'b', 'c']) {
        it(`v${version} ${collection} refuses a reassigned ${intermediate} in the chain`, () => {
          const source = (typed: boolean) => `//@version=${version}
indicator("Immutable alias provenance boundary")
score(${type('int')} xs) => 10
score(${type('float')} xs) => 20
relay(${typed ? `${type('int')} xs, ${type('bool')} ys` : 'xs, ys'}) =>
    copied = xs
${intermediate === 'copied' ? '    copied := ys\n' : ''}    a = copied
${intermediate === 'a' ? '    a := ys\n' : ''}    b = a
${intermediate === 'b' ? '    b := ys\n' : ''}    c = b
${intermediate === 'c' ? '    c := ys\n' : ''}    score(c)
plot(relay(${create('int')},${create('bool', 'false')}))`;
          expect(
            checkProgram(parse(source(true))).diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
          ).toBe(true);
          expect(
            checkProgram(parse(source(false))).diagnostics.some((diagnostic) => diagnostic.code === 'type-mismatch'),
          ).toBe(true);
          expect(tryCompile(parse(source(false))).success).toBe(false);
        });
      }
    }
});
