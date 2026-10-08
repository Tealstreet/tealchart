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
describe('TA omitted defaults independent written calls', () => {
  for (const version of [5, 6])
    for (const context of ['direct', 'security'])
      for (const form of ['function', 'method'])
        for (const helper of ['cum', 'sma'])
          for (const mode of ['omitted', 'supplied', 'helper']) {
            it(`v${version} ${context} ${form} ${helper} ${mode} separates unconditional and conditional clocks`, () => {
              const expression = helper === 'cum' ? 'ta.cum(close)' : 'ta.sma(close,2)';
              const call =
                form === 'method'
                  ? `seed.read(${mode === 'supplied' ? expression : ''})`
                  : `read(${mode === 'supplied' ? expression : ''})`;
              const source = `//@version=${version}
indicator("Independent TA default clocks")
seed=array.new_int(1,1)
${mode === 'helper' ? `measure() => ${expression}` : ''}
${form === 'method' ? 'method read(array<int> receiver, value =' : 'read(value ='} ${mode === 'helper' ? 'measure()' : expression}) => value
observe() =>
    always = ${call}
    var float occasional = na
    if bar_index % 2 == 0
        occasional := ${call}
    [always,occasional]
[always,occasional] = ${context === 'security' ? 'request.security("REMOTE:ALT","1",observe())' : 'observe()'}
plot(always,"Always")
plot(occasional,"Occasional")`;
              const compiled = tryCompile(parse(source));
              expect(compiled.success).toBe(true);
              const result = executeCompiled(compiled, bars, undefined, {
                requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'REMOTE:ALT', timeframe: '1', bars }]),
                runtime: { timeframe: { period: '1' } },
              });
              expect(result).toBeDefined();
              expect(result!.errors).toEqual([]);
              expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
              expect(result!.plots.find((p) => p.title === 'Always')?.values).toEqual(
                helper === 'cum' ? [23, 48, 77, 108, 145, 186, 229, 276, 329] : [null, 24, 27, 30, 34, 39, 42, 45, 50],
              );
              expect(result!.plots.find((p) => p.title === 'Occasional')?.values).toEqual(
                helper === 'cum' ? [23, 23, 52, 52, 89, 89, 132, 132, 185] : [null, null, 26, 26, 33, 33, 40, 40, 48],
              );
            });
          }
});
