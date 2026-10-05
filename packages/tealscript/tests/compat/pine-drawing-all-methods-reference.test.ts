import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const run = (body: string) =>
  runCompatScript(`//@version=6\nindicator("Drawing collections")\n${body}`, { bars: compatibilityBars.slice(0, 1) });

describe('Drawing all arrays expose array receiver methods', () => {
  for (const [family, create] of [
    ['line', 'line.new(4,13,1,-7)'],
    ['label', 'label.new(4,13,"keep")'],
    ['box', 'box.new(4,13,1,-7)'],
    ['table', 'table.new(position.top_left,1,1)'],
    ['polyline', 'polyline.new(array.from(chart.point.from_index(4,13),chart.point.from_index(1,-7)))'],
    ['linefill', 'linefill.new(line.new(4,13,1,-7),line.new(4,19,1,-23),color.red)'],
  ] as const) {
    it(`${family}.all size/get/indexof preserve collection membership`, () => {
      const result = run(
        `a=${create}\nb=${family === 'table' ? create.replace('position.top_left', 'position.bottom_left') : create}\nplot(${family}.all.size(),title="count")\nplot(${family}.all.indexof(b),title="index")\nplot(array.indexof(array.from(a),${family}.all.get(0)),title="first")`,
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'count').values).toEqual([2]);
      expect(getPlot(result, 'index').values).toEqual([1]);
      expect(getPlot(result, 'first').values).toEqual([0]);
    });
    it(`${family}.all copy is mutable without deleting drawings`, () => {
      const result = run(
        `a=${create}\nb=${family === 'table' ? create.replace('position.top_left', 'position.bottom_left') : create}\ncopied=${family}.all.copy()\ncopied.clear()\nplot(copied.size(),title="copied")\nplot(array.size(${family}.all),title="original")`,
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'copied').values).toEqual([0]);
      expect(getPlot(result, 'original').values).toEqual([2]);
      expect(result.drawings?.filter((d) => d.type === family)).toHaveLength(2);
    });
    it(`${family}.all clear refuses mutation visibly`, () => {
      const result = run(`a=${create}\n${family}.all.clear()`);
      expect(result.errors.map((error) => error.message).join(' ')).toMatch(/read.only/i);
      expect(result.drawings?.filter((d) => d.type === family)).toHaveLength(1);
    });
  }
});
