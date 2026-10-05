import { describe, expect, it } from 'vitest';

import { workerPlots } from './ledgerGaps24Worker';

// Rows1678/1827: conditional-structures/#once-on-the-realtime-bar.
describe('once activation across public-worker rollback and confirmation', () => {
  for (const conditional of [false, true]) {
    it(`commits closing-tick inactivity with conditional=${conditional}`, async () => {
      const plots = await workerPlots(`varip int ticks = 0
varip int closes = 0
if barstate.isrealtime
    once ${conditional ? 'close > 10' : ''}
        ticks += 1
    once barstate.isconfirmed
        closes += 1
plot(ticks, "Ticks")
plot(closes, "Closes")`);
      expect(plots('Ticks')).toEqual(conditional ? [0, 1, 1, 1, 2, 2] : [0, 1, 2, 3, 4, 4]);
      expect(plots('Closes')).toEqual([0, 0, 0, 0, 0, 1]);
    });
  }
});
