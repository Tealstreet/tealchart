import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript, tryCompile } from '../../src/runtime/codegen/execute';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';

const bars = [10, 20, 30, 40].map((close, index) => ({
  time: index * 60_000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

function program(version: 5 | 6, setting: string) {
  return parse(`//@version=${version}
indicator("Wrapped request version"${setting})
wrapped() => request.security("A", "1", close)
float value = -1
if bar_index % 2 == 0
    value := wrapped()
plot(value)`);
}

for (const setting of ['', ', dynamic_requests=false']) {
  it(`retains a v5 non-exported wrapper in a conditional with ${setting || 'default'} requests`, () => {
    const result = executeCompiledScript(program(5, setting), bars, new Map(), {
      runtime: { timeframe: { period: '1' } },
      requestDatafeed: new InMemoryRequestDatafeed([
        { symbol: 'A', timeframe: '1', bars: bars.map((bar, index) => ({ ...bar, close: 101 + index })) },
      ]),
    });
    expect(result.status).toBe('success');
    if (result.status !== 'success') throw new Error(result.reason);
    expect(result.result.errors).toEqual([]);
    expect(result.result.plots[0]?.values).toEqual([101, -1, 103, -1]);
  });
}

it('refuses a v6 locally called wrapper when dynamic requests are explicitly disabled', () => {
  const compiled = tryCompile(program(6, ', dynamic_requests=false'));
  expect(compiled.success).toBe(false);
  expect(compiled.unsupported).toContain(
    'request.* calls in local scopes require dynamic_requests=true: request.security',
  );
});

it('retains the same v6 wrapper when dynamic requests use the enabled default', () => {
  expect(tryCompile(program(6, '')).success).toBe(true);
});
