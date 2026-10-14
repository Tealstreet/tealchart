import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

describe('collection aliases resolve in local bodies and retain assignment types', () => {
  for (const version of [5, 6])
    for (const collection of ['array', 'matrix', 'map']) {
      const type = (kind: string) => (collection === 'map' ? `map<string,${kind}>` : `${collection}<${kind}>`);
      const create = (kind: string) => {
        const value = kind === 'bool' ? 'false' : '3';
        return collection === 'map'
          ? `map.new<string,${kind}>()`
          : collection === 'matrix'
            ? `matrix.new<${kind}>(1,1,${value})`
            : `array.new<${kind}>(1,${value})`;
      };
      for (const [shape, body] of [
        [
          'while-body assignment',
          '    i = 0\n    out = 0\n    while i < 1\n        copied = xs\n        out := score(copied)\n        i += 1\n    out',
        ],
        [
          'for-body assignment',
          '    out = 0\n    for i = 0 to 1\n        copied = xs\n        out := score(copied)\n    out',
        ],
        ['reassigned intermediate', '    copied = xs\n    copied := ys\n    forwarded = copied\n    score(forwarded)'],
        ['assignment after use', '    copied = xs\n    out = score(copied)\n    copied := ys\n    out'],
      ]) {
        it(`v${version} ${collection} ${shape}`, () => {
          const source = `//@version=${version}
indicator("Collection alias transport boundary")
score(${type('int')} xs) => 10
score(${type('float')} xs) => 20
relay(xs, ys) =>
${body}
plot(relay(${create('int')},${create('bool')}))`;
          const ast = parse(source);
          const diagnostics = checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
          const compiled = tryCompile(ast);
          if (shape.endsWith('body assignment')) {
            expect(diagnostics).toEqual([]);
            expect(compiled.success).toBe(true);
            const bars = [23, 25, 29].map((close, index) => ({
              time: index * 60000,
              open: close,
              high: close,
              low: close,
              close,
              volume: 1,
            }));
            const result = executeCompiled(compiled, bars);
            expect(result!.errors).toEqual([]);
            expect(result!.profile.compiledBarErrors?.count ?? 0).toBe(0);
            expect(result!.plots.map((plot) => plot.values)).toEqual([[10, 10, 10]]);
          } else {
            expect(diagnostics.some((diagnostic) => diagnostic.code === 'type-mismatch')).toBe(true);
            expect(compiled.success).toBe(false);
          }
        });
      }
    }
});
