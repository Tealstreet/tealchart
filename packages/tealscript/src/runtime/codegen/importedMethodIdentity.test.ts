import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeCompiled, tryCompile } from './execute';

const bars = [3, 4, 5].map((close, index) => ({
  time: (index + 1) * 60_000, open: close, high: close, low: close, close, volume: 1,
}));

function values(version: number, libraryBody: string, body: string): unknown[][] {
  const libraries = new Map([['Test/Identity/1', parse(`//@version=${version}\nlibrary("Identity")\n${libraryBody}`)]]);
  const ast = parse(`//@version=${version}\nindicator("Imported identity")\nimport Test/Identity/1 as lib\n${body}`);
  expect(checkProgram(ast, { libraries }).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast, undefined, { libraries });
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars, undefined, { libraries });
  expect(result).toBeDefined();
  expect(result!.errors).toEqual([]);
  expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
  return result!.plots.map((plot) => plot.values);
}

describe('imported methods retain distinct declaration identities', () => {
  for (const version of [5, 6]) {
    for (const reverse of [false, true]) {
      const methods = [
        'method combine(float self, int other) => self + other + 100',
        'method combine(float self, float other) => self + other + 200',
        'method combine(int self, int other) => self + other + 300',
      ];
      if (reverse) methods.reverse();
      const exported = methods.map((method) => `export ${method}`).join('\n');
      const expected = [[106, 107, 108], [206, 207, 208], [306, 307, 308]];
      it(`matches local non-receiver parameter overloads in v${version}, reverse=${reverse}`, () => {
        expect(values(version, exported, `${methods.map((method) => method.replace('combine', 'localCombine')).join('\n')}
plot(close.combine(int(3)))
plot(close.combine(float(3.0)))
plot(int(close).combine(int(3)))
plot(close.localCombine(int(3)))
plot(close.localCombine(float(3.0)))
plot(int(close).localCombine(int(3)))`)).toEqual([...expected, ...expected]);
      });
      it(`keeps per-written wrapper selections separate in v${version}, reverse=${reverse}`, () => {
        expect(values(version, exported, `read(value, other) => value.combine(other)
plot(read(close, int(3)))
plot(read(close, float(3.0)))
plot(read(int(close), int(3)))`)).toEqual(expected);
      });
      it(`walks each private library method body under its own identity in v${version}, reverse=${reverse}`, () => {
        expect(values(version, `${methods.join('\n')}
export readInt(float value, int other) => value.combine(other)
export readFloat(float value, float other) => value.combine(other)`, `plot(lib.readInt(close, int(3)))
plot(lib.readFloat(close, float(3.0)))`)).toEqual(expected.slice(0, 2));
      });
    }
  }
});
