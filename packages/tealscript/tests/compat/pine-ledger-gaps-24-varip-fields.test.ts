import { describe, expect, it } from 'vitest';

import { workerPlots } from './ledgerGaps24Worker';

const updates = `counter.ticks += 1
counter.regular += 1`;
const scripts = [
  [
    'root',
    `var Counter counter = Counter.new()
${updates}
plot(counter.ticks, "ticks")
plot(counter.regular, "regular")`,
  ],
  [
    'block',
    `float ticks = na
float regular = na
if true
    var Counter counter = Counter.new()
    ${updates.replaceAll('\n', '\n    ')}
    ticks := counter.ticks
    regular := counter.regular
plot(ticks, "ticks")
plot(regular, "regular")`,
  ],
  [
    'function',
    `counts() =>
    var Counter counter = Counter.new()
    ${updates.replaceAll('\n', '\n    ')}
    [counter.ticks, counter.regular]
[ticks, regular] = counts()
plot(ticks, "ticks")
plot(regular, "regular")`,
  ],
] as const;

// Reference kw_varip barData example: ordinary object reference, marked scalar field only.
describe('ledger921 marked UDT scalar fields', () => {
  it.each(scripts)(
    'persists only marked fields on an ordinary %s object',
    async (_scope, body) => {
      const values = await workerPlots(`type Counter
    varip int ticks = 0
    int regular = 0
${body}`);
      expect.soft(values('ticks')).toEqual([1, 2, 3, 4, 5, 6]);
      expect.soft(values('regular')).toEqual([1, 2, 2, 2, 2, 3]);
    },
    30_000,
  );
});
