import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Rank359: visual-output-v1#1122; line.new copies each point's coordinates.
// https://www.tradingview.com/pine-script-reference/v6/
const modes = [
  { xloc: 'bar_index', firstX: 1, secondX: 2 },
  { xloc: 'bar_time', firstX: 1_700_000_000_000, secondX: 1_700_000_060_000 },
];

describe('line point coordinate copying', () => {
  it.each(modes)('keeps copied coordinates after point mutation with $xloc', ({ xloc, firstX, secondX }) => {
    const result = runCompatScript(
      `//@version=6
indicator("point copies")
p = chart.point.new(1700000000000, 1, 10)
q = chart.point.new(1700000060000, 2, 20)
l = line.new(p, q, xloc=xloc.${xloc})
p.index := 9
p.time := 1700000540000
p.price := 99
q.index := 10
q.time := 1700000600000
q.price := 199
plot(line.get_x1(l), "x1")
plot(line.get_x2(l), "x2")
plot(line.get_y1(l), "y1")
plot(line.get_y2(l), "y2")`,
      { bars: compatibilityBars.slice(0, 1) },
    );
    expect(result.errors).toEqual([]);
    for (const [title, expected] of [
      ['x1', firstX],
      ['x2', secondX],
      ['y1', 10],
      ['y2', 20],
    ] as const) {
      expect(getPlot(result, title).values).toEqual([expected]);
    }
    expect(result.drawings).toHaveLength(1);
    expect(result.drawings[0]).toMatchObject({ type: 'line', xloc, x1: firstX, x2: secondX, y1: 10, y2: 20 });
  });
});
