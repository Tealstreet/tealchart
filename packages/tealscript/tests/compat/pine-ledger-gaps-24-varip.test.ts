import { describe, expect, it } from 'vitest';

import { workerPlots } from './ledgerGaps24Worker';

// Variable-declarations manual: first intrabar scope execution permanently initializes varip.
describe('ledger gaps 24 public-worker varip witnesses', () => {
  it('initializes varip once on the first intrabar scope execution (922)', async () => {
    const values = await workerPlots(`float held = na
float rolled = na
if barstate.isrealtime and close <= 9
    varip float initial = close
    var float ordinary = close
    held := initial
    rolled := ordinary
plot(held, "held")
plot(rolled, "rolled")`);
    expect.soft(values('held')).toEqual([null, null, 9, 9, null, 9]);
    expect.soft(values('rolled')).toEqual([null, null, 9, 8, null, 7]);
  }, 30_000);
});
