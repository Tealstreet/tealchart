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
describe('written omitted default calls retain independent counters', () => {
  for (const version of [5, 6])
    for (const context of ['direct', 'security']) {
      it(`v${version} ${context} separates always and delayed calls`, () => {
        const source = `//@version=${version}
indicator("Independent omitted defaults")
measure() =>
    var int count = 0
    count += 1
    count
read(value = measure()) => value
both() =>
    left = read()
    right = bar_index >= 1 ? read() : na
    [left, right]
[left, right] = ${context === 'security' ? 'request.security("REMOTE:ALT", "1", both())' : 'both()'}
plot(left, "Always")
plot(right, "Delayed")`;
        const compiled = tryCompile(parse(source));
        expect(compiled.success).toBe(true);
        const result = executeCompiled(compiled, bars, undefined, {
          requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'REMOTE:ALT', timeframe: '1', bars }]),
          runtime: { timeframe: { period: '1' } },
        });
        expect(result).toBeDefined();
        expect(result!.errors).toEqual([]);
        expect(result!.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        expect(result!.plots.find((p) => p.title === 'Always')?.values).toEqual([1, 2, 3, 4]);
        expect(result!.plots.find((p) => p.title === 'Delayed')?.values).toEqual([null, 1, 2, 3]);
      });
    }
});
