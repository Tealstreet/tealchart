import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('ASCII string matrix sorting keeps distinct row payloads', () => {
  const keys = ['B', 'Az', 'A', 'a', 'Z'];
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const descending of [false, true]) {
    it(`v${version} receiver=${receiver} descending=${descending}`, () => {
      const order = descending ? [3, 4, 0, 1, 2] : [2, 1, 0, 4, 3];
      const result = runCompatScript(`//@version=${version}
indicator("String matrix row payload")
m = matrix.new<string>(5, 2, "")
${keys.map((v, i) => `m.set(${i}, 0, "${v}")\nm.set(${i}, 1, "row${i}")`).join('\n')}
${receiver ? `m.sort(0, order.${descending ? 'descending' : 'ascending'})` : `matrix.sort(m, 0, order.${descending ? 'descending' : 'ascending'})`}
${order.map((v, i) => `plot(m.get(${i}, 0) == "${keys[v]}" ? 1 : 0, "Key${i}")\nplot(m.get(${i}, 1) == "row${v}" ? 1 : 0, "Payload${i}")`).join('\n')}
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (let i = 0; i < 5; i++) for (const prefix of ['Key', 'Payload']) expect(getPlot(result, `${prefix}${i}`).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Rows').values).toEqual([5, 5, 5]);
      expect(getPlot(result, 'Columns').values).toEqual([2, 2, 2]);
    });
  }
});
