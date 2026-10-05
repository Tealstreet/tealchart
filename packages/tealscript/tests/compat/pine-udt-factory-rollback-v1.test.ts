import { expect, it } from 'vitest';

import { workerPlots } from './ledgerGaps24Worker';

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
// entries[9].detailedDesc[2]: ordinary fields roll back on varip references.
it('registers initial ordinary fields through compiled UDT factories', async () => {
  const values = await workerPlots(`type Counter
    varip int ticks = 0
    int regular = 0
varip Counter counter = Counter.new()
counter.ticks += 1
counter.regular += 1
plot(counter.ticks, "ticks")
plot(counter.regular, "regular")`);
  expect(values('ticks')).toEqual([1, 2, 3, 4, 5, 6]);
  expect(values('regular')).toEqual([1, 2, 2, 2, 2, 3]);
}, 30_000);
