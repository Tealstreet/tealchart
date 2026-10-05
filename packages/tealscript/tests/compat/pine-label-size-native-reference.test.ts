import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

// Native v3 bounds-10-label-set-size-text-size--1, RE10001, bar 0.
// Evidence: oracle-probes/v3/captures/v3/evidence/bounds-10-label-set-size-text-size--1-attempt1-error.png.
describe('native label size lower bound', () => {
  for (const method of [false, true]) {
    for (const errorBar of [0, 1]) {
      it(`${method ? 'method' : 'namespace'} rejects a negative size on bar ${errorBar}`, () => {
        const call = method ? 'l.set_size(-1)' : 'label.set_size(l, -1)';
        const result = runCompatScript(
          `//@version=6
indicator("V3-BOUNDS-10", max_bars_back=256)
var l=label.new(bar_index,close)
if bar_index == ${errorBar}
    ${call}
plot(close, "OUTCOME")`,
          { bars: compatibilityBars.slice(0, 3) },
        );
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toMatchObject({
          code: 'runtime.error',
          message: `Error on bar ${errorBar}: Invalid value of the 'size' argument (-1) in the 'label.set_size' function. It must be >= 0.`,
        });
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        expect(result.plots.flatMap((plot) => plot.values)).toEqual(
          errorBar === 0 ? [] : [compatibilityBars[0]!.close],
        );
        expect(result.drawings![0]).toMatchObject({ type: 'label', size: 'normal' });
      });
    }
    for (const size of [0, 19]) {
      it(`${method ? 'method' : 'namespace'} retains nonnegative size ${size}`, () => {
        const call = method ? `l.set_size(${size})` : `label.set_size(l, ${size})`;
        const result = runCompatScript(
          `//@version=6
indicator("Size lower bound control")
l=label.new(bar_index,close)
${call}
plot(close, "OUTCOME")`,
          { bars: compatibilityBars.slice(0, 1) },
        );
        expect(result.errors).toEqual([]);
        expect(result.plots[0]!.values).toEqual([compatibilityBars[0]!.close]);
        expect(result.drawings![0]).toMatchObject({ type: 'label', size: String(size) });
      });
    }
  }
});
