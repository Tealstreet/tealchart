import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: https://www.tradingview.com/pine-script-reference/v6/, fun_str.tostring.
// Native CF024: oracle-probes/v2/captures/v2/conflicts-batch-1-v1.csv (bar0) and evidence/conflicts-batch-1-v1-attempt1-logs.txt.
describe('native CF024: omitted numeric tostring format', () => {
  it('matches ten optional fractional places and preserves the captured exact text', () => {
    const result = runCompatScript(`//@version=6
indicator("Native tostring default")
s = str.tostring(1.1234567890123)
ten = str.tostring(1.1234567890123, "#.##########")
eight = str.tostring(1.1234567890123, "#.########")
plot(str.tonumber(s), "CF024_default_number")
plot(s == ten ? 1 : 0, "CF024_equals_ten")
plot(s == eight ? 1 : 0, "CF024_equals_eight")
plot(str.length(s), "CF024_string_length")
label.new(bar_index, high, s)`, { bars: compatibilityBars.slice(0, 1) });
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    for (const [title, value] of Object.entries({ CF024_default_number: 1.123456789, CF024_equals_ten: 1, CF024_equals_eight: 0, CF024_string_length: 11 })) {
      expect.soft(getPlot(result, title).values).toEqual([value]);
    }
    expect.soft(result.drawings.filter((drawing) => drawing.type === 'label').map((drawing) => drawing.text)).toEqual(['1.123456789']);
  });
});
