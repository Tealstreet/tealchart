import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';

it.each([5, 6])('skips a missing step before its warmup in v%s', (version) => {
  const bars = [0, 1, 2].map((index) => ({ time: index * 60000, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
  const execution = executeCompiledScript(parse(`//@version=${version}
indicator("Warmup step")
int step = bar_index > 0 ? 1 : na
count = 0
for i = 0 to 2 by step
    count += 1
plot(count)`), bars);
  expect(execution.status).toBe('success');
  if (execution.status !== 'success') throw new Error(execution.reason);
  expect(execution.result.errors).toEqual([]);
  expect(execution.result.plots[0].values).toEqual([0, 3, 3]);
});
