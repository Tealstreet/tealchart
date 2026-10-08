import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('numeric array join text', () => {
  it.each([5, 6])('v%s preserves namespace and receiver formatting', (version) => {
    const text = '0.3333333333333333|-0.1428571428571428|1.25';
    const result = runCompatScript(
      `//@version=${version}
indicator("Numeric join")
values = array.from(1.0 / 3.0, -1.0 / 7.0, 1.25)
label.new(bar_index, high, text=array.join(values, "|"))
label.new(bar_index, low, text=values.join("|"))
control = array.from(1.25, 2.5)
plot(control.join("|") == "1.25|2.5" ? 1 : 0, "Control")`,
      {
        bars: compatibilityBars.slice(0, 1),
      },
    );
    expect(result.errors).toEqual([]);
    expect(result.drawings.filter((drawing) => drawing.type === 'label').map((drawing) => drawing.text)).toEqual([
      text,
      text,
    ]);
    expect(getPlot(result, 'Control').values).toEqual([1]);
  });
});
