import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json, fun_str.tostring.
// Native CF029: oracle-probes/v2/captures/v2/conflicts-batch-1-v1.csv (bar0) and evidence/conflicts-batch-1-v1-attempt1-logs.txt.
describe('native CF029: mintick trailing zeros', () => {
  it('formats one as 1.00 at the captured host mintick0.01', () => {
    const result = runCompatScript(`//@version=6
indicator("Native mintick zeros")
v = 100.0 * syminfo.mintick
s = str.tostring(v, format.mintick)
plain = str.tostring(v)
plot(v, "CF029_value")
plot(str.length(s), "CF029_tick_text_length")
plot(str.length(plain), "CF029_plain_text_length")
plot(s == plain ? 1 : 0, "CF029_equals_plain")
label.new(bar_index, high, s)`, { bars: compatibilityBars.slice(0, 1), engineOptions: { runtime: { syminfo: { mintick: 0.01 } } } });
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    for (const [title, value] of Object.entries({ CF029_value: 1, CF029_tick_text_length: 4, CF029_plain_text_length: 1, CF029_equals_plain: 0 })) {
      expect.soft(getPlot(result, title).values).toEqual([value]);
    }
    expect.soft(result.drawings.filter((drawing) => drawing.type === 'label').map((drawing) => drawing.text)).toEqual(['1.00']);
  });
});
