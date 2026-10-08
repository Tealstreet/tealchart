import { describe, expect, it } from 'vitest';

import { workerPlots } from './ledgerGaps24Worker';

const updates = `counter.ticks += 1
counter.regular += 1`;
const scripts = [
  [
    'root',
    `varip Counter counter = Counter.new()
${updates}
plot(counter.ticks, "ticks")
plot(counter.regular, "regular")`,
  ],
  [
    'block',
    `float ticks = na
float regular = na
if true
    varip Counter counter = Counter.new()
    ${updates.replaceAll('\n', '\n    ')}
    ticks := counter.ticks
    regular := counter.regular
plot(ticks, "ticks")
plot(regular, "regular")`,
  ],
  [
    'function',
    `counts() =>
    varip Counter counter = Counter.new()
    ${updates.replaceAll('\n', '\n    ')}
    [counter.ticks, counter.regular]
[ticks, regular] = counts()
plot(ticks, "ticks")
plot(regular, "regular")`,
  ],
] as const;

// https://www.tradingview.com/pine-script-reference/v6/
// entries[9].detailedDesc[2]: varip references retain ordinary-field rollback.
describe('varip UDT reference rollback', () => {
  it.each(scripts)(
    'persists only marked fields on an varip %s reference',
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

// Same reference entry distinguishes persistent object references from ordinary fields.
it('retains a replacement reference while rolling back its ordinary field', async () => {
  const values = await workerPlots(`type Counter
    varip int ticks = 0
    int regular = 0
varip Counter counter = Counter.new()
if barstate.isrealtime and close == 9
    counter := Counter.new(50, 20)
counter.ticks += 1
counter.regular += 1
plot(counter.ticks, "ticks")
plot(counter.regular, "regular")`);
  expect.soft(values('ticks')).toEqual([1, 2, 51, 52, 53, 54]);
  expect.soft(values('regular')).toEqual([1, 2, 21, 21, 21, 22]);
}, 30_000);
