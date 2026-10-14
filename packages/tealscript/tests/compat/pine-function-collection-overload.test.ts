import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

const bars = [23, 25, 29].map((close, index) => ({
  time: Date.UTC(2026, 9, 2) + index * 60000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 17,
}));

describe('local collection method overloads in function syntax', () => {
  for (const version of [5, 6])
    for (const context of ['direct', 'security'])
      for (const kind of ['int', 'float'])
        for (const syntax of ['function', 'method'])
          for (const mode of ['omitted', 'supplied']) {
            it(`v${version} ${context} ${kind} ${syntax} ${mode}`, () => {
              const selected = syntax === 'function' ? 'score(seed)' : 'seed.score()';
              const call = `read(${mode === 'supplied' ? selected : ''})`;
              const source = `//@version=${version}
indicator("Nested default overload")
method score(array<int> xs) => 10
method score(array<float> xs) => 20
seed = array.new<${kind}>(1,0)
read(value=${selected}) => value
outer() => ${call}
x = ${context === 'security' ? 'request.security("REMOTE:ALT","1",outer())' : 'outer()'}
plot(x)`;
              const compiled = tryCompile(parse(source));
              expect(compiled.success).toBe(true);
              const result = executeCompiled(compiled, bars, undefined, {
                requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'REMOTE:ALT', timeframe: '1', bars }]),
                runtime: { timeframe: { period: '1' } },
              });
              expect(result).toBeDefined();
              expect(result!.errors).toEqual([]);
              expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
              expect(result!.plots[0]?.values).toEqual(Array(3).fill(kind === 'int' ? 10 : 20));
            });
          }
});
