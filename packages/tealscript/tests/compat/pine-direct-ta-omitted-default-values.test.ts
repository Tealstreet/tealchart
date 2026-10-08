import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

const values = [23, 25, 29, 31, 37, 41, 43, 47, 53];
const bars = values.map((close, index) => ({
  time: Date.UTC(2026, 9, 2) + index * 60000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 17,
}));
const vectors = { cum: [23, 48, 77, 108, 145, 186, 229, 276, 329], sma: [NaN, 24, 27, 30, 34, 39, 42, 45, 50] };

describe('direct TA builtins in omitted local defaults', () => {
  for (const version of [5, 6])
    for (const context of ['direct', 'security', 'lower'])
      for (const form of ['function', 'method'])
        for (const helper of ['cum', 'sma'] as const)
          for (const mode of ['omitted', 'supplied', 'helper', 'literal']) {
            it(`v${version} ${context} ${form} ${helper} ${mode}`, () => {
              const expression = helper === 'cum' ? 'ta.cum(close)' : 'ta.sma(close,2)';
              const defaultValue = mode === 'literal' ? '7' : mode === 'helper' ? 'measure()' : expression;
              const call =
                form === 'method'
                  ? `seed.read(${mode === 'supplied' ? expression : ''})`
                  : `read(${mode === 'supplied' ? expression : ''})`;
              const source = `//@version=${version}
indicator("Direct TA default state")
seed = array.new_int(1,1)
${mode === 'helper' ? `measure() => ${expression}` : ''}
${form === 'method' ? 'method read(array<int> receiver, value =' : 'read(value ='} ${defaultValue}) => value
${
  context === 'lower'
    ? `intrabar = request.security_lower_tf("REMOTE:ALT", "1", ${call})
value = array.size(intrabar) > 0 ? array.get(intrabar,0) : na`
    : `value = ${context === 'security' ? `request.security("REMOTE:ALT", "1", ${call})` : call}`
}
plot(value,"Value")`;
              const compiled = tryCompile(parse(source));
              expect(compiled.success).toBe(true);
              const chart = context === 'lower' ? bars.filter((_, i) => i % 3 === 0) : bars;
              const result = executeCompiled(compiled, chart, undefined, {
                requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'REMOTE:ALT', timeframe: '1', bars }]),
                runtime: { timeframe: { period: context === 'lower' ? '3' : '1' } },
              });
              expect(result).toBeDefined();
              expect(result!.errors).toEqual([]);
              expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
              const expected = (mode === 'literal' ? values.map(() => 7) : vectors[helper]).map((v) =>
                Number.isNaN(v) ? null : v,
              );
              expect(result!.plots.find((p) => p.title === 'Value')?.values).toEqual(
                context === 'lower' ? expected.filter((_, i) => i % 3 === 0) : expected,
              );
            });
          }
});
