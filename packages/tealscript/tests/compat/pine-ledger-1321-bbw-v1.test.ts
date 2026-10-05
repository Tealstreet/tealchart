import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json, functions281.
describe('ledger1347–1348 BBW missing-value contracts', () => {
  // Rank1347: calculation uses length non-NA samples; no disputed scale constant is asserted.
  it('ignores missing source slots when collecting and retaining three samples', () => {
    const source = (expression: string) => `//@version=6\nindicator("BBW samples")\nplot(ta.bbw(${expression}, 3, 2), title="Width")`;
    const sparse = runCompatScript(source('bar_index % 2 == 0 ? close : na'));
    const compact = runCompatScript(source('close'), { bars: compatibilityBars.filter((_, index) => index % 2 === 0) });
    expect(sparse.errors).toEqual([]);
    expect(compact.errors).toEqual([]);
    const denseValues = getPlot(compact, 'Width').values;
    expect(denseValues.slice(0, 2)).toEqual([null, null]);
    expect(denseValues.slice(2).every((value) => value !== null && Number.isFinite(value))).toBe(true);
    expect(getPlot(sparse, 'Width').values).toEqual(compatibilityBars.map((_, index) => denseValues[Math.floor(index / 2)]));
  });

  // Rank1348: missing SMA basis makes the band-difference/basis expression unavailable.
  it('returns NA until the basis has three nonmissing samples', () => {
    const result = runCompatScript('//@version=6\nindicator("BBW basis warmup")\nplot(na(ta.bbw(close, 3, 2)) ? 1 : 0, title="Missing")');
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([1, 1, ...compatibilityBars.slice(2).map(() => 0)]);
  });

  // Rank1348: a zero basis with nonzero band difference produces NA, not an infinite width.
  it('returns NA for a zero basis with nonzero deviation', () => {
    const result = runCompatScript('//@version=6\nindicator("BBW zero basis")\nplot(na(ta.bbw(bar_index % 3 - 1, 3, 2)) ? 1 : 0, title="Missing")');
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values.slice(2)).toEqual(compatibilityBars.slice(2).map(() => 1));
  });
});
