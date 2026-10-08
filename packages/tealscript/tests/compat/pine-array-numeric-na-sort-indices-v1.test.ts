import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('numeric sort indices place a missing slot without changing source', () => {
  for (const receiver of [false, true]) for (const descending of [false, true]) {
    it(`receiver=${receiver} descending=${descending}`, () => {
      const order = descending ? 'order.descending' : 'order.ascending';
      const result = runCompatScript(`//@version=6
indicator("Missing numeric sort indices")
a = array.from(5.0, -3.0, float(na), 2.0)
indices = ${receiver ? `a.sort_indices(${order})` : `array.sort_indices(a, ${order})`}
${Array.from({ length: 4 }, (_, i) => `plot(array.get(indices, ${i}), "Index${i}")\nplot(array.get(a, ${i}), "Source${i}")`).join('\n')}
plot(array.size(indices), "IndexSize")
plot(array.size(a), "SourceSize")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const indices = descending ? [2, 0, 3, 1] : [1, 3, 0, 2];
      indices.forEach((value, i) => expect(getPlot(result, `Index${i}`).values).toEqual([value, value, value]));
      [5, -3, null, 2].forEach((value, i) => expect(getPlot(result, `Source${i}`).values).toEqual([value, value, value]));
      for (const title of ['IndexSize', 'SourceSize']) expect(getPlot(result, title).values).toEqual([4, 4, 4]);
    });
  }
});
