import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

// Authority: https://www.tradingview.com/pine-script-reference/v6/, fun_str.repeat.
// Native: oracle-probes/v3/captures/v3/evidence/bounds-06-str-repeat-repeat--1-attempt1-error.png.
describe('native negative str.repeat count', () => {
  it('accepts the script but raises a runtime error for repeat=-1', () => {
    const source = '//@version=6\nindicator("V3-BOUNDS-06", max_bars_back=256)\nplot(str.length(str.repeat("x", input.int(-1))), "OUTCOME")';
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 1) });
    expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'runtime.error', message: expect.stringMatching(/Invalid value.*repeat.*-1.*must be >= 0/) })]));
  });
});
