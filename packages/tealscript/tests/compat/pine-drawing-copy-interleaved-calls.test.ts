import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const cases = [
  { family: 'line', constructor: 'line.new(0, 13, 1, -7)', setter: 'set_x1', getter: 'get_x1' },
  { family: 'label', constructor: 'label.new(0, 13, "source")', setter: 'set_x', getter: 'get_x' },
  { family: 'box', constructor: 'box.new(0, 13, 1, -7)', setter: 'set_left', getter: 'get_left' },
] as const;

// v6 reference line/label/box.copy creates a distinct object for each call.
describe('Drawing copy call sites keep separate per-bar invocation counts', () => {
  for (const item of cases) {
    it(`${item.family} alternates two UDF call sites without sharing or retaining prior-bar counts`, () => {
      const source = `//@version=6
indicator("Interleaved copies")
cloneA(${item.family} value) => ${item.family}.copy(value)
cloneB(${item.family} value) => value.copy()
var original = ${item.constructor}
copies = array.new<${item.family}>()
for i = 0 to 3
    first = cloneA(original)
    ${item.family}.${item.setter}(first, bar_index * 100 + i * 2)
    copies.push(first)
    second = cloneB(original)
    second.${item.setter}(bar_index * 100 + i * 2 + 1)
    copies.push(second)
float total = 0
for i = 0 to 7
    total += ${item.family}.${item.getter}(copies.get(i))
plot(total, "coordinates")
plot(array.size(${item.family}.all), "count")`;
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'coordinates').values).toEqual([28, 828, 1628]);
      expect(getPlot(result, 'count').values).toEqual([9, 17, 25]);
      const drawings = result.drawings.filter((drawing) => drawing.type === item.family);
      expect(drawings).toHaveLength(25);
      expect(new Set(drawings.map((drawing) => drawing.id)).size).toBe(25);
      const copies = drawings.slice(1);
      for (let barIndex = 0; barIndex < 3; barIndex++) {
        const ids = copies.slice(barIndex * 8, (barIndex + 1) * 8).map((drawing) => drawing.id);
        expect(ids.filter((id) => id.includes(':copy:'))).toHaveLength(6);
      }
    });
  }
});
