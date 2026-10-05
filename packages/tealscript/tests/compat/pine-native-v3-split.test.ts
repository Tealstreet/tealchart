import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json, fun_str.split.
// Native: ~/cs/tealstreet-next/packages/tealscript/oracle-probes/v3/captures/v3/evidence/strings-02-split-empty-separator-sizes-attempt1-logs-v1.json.
describe('native empty-separator split', () => {
  it('matches captured empty and nonempty source split sizes', () => {
    const result = runCompatScript(`//@version=6
indicator("Native split")
a = str.split("", "")
b = str.split("abc", "")
plot(array.size(a), "Empty size")
plot(array.size(b), "ABC size")
`, { bars: compatibilityBars.slice(0, 1) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Empty size').values).toEqual([1]);
    expect(getPlot(result, 'ABC size').values).toEqual([3]);
  });
});
