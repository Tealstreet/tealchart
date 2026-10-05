import { describe, expect, it } from 'vitest';

import { TSI } from '../../src/runtime/codegen/ta-classes';
import { getPlot, runCompatScript } from './fixtures';

// Native v2 coverage-ta-2: TSI(5,14) first publishes at bar18 (bar23
// after five leading missing sources); source holes40/41 suppress40..42.
// Hand-built increasing prices give momentum/absolute-momentum ratio1.
// No capture CSV data is used by this test. Zero momentum is outside its claim.
const bars = Array.from({ length: 46 }, (_, i) => ({
  time: 1700000000000 + i * 60000,
  open: 100 + i,
  high: 101 + i,
  low: 99 + i,
  close: 100 + i,
  volume: 1,
}));
const cases = [
  { name: 'clean', first: 18, missing: (_i: number) => false, source: 'close' },
  { name: 'leading missing', first: 23, missing: (i: number) => i < 5, source: 'bar_index < 5 ? na : close' },
  {
    name: 'mature consecutive holes',
    first: 18,
    missing: (i: number) => i === 40 || i === 41,
    source: 'bar_index == 40 or bar_index == 41 ? na : close',
  },
];
function assertValues(values: Array<number | null>, spec: (typeof cases)[number]) {
  values.forEach((value, i) => {
    const unavailable = i < spec.first || spec.missing(i) || (i > 0 && spec.missing(i - 1));
    if (unavailable) expect(value, `bar ${i}`).toBeNull();
    else expect(value, `bar ${i}`).toBe(1);
  });
}
describe('native-bounded TSI seed and missing-source clock', () => {
  // Changes alternate +1/-2: the long seed is -1/2 for momentum and
  // 3/2 for absolute momentum. Applying alpha2/15 for four more changes
  // and averaging the five long outputs gives this exact rational ratio.
  it.each(['direct', 'compiled'] as const)('%s pins both smoothing seeds', (form) => {
    const alternating = bars.slice(0, 19).map((bar, i) => {
      const close = 100 - Math.floor(i / 2) + (i % 2);
      return { ...bar, open: close, high: close + 1, low: close - 1, close };
    });
    const values =
      form === 'direct'
        ? (() => {
            const tsi = new TSI(5, 14);
            return alternating.map((bar) => tsi.compute(bar.close));
          })()
        : getPlot(
            runCompatScript('//@version=6\nindicator("TSI seed values")\nplot(ta.tsi(close,5,14),title="TSI")', {
              bars: alternating,
            }),
            'TSI',
          ).values;
    expect(values.at(-1)).toBeCloseTo(-222393 / 749131, 14);
  });

  it.each(cases)('direct $name', (spec) => {
    const tsi = new TSI(5, 14);
    const values = bars.map((bar, i) => {
      const value = tsi.compute(spec.missing(i) ? NaN : bar.close);
      return Number.isNaN(value) ? null : value;
    });
    assertValues(values, spec);
  });
  it.each(cases)('compiled $name', (spec) => {
    const result = runCompatScript(
      `//@version=6
indicator("TSI native startup")
source = ${spec.source}
plot(ta.tsi(source,5,14),title="TSI")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    assertValues(getPlot(result, 'TSI').values, spec);
  });
});
