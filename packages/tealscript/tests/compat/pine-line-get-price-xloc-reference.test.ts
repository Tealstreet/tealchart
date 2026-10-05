import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

describe('documented line.get_price coordinate domain', () => {
  for (const method of [false, true]) {
    it(`${method ? 'method' : 'namespace'} raises a runtime error for a time-coordinate line`, () => {
      const call = method ? 'l.get_price(0)' : 'line.get_price(l, 0)';
      const result = runCompatScript(
        `//@version=6
indicator("Price coordinate domain")
l=line.new(time, -7, time+60000, 13, xloc=xloc.bar_time)
plot(7,title="before")
plot(${call},title="unreachable")`,
        { bars: compatibilityBars.slice(0, 1) },
      );
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]).toMatchObject({
        code: 'runtime.error',
        message: "Error on bar 0: 'line.get_price' must be used with lines created using 'xloc=xloc.bar_index'.",
      });
      expect(result.plots.map((plot) => plot.title)).toEqual(['before']);
      expect(result.plots[0]!.values).toEqual([7]);
    });
  }
});
