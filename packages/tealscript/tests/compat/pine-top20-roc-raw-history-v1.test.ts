import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Official v6 reference entry668: 100 * change(src,length) / src[length].
// A missing sample occupies its physical lag; float lengths violate series-int.
describe('TOP20 job 13 ROC physical history and integer length', () => {
  it.each(['2'])('uses raw endpoints for length %s', (length) => {
    const result = runCompatScript(
      `//@version=6
indicator("Documented ROC")
src = switch bar_index
    0 => 10.0
    1 => 20.0
    2 => float(na)
    3 => 40.0
    4 => 50.0
    => 60.0
length = ${length}
plot(ta.roc(src, length), "ROC")
plot(100 * ta.change(src, length) / src[length], "REFERENCE")`,
      { bars: compatibilityBars.slice(0, 6) },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'ROC').values).toEqual(getPlot(result, 'REFERENCE').values);
    if (length === '2') expect(getPlot(result, 'ROC').values).toEqual([null, null, null, 100, null, 50]);
  });

  it.each(['ta.roc(close, 2.0)', 'ta.roc(source=close, length=2.0)'])('refuses float-kind length in %s', (call) => {
    const diagnostics = checkProgram(
      parse(`//@version=6
indicator("ROC length")
plot(${call})`),
    ).diagnostics;
    expect(
      diagnostics.some((diagnostic) => diagnostic.severity === 'error' && diagnostic.message.includes('int')),
    ).toBe(true);
  });
});
