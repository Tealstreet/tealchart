import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Type-system missing values and array history: actual prior references, not
// comparisons between drawing IDs (native drawing equality is invalid).
describe('ledger47 unavailable reference history', () => {
  it('drawing IDs are na before an earlier instance exists, rank1841', () => {
    const result = runCompatScript(
      '//@version=6\nindicator("drawing history")\nid = box.new(bar_index, high, bar_index + 1, low)\nplot(na(id[1]) ? 1 : 0, title="Missing")',
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([1, ...compatibilityBars.slice(1).map(() => 0)]);
  });
  it('UDT history is na initially, then exposes the earlier object field, rank1842', () => {
    const result = runCompatScript(
      '//@version=6\nindicator("object history")\ntype Record\n    float price\nid = Record.new(close)\npast = id[1]\nplot(na(past) ? -1 : past.price, title="Past")',
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Past').values).toEqual([-1, ...compatibilityBars.slice(0, -1).map((bar) => bar.close)]);
  });
  it('array history selects the earlier array instance, rank1843', () => {
    const result = runCompatScript(
      '//@version=6\nindicator("array history")\nvalues = array.from(close, -close)\npast = values[1]\nplot(na(past) ? -1 : array.get(past, 0), title="Past")',
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Past').values).toEqual([-1, ...compatibilityBars.slice(0, -1).map((bar) => bar.close)]);
  });
});
