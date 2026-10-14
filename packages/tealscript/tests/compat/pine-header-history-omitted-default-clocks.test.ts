import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

const closes = [23, 25, 29, 31, 37, 41, 43, 47, 53];
const bars = closes.map((close, index) => ({
  time: Date.UTC(2026, 9, 2) + index * 60000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 17,
}));

describe('omitted computed-source history defaults', () => {
  for (const version of [5, 6])
    for (const context of ['direct', 'security'])
      for (const caller of ['root', 'nested'])
        for (const form of ['function', 'method'])
          for (const source of ['twice', 'range'])
            for (const mode of ['omitted', 'supplied', 'helper']) {
              it(`v${version} ${context} ${caller} ${form} ${source} ${mode}`, () => {
                const expression = source === 'twice' ? '(close * 2)[1]' : '(close + high - low)[1]';
                const call =
                  form === 'method'
                    ? `seed.read(${mode === 'supplied' ? expression : ''})`
                    : `read(${mode === 'supplied' ? expression : ''})`;
                const header = `//@version=${version}
indicator("Omitted expression history")
seed = array.new_int(1,1)
${mode === 'helper' ? `measure() => ${expression}` : ''}
${form === 'method' ? 'method read(array<int> receiver, value =' : 'read(value ='} ${mode === 'helper' ? 'measure()' : expression}) => value`;
                const tuple = `[${call}, bar_index % 2 == 0 ? ${call} : na]`;
                const body =
                  caller === 'nested'
                    ? `
observe() =>
    always = ${call}
    occasional = bar_index % 2 == 0 ? ${call} : na
    [always,occasional]
[always,occasional] = ${context === 'security' ? 'request.security("REMOTE:ALT","1",observe())' : 'observe()'}`
                    : context === 'security'
                      ? `
[always,occasional] = request.security("REMOTE:ALT","1",${tuple})`
                      : `
always = ${call}
occasional = bar_index % 2 == 0 ? ${call} : na`;
                const code = `${header}${body}
plot(always,"Always")
plot(occasional,"Occasional")`;
                const compiled = tryCompile(parse(code));
                expect(compiled.success).toBe(true);
                const result = executeCompiled(compiled, bars, undefined, {
                  requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'REMOTE:ALT', timeframe: '1', bars }]),
                  runtime: { timeframe: { period: '1' } },
                });
                expect(result).toBeDefined();
                expect(result!.errors).toEqual([]);
                expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
                const values = closes.map((close) => (source === 'twice' ? close * 2 : close + 2));
                const always = values.map((_, index) => (index === 0 ? null : values[index - 1]));
                const occasional = values.map((_, index) =>
                  index === 0 || index % 2 !== 0 ? null : values[index - 2],
                );
                expect(result!.plots.find((plot) => plot.title === 'Always')?.values).toEqual(always);
                expect(result!.plots.find((plot) => plot.title === 'Occasional')?.values).toEqual(occasional);
              });
            }
});
