import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';

const bars = [10, 20, 30, 40].map((close, index) => ({
  time: index * 60_000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

function run(version: 5 | 6, body: string) {
  const requestDatafeed = new InMemoryRequestDatafeed(
    ['A', 'B'].map((symbol, index) => ({
      symbol,
      timeframe: '1',
      bars: bars.map((bar, offset) => ({ ...bar, close: (index + 1) * 100 + offset + 1 })),
    })),
  );
  return executeCompiledScript(
    parse(`//@version=${version}
indicator("Dynamic local requests", dynamic_requests=true)
${body}
plot(value)`),
    bars,
    new Map(),
    { requestDatafeed, runtime: { timeframe: { period: '1' } } },
  );
}

for (const version of [5, 6] as const) {
  it(`executes a conditional request only in selected local blocks in v${version}`, () => {
    const result = run(
      version,
      `float value = -1
if bar_index % 2 == 0
    value := request.security("A", "1", close)`,
    );
    expect(result.status).toBe('success');
    if (result.status !== 'success') throw new Error(result.reason);
    expect(result.result.errors).toEqual([]);
    expect(result.result.plots[0]?.values).toEqual([101, -1, 103, -1]);
  });

  it(`evaluates loop-selected request contexts with an invariant expression in v${version}`, () => {
    const result = run(
      version,
      `float value = 0
for index = 0 to 1
    symbol = index == 0 ? "A" : "B"
    value += request.security(symbol, "1", close)`,
    );
    expect(result.status).toBe('success');
    if (result.status !== 'success') throw new Error(result.reason);
    expect(result.result.errors).toEqual([]);
    expect(result.result.plots[0]?.values).toEqual([302, 304, 306, 308]);
  });
}
