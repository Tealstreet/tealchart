import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

describe('Worklist 1479/1480: range non-na horizon', () => {
  // Both ta.range reference overloads specify length non-na observations.
  it.each(['int', 'float'])('counts finite samples for the %s overload', (kind) => {
    const result = runCompatScript(`//@version=6
indicator("Range horizon")
src = bar_index == 1 ? ${kind}(2) : bar_index == 3 ? ${kind}(6) : bar_index == 6 ? ${kind}(10) : bar_index == 8 ? ${kind}(3) : bar_index == 10 ? ${kind}(12) : ${kind}(na)
plot(ta.range(src, 3), "Result")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Result').values).toEqual([null, null, null, null, null, null, 8, 8, 7, 7, 9, 9]);
  });
});
