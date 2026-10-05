import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// fun_label.set_point: the label moves to the point; methods[220] accepts a series label receiver.
// Native v2 coverage-drawing-4 certifies namespace coordinates; method routing is local proof.
describe('label.set_point method reference clauses', () => {
  for (const xloc of ['bar_index', 'bar_time'] as const) {
    it(`moves only the selected label using ${xloc} point coordinates`, () => {
      const time = compatibilityBars[0].time;
      const expectedX = xloc === 'bar_index' ? 3 : time + 240_000;
      const initialX = xloc === 'bar_index' ? 1 : time;
      const result = runCompatScript(
        `//@version=6
indicator("Label method point")
id = label.new(${initialX}, 7, "keep", xloc=xloc.${xloc}, color=#123456)
other = label.new(${initialX}, 11, "other", xloc=xloc.${xloc})
point = chart.point.new(${time + 240_000}, 3, -19)
id.set_point(point=point)
plot(id.get_x(), "x")
plot(id.get_y(), "y")
plot(other.get_x(), "other x")
plot(other.get_y(), "other y")`,
        { bars: compatibilityBars.slice(0, 1) },
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'x').values).toEqual([expectedX]);
      expect(getPlot(result, 'y').values).toEqual([-19]);
      expect(getPlot(result, 'other x').values).toEqual([initialX]);
      expect(getPlot(result, 'other y').values).toEqual([11]);
      expect(result.drawings).toHaveLength(2);
      expect(result.drawings?.[0]).toMatchObject({
        type: 'label',
        x: expectedX,
        y: -19,
        text: 'keep',
        color: '#123456',
        xloc,
      });
    });
  }

  it.each(['7', 'box.new(0, 1, 1, 0)'])('refuses a non-label implicit receiver %s', (receiver) => {
    const result = checkProgram(
      parse(`//@version=6
indicator("Label method receiver")
point = chart.point.from_index(3, -19)
id = ${receiver}
id.set_point(point)`),
    );
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.severity === 'error' && diagnostic.message.includes('set_point'),
      ),
    ).toBe(true);
  });
});
