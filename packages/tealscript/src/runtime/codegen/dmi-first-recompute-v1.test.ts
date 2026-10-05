import { expect, it } from 'vitest';

import { DMI } from './ta-classes';

// Startup authority: e6bb97364a and oracle-probes/v2/captures/v2/coverage-ta-3-v1.csv.
// Recompute must replace a same-bar evaluation and preserve its pre-bar state.
it('replaces first-bar DMI updates without advancing previous-bar availability', () => {
  const dmi = new DMI(1, 1);
  expect(dmi.compute(11, 9, 10)).toEqual([NaN, NaN, NaN]);
  for (const bar of [
    [11, 9, 10],
    [12, 8, 11],
    [13, 7, 12],
  ]) {
    const fresh = new DMI(1, 1);
    const expected = fresh.compute(bar[0]!, bar[1]!, bar[2]!);
    expect(dmi.recompute(bar[0]!, bar[1]!, bar[2]!)).toEqual(expected);
    expect(dmi.save()).toEqual(fresh.save());
  }
  const fresh = new DMI(1, 1);
  fresh.compute(13, 7, 12);
  expect(dmi.compute(14, 8, 13)).toEqual(fresh.compute(14, 8, 13));
  expect(dmi.save()).toEqual(fresh.save());
});
