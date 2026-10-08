import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

const bars = [9, 12, 8].map((close, index) => ({
  time: Date.UTC(2026, 9, 3) + index * 60_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 10,
}));

describe('independent omitted method defaults retain checker overloads', () => {
  for (const version of [5, 6]) {
    for (const family of ['receiver', 'argument']) {
      for (const kind of ['int', 'float']) {
        for (const mode of ['supplied', 'outer', 'direct']) {
          it(`v${version} ${family} ${kind} ${mode}`, () => {
            const receiver =
              family === 'receiver' && kind === 'float' ? 'array.new_float(2, 1.25)' : 'array.new_int(2, 1)';
            const methods =
              family === 'receiver'
                ? 'method score(array<int> value) => 11\nmethod score(array<float> value) => -13'
                : 'method score(array<int> value, int offset) => 17\nmethod score(array<int> value, float offset) => -19';
            const methodCall = family === 'receiver' ? 'seed.score()' : `seed.score(${kind === 'int' ? '2' : '2.5'})`;
            const call =
              mode === 'direct'
                ? methodCall
                : mode === 'supplied'
                  ? `read(${methodCall})`
                  : mode === 'outer'
                    ? 'outer()'
                    : 'read()';
            const compiled = tryCompile(
              parse(`//@version=${version}
indicator("Independent method frame")
${methods}
seed = ${receiver}
read(value = ${methodCall}) => value
outer() => read()
plot(${call}, "Observed")`),
            );
            expect(compiled.success).toBe(true);
            const result = executeCompiled(compiled, bars);
            expect(result).toBeDefined();
            expect(result!.errors).toEqual([]);
            expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
            const expected = family === 'receiver' ? (kind === 'int' ? 11 : -13) : kind === 'int' ? 17 : -19;
            expect(result!.plots.find((plot) => plot.title === 'Observed')?.values).toEqual([
              expected,
              expected,
              expected,
            ]);
          });
        }
      }
    }
  }
});
