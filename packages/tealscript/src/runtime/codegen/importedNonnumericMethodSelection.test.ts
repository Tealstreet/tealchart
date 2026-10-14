import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeCompiled, tryCompile } from './execute';

const bars = [3, 4, 5].map((close, index) => ({
  time: (index + 1) * 60_000, open: 4, high: 5, low: 3, close, volume: 1,
}));

function values(version: number, methods: string, body: string, imported = true): unknown[][] {
  const libraries = new Map([['Test/Methods/1', parse(`//@version=${version}\nlibrary("Methods")\n${methods}`)]]);
  const source = `//@version=${version}\nindicator("Scalar methods")\n${imported ? 'import Test/Methods/1 as lib' : methods.replaceAll('export ', '')}\n${body}`;
  const ast = parse(source);
  expect(checkProgram(ast, { libraries }).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast, undefined, { libraries });
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars, undefined, { libraries });
  expect(result?.errors).toEqual([]);
  expect(result?.profile.compiledBarErrors?.firstMessage).toBeUndefined();
  return result!.plots.map((plot) => plot.values);
}

const receivers = [
  { kind: 'bool', value: 'close > open', calculation: '(self ? 10 : 20)', expected: [24, 24, 14] },
  { kind: 'string', value: 'str.tostring(int(close))', calculation: 'str.length(self) + 30', expected: [35, 35, 35] },
  { kind: 'color', value: 'color.rgb(int(close), 9, 15)', calculation: 'color.r(self) + 40', expected: [47, 48, 49] },
];

describe('imported nonnumeric receiver selection', () => {
  for (const version of [5, 6]) {
    for (const { kind, value, calculation, expected } of receivers) {
      const methods = `export method get(${kind} self, int index) => ${calculation} + index`;
      for (const route of ['direct', 'typed', 'forwarded', 'loop']) {
        it(`matches local ${kind} methods through ${route} calls in v${version}`, () => {
          const body = route === 'direct' ? `plot((${value}).get(4))`
            : route === 'typed' ? `read(${kind} value) => value.get(4)\nplot(read(${value}))`
            : route === 'forwarded' ? `leaf(value) => value.get(4)\nread(value) => leaf(value)\nplot(read(${value}))`
            : `read(value) =>\n    result = 0.0\n    for i = 0 to 1\n        result := value.get(4)\n    result\nplot(read(${value}))`;
          const local = values(version, methods, body, false);
          expect(local).toEqual([expected]);
          expect(values(version, methods, body)).toEqual(local);
        });
      }
      it(`retains ${kind} return types in chained methods in v${version}`, () => {
        const chain = `export method identity(${kind} self) => self\n${methods}`;
        const body = `plot((${value}).identity().get(4))`;
        expect(values(version, chain, body)).toEqual(values(version, chain, body, false));
        expect(values(version, chain, body)).toEqual([expected]);
      });
      it(`runs library-local ${kind} methods through exported functions in v${version}`, () => {
        const library = `${methods.replace('export ', '')}\nexport read(${kind} value) => value.get(4)`;
        expect(values(version, library, `plot(lib.read(${value}))`)).toEqual([expected]);
      });
    }
    for (const reverse of [false, true]) {
      it(`separates string and color overloads despite their runtime representation in v${version}, reverse=${reverse}`, () => {
        const methods = [
          'export method pick(bool self) => self ? 11 : 12',
          'export method pick(string self) => str.length(self) + 100',
          'export method pick(color self) => color.r(self) + 200',
        ];
        if (reverse) methods.reverse();
        expect(values(version, methods.join('\n'), `read(value) => value.pick()\nplot(read(close > open))\nplot(read("abc"))\nplot(read(color.rgb(3, 9, 15)))`)).toEqual([[12, 12, 11], [103, 103, 103], [203, 203, 203]]);
      });
    }
    it(`refuses ambiguous imported bool methods in v${version}`, () => {
      const body = `//@version=${version}\nlibrary("Methods")\nexport method pick(bool self) => self ? 1 : 0`;
      const libraries = new Map([['Test/Methods/1', parse(body)], ['Other/Methods/1', parse(body)]]);
      const ast = parse(`//@version=${version}\nindicator("Ambiguous")\nimport Test/Methods/1 as first\nimport Other/Methods/1 as second\nplot((close > open).pick())`);
      expect(checkProgram(ast, { libraries }).diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'ambiguous-call', severity: 'error' }),
      ]));
      expect(tryCompile(ast, undefined, { libraries }).success).toBe(false);
    });
  }
});
