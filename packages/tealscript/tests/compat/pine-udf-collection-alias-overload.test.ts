import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

type Collection = 'array' | 'matrix' | 'map';

const bars = [23, 25, 29].map((close, index) => ({
  time: Date.UTC(2026, 9, 2) + index * 60000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 17,
}));

function collectionType(collection: Collection, kind: string): string {
  return collection === 'map' ? `map<string,${kind}>` : `${collection}<${kind}>`;
}

function createCollection(collection: Collection, kind: string): string {
  const value = kind === 'bool' ? 'false' : '0';
  return collection === 'map'
    ? `map.new<string,${kind}>()`
    : collection === 'matrix'
      ? `matrix.new<${kind}>(1,1,${value})`
      : `array.new<${kind}>(1,${value})`;
}

function expectRefusal(source: string, code?: string): void {
  const ast = parse(source);
  const errors = checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  expect(errors.length).toBeGreaterThan(0);
  if (code) expect(errors.some((diagnostic) => diagnostic.code === code)).toBe(true);
  expect(tryCompile(ast).success).toBe(false);
}

describe('local collection aliases inherit regular UDF overload types per written call', () => {
  for (const version of [5, 6])
    for (const context of ['direct', 'security'])
      for (const collection of ['array', 'matrix', 'map'] as const)
        for (const order of ['int-first', 'float-first'])
          for (const mode of ['untyped', 'typed']) {
            it(`v${version} ${context} ${collection} ${order} ${mode}`, () => {
              const first = order === 'int-first' ? 'int' : 'float';
              const second = order === 'int-first' ? 'float' : 'int';
              const header =
                mode === 'untyped'
                  ? 'relay(xs) =>\n    copied = xs\n    score(copied)'
                  : `relayInt(${collectionType(collection, 'int')} xs) =>\n    copied = xs\n    score(copied)
relayFloat(${collectionType(collection, 'float')} xs) =>\n    copied = xs\n    score(copied)`;
              const call = (kind: string) =>
                `${mode === 'untyped' ? 'relay' : kind === 'int' ? 'relayInt' : 'relayFloat'}(${createCollection(collection, kind)})`;
              const tuple = `[${call(first)},${call(second)}]`;
              const source = `//@version=${version}
indicator("Forwarded regular collection overload")
score(${collectionType(collection, 'int')} xs) => 10
score(${collectionType(collection, 'float')} xs) => 20
${header}
${context === 'direct' ? `fixtureFirstResult = ${call(first)}
fixtureSecondResult = ${call(second)}
fixturePair() => [fixtureFirstResult,fixtureSecondResult]
` : ''}[x,y] = ${context === 'security' ? `request.security("REMOTE:ALT","1",${tuple})` : 'fixturePair()'}
plot(x)
plot(y)`;
              const ast = parse(source);
              expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
              const compiled = tryCompile(ast);
              expect(compiled.success).toBe(true);
              const result = executeCompiled(compiled, bars, undefined, {
                requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'REMOTE:ALT', timeframe: '1', bars }]),
                runtime: { timeframe: { period: '1' } },
              });
              expect(result).toBeDefined();
              expect(result!.errors).toEqual([]);
              expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
              expect(result!.plots.map((plot) => plot.values)).toEqual([
                Array(3).fill(first === 'int' ? 10 : 20),
                Array(3).fill(second === 'int' ? 10 : 20),
              ]);
            });
          }
});

describe('local collection aliases retain regular UDF overload refusals', () => {
  for (const version of [5, 6])
    for (const collection of ['array', 'matrix', 'map'] as const) {
      const type = collectionType(collection, 'int');
      const created = createCollection(collection, 'int');
      for (const [kind, body] of [
        [
          'concrete-ambiguous',
          `score(${type} xs) => 10\nscore(${type} xs, int extra=0) => 20\nplot(score(${created}))`,
        ],
        [
          'typed-ambiguous',
          `score(${type} xs) => 10\nscore(${type} xs, int extra=0) => 20\nrelay(${type} xs) =>\n    copied = xs\n    score(copied)\nplot(relay(${created}))`,
        ],
        ['unresolved-global', `score(${type} xs) => 10\nscore(${type} xs, int extra=0) => 20\nplot(score(absent))`],
      ]) {
        it(`v${version} ${collection} ${kind}`, () => {
          expectRefusal(`//@version=${version}\nindicator("Ambiguity guard controls")\n${body}`, 'ambiguous-call');
        });
      }

      for (const mode of ['ambiguous', 'incompatible']) {
        it(`v${version} ${collection} deferred-${mode}`, () => {
          const definitions =
            mode === 'ambiguous'
              ? `score(${type} xs) => 10\nscore(${type} xs, int extra=0) => 20`
              : `score(${type} xs) => 10\nscore(${collectionType(collection, 'float')} xs) => 20`;
          expectRefusal(`//@version=${version}
indicator("Deferred concrete overload controls")
${definitions}
relay(xs) =>\n    copied = xs\n    score(copied)
plot(relay(${createCollection(collection, mode === 'ambiguous' ? 'int' : 'bool')}))`);
        });
      }
    }

  for (const version of [5, 6]) {
    it(`v${version} mixed-method-namespace`, () => {
      expectRefusal(
        `//@version=${version}
indicator("Mixed callable namespace")
score(array<int> xs) => 10
score(array<float> xs) => 20
method score(array<string> xs) => 99
relay(xs) =>\n    copied = xs\n    score(copied)
plot(relay(array.new<int>(1,0)))`,
        'ambiguous-call',
      );
    });
  }
});
