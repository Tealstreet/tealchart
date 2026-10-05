import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';
import { workerPlots } from './ledgerGaps24Worker';

// Variable declarations / varip and user-defined functions / scope-of-a-function-call.
// Primitive local counters certify written-call storage; special-type admission is outside this proof.
describe('primitive varip function scope reference', () => {
  it('keeps historical counters independent at two written calls', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Function varip histories")
count(int step) =>
    varip int counter = 0
    counter += step
    counter
plot(count(1), "first")
plot(count(10), "second")`,
      { bars: compatibilityBars.slice(0, 6) },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'first').values).toEqual([1, 2, 3, 4, 5, 6]);
    expect(getPlot(result, 'second').values).toEqual([10, 20, 30, 40, 50, 60]);
  });

  it('retains function block state from its first execution across ticks and skipped executions', async () => {
    const values = await workerPlots(`count(bool enabled) =>
    int value = -1
    if enabled
        varip int counter = 0
        counter += 1
        value := counter
    value
plot(count(close <= 9), "conditional")
plot(count(true), "always")`);
    expect(values('conditional')).toEqual([-1, -1, 1, 2, -1, 3]);
    expect(values('always')).toEqual([1, 2, 3, 4, 5, 6]);
  }, 30_000);
});
