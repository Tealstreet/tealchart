import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Authority: oracle-probes/v3/bounds-05-ta-valuewhen-occurrence--1.pine and captures/v3/evidence/bounds-05-ta-valuewhen-occurrence--1-attempt1-error.png (RE10001, bar0).
// Reference: https://www.tradingview.com/pine-script-reference/v6/ functions[186], occurrence >=0.
const capturedSource = readFileSync(
  new URL('../../oracle-probes/v3/bounds-05-ta-valuewhen-occurrence--1.pine', import.meta.url),
  'utf8',
);
const bars = [10, 20, 30].map((close, index) => ({
  time: 1700000000000 + index * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 100,
}));

describe('native valuewhen occurrence bounds', () => {
  it('compiles the captured source then visibly refuses negative occurrence at its first execution', () => {
    expect(
      checkProgram(parse(capturedSource)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    ).toEqual([]);
    const result = runCompatScript(capturedSource, { bars });
    expect(result.errors).toEqual([
      expect.objectContaining({ message: expect.stringMatching(/occurrence.*-1.*>=\s*0/) }),
    ]);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    expect(result.profile.compiledBarErrors).toBeUndefined();
    expect(result.plots.flatMap((plot) => plot.values)).toEqual([]);
  });

  it.each([
    { occurrence: 0, expected: [10, 20, 30] },
    { occurrence: 1, expected: [null, 10, 20] },
  ])('retains occurrence=$occurrence event selection', ({ occurrence, expected }) => {
    const result = runCompatScript(
      `//@version=6\nindicator("occurrence control")\nplot(ta.valuewhen(true, close, ${occurrence}), "value")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual(expected);
  });
});
