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

describe('local function-form methods preserve per-written-call collection types', () => {
  for (const version of [5, 6])
    for (const context of ['direct', 'security'])
      for (const order of ['int-first', 'float-first'])
        for (const syntax of ['function', 'method']) {
          it(`v${version} ${context} ${order} ${syntax}`, () => {
            const first = order === 'int-first' ? 'int' : 'float';
            const second = order === 'int-first' ? 'float' : 'int';
            const tuple = `[relay(array.new<${first}>(1,0)),relay(array.new<${second}>(1,0))]`;
            const source = `//@version=${version}
indicator("Mixed collection call scopes")
method score(array<int> xs) => 10
method score(array<float> xs) => 20
relay(xs) => ${syntax === 'function' ? 'score(xs)' : 'xs.score()'}
${context === 'direct' ? `fixtureFirstResult = relay(array.new<${first}>(1,0))
fixtureSecondResult = relay(array.new<${second}>(1,0))
fixturePair() => [fixtureFirstResult,fixtureSecondResult]
` : ''}[x,y] = ${context === 'security' ? `request.security("REMOTE:ALT","1",${tuple})` : 'fixturePair()'}
plot(x)
plot(y)`;
            const compiled = tryCompile(parse(source));
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
