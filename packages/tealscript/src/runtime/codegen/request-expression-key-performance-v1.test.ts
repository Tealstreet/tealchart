import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { InMemoryRequestDatafeed } from '../requestDatafeed';
import { executeCompiled, tryCompile } from './execute';

const bars = Array.from({ length: 20000 }, (_, index) => ({
  time: (index + 1) * 120000,
  open: index + 1,
  high: index + 2,
  low: index,
  close: index + 1,
  volume: 1,
}));
const locals = Array.from({ length: 120 }, (_, index) => `    v${index} = close + ${index}`).join('\n');
const expression = Array.from({ length: 120 }, (_, index) => `v${index}`).join(' + ');
const source = `//@version=5
indicator("Request expression key throughput")
read(int shift) =>
${locals}
    request.security("TEST", "2", ${expression} + shift)
plot(read(0))`;

describe('request expression identity throughput', () => {
  it('shares the first count only for identical expressions and isolates each execution', () => {
    const compiled = tryCompile(parse(`//@version=6
indicator("Request identity controls")
count = input.int(2, "count")
plot(request.security("TEST", "2", close, calc_bars_count=count))
plot(request.security("TEST", "2", close, calc_bars_count=4))
plot(request.security("TEST", "2", close + 1, calc_bars_count=4))`));
    expect(compiled.success).toBe(true);
    const controlBars = bars.slice(0, 8);
    const requestDatafeed = new InMemoryRequestDatafeed([{ symbol: 'TEST', timeframe: '2', bars: controlBars }]);
    for (const count of [2, 3]) {
      const result = executeCompiled(compiled, controlBars, new Map([['input_count', count]]), {
        requestDatafeed,
        runtime: { timeframe: { period: '2' } },
      });
      expect(result?.errors).toEqual([]);
      const expected = controlBars.map(({ close }, index) => index < 8 - count ? null : close);
      expect(result?.plots[0].values).toEqual(expected);
      expect(result?.plots[1].values).toEqual(expected);
      expect(result?.plots[2].values).toEqual(controlBars.map(({ close }, index) => index < 4 ? null : close + 1));
    }
  });

  it('preserves every requested value without reserializing the expression for each bar', () => {
    const compiled = tryCompile(parse(source));
    expect(compiled.success).toBe(true);
    const requestDatafeed = new InMemoryRequestDatafeed([{ symbol: 'TEST', timeframe: '2', bars }]);
    const start = process.cpuUsage();
    const result = executeCompiled(compiled, bars, undefined, {
      requestDatafeed,
      runtime: { timeframe: { period: '2' } },
    });
    const cpu = process.cpuUsage(start);
    const elapsed = (cpu.user + cpu.system) / 1000;
    console.log('request-expression-key-cpu-ms', elapsed);
    expect(result?.errors).toEqual([]);
    expect(result?.plots[0].values).toEqual(bars.map(({ close }) => close * 120 + 7140));
    if (process.env.TEALSCRIPT_PERF_ASSERT === '1') expect(elapsed).toBeLessThan(1500);
  });
});
