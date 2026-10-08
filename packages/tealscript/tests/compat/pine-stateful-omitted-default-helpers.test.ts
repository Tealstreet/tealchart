import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

const bars = [23, 25, 29, 31].map((close, index) => ({
  time: Date.UTC(2026, 9, 2) + index * 60_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 17,
}));

describe('stateful helpers in omitted local defaults', () => {
  for (const version of [5, 6]) {
    for (const context of ['direct', 'security']) {
      for (const helper of ['counter', 'cumulative']) {
        for (const mode of ['omitted', 'supplied', 'body-frame', 'direct-helper', 'literal']) {
          it(`v${version} ${context} ${helper} ${mode} preserves the values`, () => {
            const helperBody =
              helper === 'counter'
                ? 'measure() =>\n    var int count = 0\n    count += 1\n    count'
                : 'measure() => ta.cum(close)';
            const call =
              mode === 'supplied'
                ? 'read(measure())'
                : mode === 'body-frame'
                  ? 'outer()'
                  : mode === 'direct-helper'
                    ? 'measure()'
                    : mode === 'literal'
                      ? 'read(5)'
                      : 'read()';
            const source = `//@version=${version}
indicator("Stateful omitted defaults")
${helperBody}
read(value = measure()) => value
${mode === 'body-frame' ? 'outer() => read()' : ''}
value = ${context === 'security' ? `request.security("REMOTE:ALT", "1", ${call})` : call}
plot(value, "Value")`;
            const compiled = tryCompile(parse(source));
            expect(compiled.success).toBe(true);
            const result = executeCompiled(compiled, bars, undefined, {
              requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'REMOTE:ALT', timeframe: '1', bars }]),
              runtime: { timeframe: { period: '1' } },
            });
            expect(result).toBeDefined();
            expect(result!.errors).toEqual([]);
            expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
            const expected =
              mode === 'literal' ? [5, 5, 5, 5] : helper === 'counter' ? [1, 2, 3, 4] : [23, 48, 77, 108];
            expect(result!.plots.find((plot) => plot.title === 'Value')?.values).toEqual(expected);
          });
        }
      }
    }
  }
});
