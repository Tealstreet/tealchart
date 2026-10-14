import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeCompiled, tryCompile } from './execute';

const bars = [3, 4, 5, 6, 7].map((close, index) => ({
  time: (index + 1) * 60_000, open: 4, high: 8, low: 2, close, volume: 1,
}));

function values(version: number, declarations: string, body: string, imported = true): unknown[][] {
  const libraries = new Map([['Test/Methods/1', parse(`//@version=${version}\nlibrary("Methods")\n${declarations}`)]]);
  const source = `//@version=${version}\nindicator("Drawing methods")\n${imported ? 'import Test/Methods/1 as lib' : declarations.replaceAll('export ', '')}\n${imported ? body : body.replaceAll('lib.', '')}`;
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
  { kind: 'line', create: 'line.new(bar_index, close, bar_index + 1, open)', read: 'line.get_y1(self)' },
  { kind: 'label', create: 'label.new(bar_index, close)', read: 'label.get_y(self)' },
  { kind: 'box', create: 'box.new(bar_index, close, bar_index + 1, low)', read: 'box.get_top(self)' },
];

describe('imported drawing and library-local UDT receiver identity', () => {
  for (const version of [5, 6]) {
    for (const { kind, create, read } of receivers) {
      const declarations = `export method probe(${kind} self, int n = 2) => ${read} + n\nexport method identity(${kind} self) => self\nexport method duo(${kind} self, int n) => [${read} + n, ${read} - n]\nexport forward(${kind} value) => value.probe(3)`;
      for (const route of ['direct', 'typed', 'forwarded', 'named', 'chained', 'tuple', 'history', 'library-forwarded']) {
        it(`matches local ${kind} values through ${route} calls in v${version}`, () => {
          const call = route === 'direct' ? 'plot(v.probe(3))'
            : route === 'typed' ? `read(${kind} value) => value.probe(3)\nplot(read(v))`
            : route === 'forwarded' ? 'leaf(value) => value.probe(3)\nread(value) => leaf(value)\nplot(read(v))'
            : route === 'named' ? 'plot(v.probe(n = 3))'
            : route === 'chained' ? 'plot(v.identity().probe(3))'
            : route === 'tuple' ? '[a, b] = v.duo(3)\nplot(a)\nplot(b)'
            : route === 'history' ? 'plot(v[1].probe(3))' : 'plot(lib.forward(v))';
          const body = `v = ${create}\n${call}`;
          const local = values(version, declarations, body, false);
          expect(local[0]).toEqual(route === 'history' ? [null, 6, 7, 8, 9] : [6, 7, 8, 9, 10]);
          if (route === 'tuple') expect(local[1]).toEqual([0, 1, 2, 3, 4]);
          expect(values(version, declarations, body)).toEqual(local);
        });
      }
    }
    for (const reverse of [false, true]) {
      it(`separates drawing receiver overloads in v${version}, reverse=${reverse}`, () => {
        const methods = receivers.map(({ kind, read }, index) => `export method read(${kind} self) => ${read} + ${index * 10}`);
        if (reverse) methods.reverse();
        const body = receivers.map(({ create }, index) => `v${index} = ${create}\nplot(v${index}.read())`).join('\n');
        expect(values(version, methods.join('\n'), body)).toEqual([[3, 4, 5, 6, 7], [13, 14, 15, 16, 17], [23, 24, 25, 26, 27]]);
      });
    }
    for (const exported of [true, false]) {
      it(`retains UDT public identity through library-local ${exported ? 'exported' : 'private'} methods in v${version}`, () => {
        const declarations = `export type Token\n    float v\n${exported ? 'export ' : ''}method own(Token self) => self.v\nexport forward(Token x) => x.own()`;
        const body = 'plot(lib.forward(lib.Token.new(close)))';
        const local = values(version, declarations, body, false);
        expect(local).toEqual([[3, 4, 5, 6, 7]]);
        expect(values(version, declarations, body)).toEqual(local);
      });
    }
  }
});
