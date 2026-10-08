import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: https://www.tradingview.com/pine-script-reference/v6/, fun_str.match.
// Native CF030: oracle-probes/v2/captures/v2/conflicts-batch-25-v1.csv, bar0.
describe('native CF030: regex inline flags', () => {
  it('treats m as multiline anchors and s as dotall on the captured newline witness', () => {
    const result = runCompatScript(`//@version=6
indicator("Native regex flags")
m = str.match("A\\nB", "(?m).+")
s = str.match("A\\nB", "(?s).+")
plot(str.length(m), "CF030_m_length")
plot(str.length(s), "CF030_s_length")
plot(m == "A\\nB" ? 1 : 0, "CF030_m_whole")
plot(s == "A\\nB" ? 1 : 0, "CF030_s_whole")
label.new(bar_index, high, m + "|" + s)`, { bars: compatibilityBars.slice(0, 1) });
    expect.soft(result.errors).toEqual([]);
    expect.soft(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    for (const [title, value] of Object.entries({ CF030_m_length: 1, CF030_s_length: 3, CF030_m_whole: 0, CF030_s_whole: 1 })) {
      expect.soft(getPlot(result, title).values).toEqual([value]);
    }
    expect.soft(result.drawings.filter((drawing) => drawing.type === 'label').map((drawing) => drawing.text)).toEqual(['A|A\nB']);
  });
});
